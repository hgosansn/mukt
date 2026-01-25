import readline from 'readline';
import ModelManager from './modelManager.js';
import ApiClient from './apiClient.js';
import ToolSystem from './toolSystem.js';
import Conversation from './conversation.js';

class CLI {
    constructor(preference = 'google') {
        this.preference = preference;
        this.modelManager = new ModelManager(preference);
        this.apiClient = new ApiClient();
        this.toolSystem = new ToolSystem();
        this.conversation = new Conversation();
    }

    async promptQuestion(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer.trim().toLowerCase());
            });
        });
    }

    async confirmToolExecution(toolName, args) {
        // Always require confirmation for file manipulation tools
        const destructiveTools = ['write_file', 'create_directory', 'run_command'];
        
        if (!destructiveTools.includes(toolName)) {
            return true; // No confirmation needed for read-only tools
        }

        console.log(`\nAbout to execute tool: ${toolName}`);
        if (args) {
            console.log(`Arguments: ${JSON.stringify(args, null, 2)}`);
        }
        
        const response = await this.promptQuestion('Proceed with tool execution? (y/n or press Enter to confirm): ');
        return response === 'y' || response === 'yes' || response === '';
    }

    async initialize() {
        try {
            await this.toolSystem.loadTools();
            await this.modelManager.selectModel();
            return true;
        } catch (error) {
            console.error(`Initialization failed: ${error.message}`);
            return false;
        }
    }

    async startConversation() {
        if (process.env.DEBUG) {
            console.log(`Working Directory: ${process.cwd()}`);
            console.log('Available tools: list_files, read_file, run_command, write_file, create_directory');
        }
        console.log('Starting Mukt conversation (type "quit" or "exit" to stop)');
        console.log('────────────────────────────────────────────────────────');

        const rl = this.createReadlineInterface();
        const question = this.createQuestionFunction(rl);

        try {
            while (!rl.closed) {
                try {
                    console.log('');
                    const userPrompt = await question('You: ');

                    if (['quit', 'exit', 'stop'].includes(userPrompt.toLowerCase().trim())) {
                        console.log('Goodbye!');
                        break;
                    }

                    if (!userPrompt.trim()) break;

                    await this.handleUserInput(userPrompt);
                    console.log('────────────────────────────────────────────────────────');

                } catch (error) {
                    const shouldContinue = this.handleConversationError(error, rl);
                    if (!shouldContinue) break;
                }
            }
        } catch (error) {
            console.error(`Fatal error in conversation loop: ${error.message}`);
        } finally {
            this.cleanup(rl);
        }
    }

    createReadlineInterface() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('error', (error) => {
            console.error(`Readline error: ${error.message}`);
            this.cleanup(rl);
            process.exit(1);
        });

        rl.on('close', () => {
            console.log('\nSession ended');
        });

        return rl;
    }

    createQuestionFunction(rl) {
        return (prompt) => new Promise((resolve, reject) => {
            if (rl.closed) {
                reject(new Error('Readline interface is closed'));
                return;
            }
            rl.question(prompt, resolve);
        });
    }

    async handleUserInput(userPrompt) {
        this.conversation.addMessage('user', userPrompt);

        if (process.env.DEBUG) {
            console.log('Assistant: Thinking...');
            console.log(`Conversation has ${this.conversation.getMessageCount()} messages`);
            console.log(`Sending ${this.conversation.getByteSize()} bytes to API...`);
        }

        const initialResponse = await this.getAIResponse();
        if (!initialResponse) return;

        const { content, toolCalls } = initialResponse;
        this.conversation.addMessage('assistant', content, toolCalls);

        // Show initial AI response if any
        if (content) {
            console.log(`Assistant: ${content}`);
        }

        // Process tools iteratively if AI wants to use them
        if (toolCalls && toolCalls.length > 0) {
            await this.executeToolsIteratively(toolCalls);
        }
    }

    async getAIResponse() {
        try {
            const response = await this.apiClient.makeApiCall(
                this.modelManager.getSelectedModel(),
                this.conversation.getMessages(),
                this.toolSystem.getToolsDefinition()
            );

            const choice = response.choices?.[0];
            if (!choice) {
                console.error('Error: No response from API');
                return null;
            }

            return {
                content: choice.message?.content || '',
                toolCalls: choice.message?.tool_calls || null
            };
        } catch (error) {
            this.handleAPIError(error);
            return null;
        }
    }

    async executeToolsIteratively(toolCalls) {
        let currentToolCalls = toolCalls;
        let iterationCount = 0;
        const maxIterations = 10;

        while (currentToolCalls && currentToolCalls.length > 0 && iterationCount < maxIterations) {
            iterationCount++;
            if (process.env.DEBUG) console.log(`\n--- Tool Iteration ${iterationCount} ---`);

            const nextToolCalls = await this.executeSingleToolAndGetResponse(currentToolCalls[0]);
            currentToolCalls = nextToolCalls;
        }

        if (iterationCount >= maxIterations) {
            console.log('\nNote: Reached maximum tool iterations limit to prevent infinite loops.');
        }
    }

    async executeSingleToolAndGetResponse(toolCall) {
        const { id: toolId, function: func } = toolCall;
        const { name: functionName, arguments: functionArgs } = func;

        if (process.env.DEBUG) console.log(`Using tool: ${functionName}`);

        const args = this.parseToolArguments(functionArgs);
        
        // Get user confirmation if needed
        const confirmed = await this.confirmToolExecution(functionName, args);
        if (!confirmed) {
            const cancelMessage = `Tool execution cancelled by user: ${functionName}`;
            this.conversation.addMessage('tool', cancelMessage, null, toolId, functionName);
            console.log(cancelMessage);
            return null; // Stop tool execution
        }

        // Execute tool
        const toolOutput = await this.toolSystem.executeTool(functionName, args);
        this.conversation.addMessage('tool', toolOutput, null, toolId, functionName);

        // Get AI's analysis of the tool result
        const aiResponse = await this.getAIResponse();
        if (!aiResponse) return null;

        // Add AI's response to conversation
        this.conversation.addMessage('assistant', aiResponse.content, aiResponse.toolCalls);

        // Display AI's analysis (not raw tool output)
        if (aiResponse.content) {
            console.log(`\nAssistant: ${aiResponse.content}`);
        }

        // Return AI's new tool calls for next iteration
        return aiResponse.toolCalls;
    }

    parseToolArguments(functionArgs) {
        try {
            return typeof functionArgs === 'string' ? JSON.parse(functionArgs) : functionArgs;
        } catch (error) {
            if (process.env.DEBUG) console.log(`Warning: Could not parse tool arguments: ${error.message}`);
            return {};
        }
    }

    handleAPIError(error) {
        console.error(`API Error: ${error.message}`);
        if (error.message.includes('tool use')) {
            console.error('Note: This model does not support tool use (function calling)');
        } else if (error.message.includes('data policy')) {
            console.error('Note: This model has data policy restrictions');
        }
    }

    handleConversationError(error, rl) {
        if (error.message.includes('readline') || error.message.includes('closed')) {
            console.error('Input stream closed unexpectedly');
            return false; // Break the loop
        }
        
        console.error(`Error: ${error.message}`);
        if (error.message.includes('tool use')) {
            console.error('Note: This model does not support tool use (function calling)');
        }
        console.log('────────────────────────────────────────────────────────');
        return true; // Continue the loop
    }

    cleanup(rl) {
        if (rl && !rl.closed) {
            rl.close();
        }
    }

    async run() {
        const initialized = await this.initialize();
        if (initialized) {
            await this.startConversation();
        } else {
            process.exit(1);
        }
    }
}

export default CLI;
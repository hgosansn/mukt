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

                    // Don't exit on empty input - could be stdin closed from pipe
                    // Only exit if user explicitly wants to quit
                    if (!userPrompt.trim()) {
                        // If stdin is closed (like from a pipe), wait a bit then exit gracefully
                        if (process.stdin.destroyed || process.stdin.readableEnded) {
                            console.log('\nInput stream closed. Goodbye!');
                            break;
                        }
                        continue; // Skip empty input but don't exit
                    }

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

        // Detect if we're reading from a pipe/redirect
        const isPiped = !process.stdin.isTTY;
        
        rl.on('error', (error) => {
            console.error(`Readline error: ${error.message}`);
            this.cleanup(rl);
            process.exit(1);
        });

        rl.on('close', () => {
            if (!isPiped) {
                console.log('\nSession ended');
            }
        });

        return rl;
    }

    createQuestionFunction(rl) {
        return (prompt) => new Promise((resolve, reject) => {
            if (rl.closed) {
                reject(new Error('Readline interface is closed'));
                return;
            }
            
            // If stdin is closed/destroyed, don't try to prompt
            if (process.stdin.destroyed || process.stdin.readableEnded) {
                // For piped input, return empty to trigger exit after processing
                setTimeout(() => resolve('quit'), 100);
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
        } else if (!content) {
            console.log('Assistant: (No response received)');
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

            // Process ALL tool calls in the current batch
            await this.executeToolBatch(currentToolCalls);
            
            // Get AI's response to the tool results
            if (process.env.DEBUG) {
                console.log('Getting AI response to tool results...');
                console.log(`Conversation state: ${this.conversation.getMessageCount()} messages`);
                if (process.env.DEBUG === '2') {
                    console.log('Last few messages:', JSON.stringify(this.conversation.getMessages().slice(-3), null, 2));
                }
            }
            const aiResponse = await this.getAIResponse();
            if (!aiResponse) {
                if (process.env.DEBUG) console.log('No AI response received');
                break;
            }

            // Add AI's response to conversation
            this.conversation.addMessage('assistant', aiResponse.content, aiResponse.toolCalls);

            // Display AI's analysis
            if (aiResponse.content) {
                console.log(`Assistant: ${aiResponse.content}`);
            } else if (process.env.DEBUG) {
                console.log('AI response had no content');
            }

            // Continue with new tool calls if any
            currentToolCalls = aiResponse.toolCalls;
        }

        if (iterationCount >= maxIterations) {
            console.log('\nNote: Reached maximum tool iterations limit to prevent infinite loops.');
        }
    }

    async executeToolBatch(toolCalls) {
        for (const toolCall of toolCalls) {
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
                continue; // Skip this tool but continue with others
            }

            // Execute tool
            const toolOutput = await this.toolSystem.executeTool(functionName, args);
            this.conversation.addMessage('tool', toolOutput, null, toolId, functionName);

            if (process.env.DEBUG) console.log(`Tool ${functionName} completed`);
        }
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
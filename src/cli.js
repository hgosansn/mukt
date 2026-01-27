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

    // Tool confirmation for destructive operations
    async confirmToolExecution(toolName, args) {
        const destructiveTools = ['write_file', 'create_directory', 'run_command'];
        
        if (!destructiveTools.includes(toolName)) {
            return true; // No confirmation needed for read-only tools
        }

        console.log(`About to execute tool: ${toolName}`);
        console.log('Arguments:', JSON.stringify(args, null, 2));
        
        const response = await this.promptQuestion('Proceed with tool execution? (Enter to confirm, n to cancel): ');
        return response !== 'n' && response !== 'no';
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
        this.printStartupInfo();
        const rl = this.createReadlineInterface();
        const question = this.createQuestionFunction(rl);

        try {
            await this.handleConversationLoop(question);
        } catch (error) {
            console.error(`Fatal error in conversation loop: ${error.message}`);
        } finally {
            this.cleanup(rl);
        }
    }

    printStartupInfo() {
        if (process.env.DEBUG) {
            console.log(`Working Directory: ${process.cwd()}`);
            console.log('Available tools: list_files, read_file, run_command, write_file, create_directory');
        }
        console.log('Starting Mukt conversation (type "quit" or "exit" to stop)');
        console.log('────────────────────────────────────────────────────────');
    }

    async handleConversationLoop(question) {
        while (true) {
            try {
                const userInput = await this.getUserInput(question);
                
                if (this.shouldExitConversation(userInput)) {
                    console.log('\nGoodbye!');
                    break;
                }
                
                if (this.shouldSkipInput(userInput)) {
                    if (this.isStreamClosed()) {
                        console.log('\nInput stream closed. Goodbye!');
                        break;
                    }
                    continue;
                }

                await this.handleUserInput(userInput);
            } catch (error) {
                const shouldContinue = this.handleConversationError(error);
                if (!shouldContinue) break;
            }
        }
    }

    async getUserInput(question) {
        return await question('You: ');
    }

    shouldExitConversation(input) {
        return input === 'quit' || input === 'exit';
    }

    shouldSkipInput(input) {
        return !input.trim();
    }

    isStreamClosed() {
        return process.stdin.destroyed || process.stdin.readableEnded;
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
        // Add user message to conversation
        this.conversation.addMessage('user', userPrompt);
        
        console.log('Assistant: Thinking...');
        if (process.env.DEBUG) {
            console.log(`Conversation has ${this.conversation.getMessageCount()} messages`);
            console.log(`Sending ${this.conversation.getByteSize()} bytes to API...`);
        }

        // Get initial AI response
        const aiResponse = await this.getAIResponse();
        if (!aiResponse) return;
        
        // Process AI response and any tool calls
        await this.processAIResponse(aiResponse);
        
        console.log('────────────────────────────────────────────────────────');
    }

    async processAIResponse(aiResponse) {
        // Add AI response to conversation
        this.conversation.addMessage('assistant', aiResponse.content, aiResponse.toolCalls);
        
        // Display AI content if present
        this.displayAIContent(aiResponse.content);
        
        // Handle tool calls if any
        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
            await this.executeToolsIteratively(aiResponse.toolCalls);
        } else if (!aiResponse.content) {
            console.log('Assistant: (No response received)');
        }
    }

    displayAIContent(content) {
        if (content && content.trim()) {
            console.log(`Assistant: ${content}`);
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
            } else {
                // Show helpful message when AI doesn't provide commentary
                console.log('Assistant: [Analysis complete - see tool output above]');
                if (process.env.DEBUG) {
                    console.log('Debug: AI response had no content');
                    console.log('Debug: Response details:', JSON.stringify(aiResponse, null, 2));
                }
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
            const success = await this.executeToolCall(toolCall);
            if (!success) {
                console.log('Tool execution cancelled or failed.');
                break;
            }
        }
    }

    async executeToolCall(toolCall) {
        const { id: toolId, function: func } = toolCall;
        const { name: functionName, arguments: functionArgs } = func;

        if (process.env.DEBUG) console.log(`Using tool: ${functionName}`);

        const args = this.parseToolArguments(functionArgs);
        
        // Ask for confirmation if needed (only in interactive mode)
        if (process.stdin.isTTY) {
            const confirmed = await this.confirmToolExecution(functionName, args);
            if (!confirmed) {
                console.log(`Tool ${functionName} cancelled by user.`);
                return false;
            }
        }

        try {
            // Execute tool
            const toolOutput = await this.toolSystem.executeTool(functionName, args);
            console.log(`Tool ${functionName} output: ${toolOutput}`);
            this.conversation.addMessage('tool', toolOutput, null, toolId, functionName);

            if (process.env.DEBUG) console.log(`Tool ${functionName} completed`);
            return true;
        } catch (error) {
            console.error(`Tool ${functionName} failed: ${error.message}`);
            return false;
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
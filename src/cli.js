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

        const question = (prompt) => new Promise((resolve, reject) => {
            if (rl.closed) {
                reject(new Error('Readline interface is closed'));
                return;
            }
            rl.question(prompt, resolve);
        });

        try {
            while (!rl.closed) {
                try {
                    console.log('');
                    const userPrompt = await question('You: ');

                    if (['quit', 'exit', 'stop'].includes(userPrompt.toLowerCase().trim())) {
                        console.log('Goodbye!');
                        break;
                    }

                    if (!userPrompt.trim()) continue;

                    this.conversation.addMessage('user', userPrompt);

                    if (process.env.DEBUG) {
                        console.log('Assistant: Thinking...');
                        console.log(`Conversation has ${this.conversation.getMessageCount()} messages`);
                        console.log(`Sending ${this.conversation.getByteSize()} bytes to API...`);
                    }

                    let response;
                    
                    try {
                        response = await this.apiClient.makeApiCall(
                            this.modelManager.getSelectedModel(),
                            this.conversation.getMessages(),
                            this.toolSystem.getToolsDefinition()
                        );
                    } catch (apiError) {
                        console.error(`API Error: ${apiError.message}`);
                        if (apiError.message.includes('tool use')) {
                            console.error('Note: This model does not support tool use (function calling)');
                        } else if (apiError.message.includes('data policy')) {
                            console.error('Note: This model has data policy restrictions');
                        }
                        console.log('────────────────────────────────────────────────────────');
                        continue;
                    }

                    const choice = response.choices?.[0];
                    if (!choice) {
                        console.error('Error: No response from API');
                        continue;
                    }

                    const messageContent = choice.message?.content || '';
                    const toolCalls = choice.message?.tool_calls || null;

                    this.conversation.addMessage('assistant', messageContent, toolCalls);

                    if (messageContent) {
                        console.log(`Assistant: ${messageContent}`);
                    }

                    // Process tools in an iterative loop until model provides final response
                    let currentToolCalls = toolCalls;
                    let iterationCount = 0;
                    const maxIterations = 10; // Prevent infinite loops

                    while (currentToolCalls && currentToolCalls.length > 0 && iterationCount < maxIterations) {
                        iterationCount++;
                        if (process.env.DEBUG) console.log(`\n--- Tool Iteration ${iterationCount} ---`);
                        if (process.env.DEBUG) console.log(`Processing ${currentToolCalls.length} tool call(s)...`);

                        // Execute all tool calls in this iteration
                        for (const toolCall of currentToolCalls) {
                            const { id: toolId, function: func } = toolCall;
                            const { name: functionName, arguments: functionArgs } = func;

                            if (process.env.DEBUG) console.log(`Using tool: ${functionName}`);

                            let args;
                            try {
                                args = typeof functionArgs === 'string' ? JSON.parse(functionArgs) : functionArgs;
                            } catch (error) {
                                args = {};
                                if (process.env.DEBUG) console.log(`Warning: Could not parse tool arguments: ${error.message}`);
                            }

                            // Ask for confirmation before executing tool
                            const confirmed = await this.confirmToolExecution(functionName, args);
                            if (!confirmed) {
                                const cancelMessage = `Tool execution cancelled by user: ${functionName}`;
                                this.conversation.addMessage('tool', cancelMessage, null, toolId, functionName);
                                console.log(cancelMessage);
                                continue;
                            }

                            const toolOutput = await this.toolSystem.executeTool(functionName, args);
                            
                            this.conversation.addMessage('tool', toolOutput, null, toolId, functionName);
                            
                            console.log(toolOutput);
                        }

                        // Get model's response after tool execution
                        try {
                            const followUpResponse = await this.apiClient.makeApiCall(
                                this.modelManager.getSelectedModel(),
                                this.conversation.getMessages(),
                                this.toolSystem.getToolsDefinition()
                            );
                            
                            const followUpChoice = followUpResponse.choices?.[0];
                            if (!followUpChoice) {
                                console.error('Error: No response from API after tool execution');
                                break;
                            }

                            const followUpMessage = followUpChoice.message?.content || '';
                            const followUpToolCalls = followUpChoice.message?.tool_calls || null;

                            // Add the assistant's response to conversation
                            this.conversation.addMessage('assistant', followUpMessage, followUpToolCalls);

                            // Show any intermediate thinking/message from the assistant
                            if (followUpMessage) {
                                if (followUpToolCalls && followUpToolCalls.length > 0) {
                                    // This is an intermediate thinking message before more tools
                                    console.log(`\nAssistant (thinking): ${followUpMessage}`);
                                } else {
                                    // This is the final response
                                    console.log(`\nAssistant: ${followUpMessage}`);
                                }
                            }

                            // Prepare for next iteration or exit
                            currentToolCalls = followUpToolCalls;
                            
                        } catch (error) {
                            console.error(`Error: Follow-up API request failed: ${error.message}`);
                            if (error.message.includes('tool use')) {
                                console.error('Note: This model does not support tool use (function calling)');
                            }
                            break;
                        }
                    }

                    if (iterationCount >= maxIterations) {
                        console.log('\nNote: Reached maximum tool iterations limit to prevent infinite loops.');
                    }

                    console.log('────────────────────────────────────────────────────────');

                } catch (error) {
                    if (error.message.includes('readline') || error.message.includes('closed')) {
                        console.error('Input stream closed unexpectedly');
                        break;
                    }
                    
                    // Handle model not found errors
                    console.error(`Error: ${error.message}`);
                    if (error.message.includes('tool use')) {
                        console.error('Note: This model does not support tool use (function calling)');
                    }
                    console.log('────────────────────────────────────────────────────────');
                }
            }
        } catch (error) {
            console.error(`Fatal error in conversation loop: ${error.message}`);
        } finally {
            this.cleanup(rl);
        }
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
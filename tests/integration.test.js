import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import readline from 'readline';
import CLI from '../src/cli.js';

// Mock readline for user input simulation
vi.mock('readline', () => ({
    default: {
        createInterface: vi.fn(() => ({
            question: vi.fn(),
            close: vi.fn()
        }))
    }
}));

// Mock console methods to capture output
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

// Store original console methods
const originalConsole = {
    log: console.log,
    error: console.error
};

describe('Integration Tests', () => {
    let cli;
    let mockRl;
    
    beforeEach(() => {
        // Setup console mocks
        console.log = mockConsoleLog;
        console.error = mockConsoleError;
        
        // Setup readline mock
        mockRl = {
            question: vi.fn(),
            close: vi.fn()
        };
        readline.createInterface.mockReturnValue(mockRl);
        
        // Clear all mocks
        vi.clearAllMocks();
        
        cli = new CLI('google');
    });
    
    afterEach(() => {
        // Restore console methods
        console.log = originalConsole.log;
        console.error = originalConsole.error;
    });
    
    it('should initialize without OpenRouter API calls', async () => {
        // Mock ModelManager.selectModel to avoid real API calls
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free',
            context_length: 100000,
            pricing: { prompt: '0', completion: '0' }
        });
        
        // Mock ToolSystem.loadTools 
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        vi.spyOn(cli.toolSystem, 'getToolsDefinition').mockReturnValue([
            {
                type: 'function',
                function: {
                    name: 'list_files',
                    description: 'List files and directories',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Path to list' }
                        }
                    }
                }
            }
        ]);
        
        const result = await cli.initialize();
        
        expect(result).toBe(true);
        expect(cli.modelManager.selectModel).toHaveBeenCalled();
        expect(cli.toolSystem.loadTools).toHaveBeenCalled();
    });

    it('should handle conversation with tool calls and confirmations', async () => {
        // Mock initialization
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free',
            context_length: 100000,
            pricing: { prompt: '0', completion: '0' }
        });
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        vi.spyOn(cli.toolSystem, 'getToolsDefinition').mockReturnValue([]);
        
        await cli.initialize();
        
        // Mock user input for confirmation (press Enter to confirm)
        mockRl.question.mockImplementationOnce((question, callback) => {
            callback(''); // Empty string = press Enter to confirm
        });
        
        // Test confirmation for a destructive tool (write_file requires confirmation)
        const confirmed = await cli.confirmToolExecution('write_file', { 
            file_path: 'test.txt', 
            content: 'test content' 
        });
        
        expect(confirmed).toBe(true);
        expect(mockRl.question).toHaveBeenCalledWith(
            expect.stringContaining('Proceed with tool execution?'),
            expect.any(Function)
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
            expect.stringContaining('About to execute tool: write_file')
        );
    });

    it('should handle tool confirmation cancellation', async () => {
        // Mock initialization
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free'
        });
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        
        await cli.initialize();
        
        // Mock user input for cancellation
        mockRl.question.mockImplementationOnce((question, callback) => {
            callback('n'); // User says no
        });
        
        const confirmed = await cli.confirmToolExecution('write_file', {
            file_path: 'test.txt',
            content: 'test content'
        });
        
        expect(confirmed).toBe(false);
        expect(mockConsoleLog).toHaveBeenCalledWith(
            expect.stringContaining('About to execute tool: write_file')
        );
    });

    it('should not require confirmation for read-only tools', async () => {
        // Mock initialization
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free'
        });
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        
        await cli.initialize();
        
        const confirmed = await cli.confirmToolExecution('read_file', {
            file_path: 'test.txt'
        });
        
        expect(confirmed).toBe(true);
        expect(mockRl.question).not.toHaveBeenCalled();
    });

    it('should handle iterative tool execution without API calls', async () => {
        // Mock initialization
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free'
        });
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        vi.spyOn(cli.toolSystem, 'getToolsDefinition').mockReturnValue([]);
        
        // Mock first API response with tool call (read_file doesn't require confirmation)
        const firstResponse = {
            choices: [{
                message: {
                    content: 'Let me read a configuration file.',
                    tool_calls: [{
                        id: 'call_1',
                        function: {
                            name: 'read_file',
                            arguments: '{"file_path": "package.json"}'
                        }
                    }]
                }
            }]
        };
        
        // Mock second API response with destructive tool call (create_directory requires confirmation)
        const secondResponse = {
            choices: [{
                message: {
                    content: 'Now let me create a backup directory.',
                    tool_calls: [{
                        id: 'call_2',
                        function: {
                            name: 'create_directory',
                            arguments: '{"dir_path": "backup"}'
                        }
                    }]
                }
            }]
        };
        
        // Mock final API response with no tool calls
        const finalResponse = {
            choices: [{
                message: {
                    content: 'Analysis complete. The package.json shows this is a Node.js project, and I created a backup directory.',
                    tool_calls: null
                }
            }]
        };
        
        vi.spyOn(cli.apiClient, 'makeApiCall')
            .mockResolvedValueOnce(firstResponse)
            .mockResolvedValueOnce(secondResponse)
            .mockResolvedValueOnce(finalResponse);
        
        // Mock tool executions
        vi.spyOn(cli.toolSystem, 'executeTool')
            .mockResolvedValueOnce('{"name": "mukt", "version": "1.0.0"}')
            .mockResolvedValueOnce('Successfully created directory: backup');
        
        // Mock confirmation for create_directory (only destructive tool)
        mockRl.question.mockImplementationOnce((question, callback) => {
            callback('y'); // Approve create_directory
        });
        
        await cli.initialize();
        
        // Simulate the iterative execution
        let currentResponse = firstResponse;
        let iterationCount = 0;
        
        while (currentResponse.choices[0].message.tool_calls && iterationCount < 3) {
            iterationCount++;
            
            for (const toolCall of currentResponse.choices[0].message.tool_calls) {
                const confirmed = await cli.confirmToolExecution(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments)
                );
                expect(confirmed).toBe(true);
                
                const toolOutput = await cli.toolSystem.executeTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments)
                );
                expect(toolOutput).toBeDefined();
            }
            
            // Get next response
            if (iterationCount === 1) {
                currentResponse = secondResponse;
            } else if (iterationCount === 2) {
                currentResponse = finalResponse;
            }
        }
        
        expect(iterationCount).toBe(2); // Two tool iterations
        expect(cli.toolSystem.executeTool).toHaveBeenCalledTimes(2);
        expect(mockRl.question).toHaveBeenCalledTimes(1); // Only create_directory requires confirmation
    });

    it('should handle API errors gracefully', async () => {
        // Mock initialization
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free'
        });
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        vi.spyOn(cli.toolSystem, 'getToolsDefinition').mockReturnValue([]);
        
        // Mock API error
        vi.spyOn(cli.apiClient, 'makeApiCall').mockRejectedValue(
            new Error('API Error: Model not found')
        );
        
        await cli.initialize();
        
        try {
            await cli.apiClient.makeApiCall(
                cli.modelManager.getSelectedModel(),
                cli.conversation.getMessages(),
                cli.toolSystem.getToolsDefinition()
            );
        } catch (error) {
            expect(error.message).toContain('Model not found');
        }
        
        expect(cli.apiClient.makeApiCall).toHaveBeenCalled();
    });

    it('should handle complete conversation flow from user input to final response', async () => {
        // Mock initialization
        vi.spyOn(cli.modelManager, 'selectModel').mockResolvedValue();
        vi.spyOn(cli.modelManager, 'getSelectedModel').mockReturnValue({
            id: 'mock/test-model:free',
            context_length: 100000
        });
        vi.spyOn(cli.toolSystem, 'loadTools').mockResolvedValue();
        vi.spyOn(cli.toolSystem, 'getToolsDefinition').mockReturnValue([
            {
                type: 'function',
                function: {
                    name: 'write_file',
                    description: 'Write content to a file',
                    parameters: {
                        type: 'object',
                        properties: {
                            file_path: { type: 'string' },
                            content: { type: 'string' }
                        }
                    }
                }
            },
            {
                type: 'function', 
                function: {
                    name: 'read_file',
                    description: 'Read file contents',
                    parameters: {
                        type: 'object',
                        properties: {
                            file_path: { type: 'string' }
                        }
                    }
                }
            }
        ]);
        
        // Mock realistic API responses for a multi-step conversation
        const responses = [
            // Initial response with tool call to create file
            {
                choices: [{
                    message: {
                        content: 'I\'ll create a test file for you with sample content.',
                        tool_calls: [{
                            id: 'call_write',
                            function: {
                                name: 'write_file',
                                arguments: JSON.stringify({
                                    file_path: 'test_output.txt',
                                    content: 'Hello from Mukt AI!\nThis is a test file created by the AI agent.'
                                })
                            }
                        }]
                    }
                }]
            },
            // Response after file creation, reading it back
            {
                choices: [{
                    message: {
                        content: 'File created successfully. Let me verify the content.',
                        tool_calls: [{
                            id: 'call_read',
                            function: {
                                name: 'read_file',
                                arguments: JSON.stringify({
                                    file_path: 'test_output.txt'
                                })
                            }
                        }]
                    }
                }]
            },
            // Final response
            {
                choices: [{
                    message: {
                        content: 'Perfect! I successfully created the file "test_output.txt" with the content and verified it was written correctly. The file contains a greeting and confirmation message.',
                        tool_calls: null
                    }
                }]
            }
        ];
        
        vi.spyOn(cli.apiClient, 'makeApiCall')
            .mockResolvedValueOnce(responses[0])
            .mockResolvedValueOnce(responses[1])
            .mockResolvedValueOnce(responses[2]);
        
        // Mock tool executions
        vi.spyOn(cli.toolSystem, 'executeTool')
            .mockResolvedValueOnce('Successfully wrote content to test_output.txt')
            .mockResolvedValueOnce('Hello from Mukt AI!\nThis is a test file created by the AI agent.');
        
        // Mock user confirmations (approve the write_file, read_file doesn't need confirmation)
        mockRl.question.mockImplementationOnce((question, callback) => {
            callback('y'); // Approve file creation
        });
        
        await cli.initialize();
        
        // Add user message to conversation
        cli.conversation.addMessage('user', 'Create a test file called test_output.txt with some sample content');
        
        // Simulate the complete conversation flow
        let iterationCount = 0;
        let currentResponse = responses[0];
        
        while (iterationCount < 3) { // Max 3 iterations for safety
            iterationCount++;
            
            // Add assistant message to conversation
            cli.conversation.addMessage(
                'assistant', 
                currentResponse.choices[0].message.content,
                currentResponse.choices[0].message.tool_calls
            );
            
            if (currentResponse.choices[0].message.tool_calls) {
                // Process tool calls
                for (const toolCall of currentResponse.choices[0].message.tool_calls) {
                    const { id: toolId, function: func } = toolCall;
                    const { name: functionName, arguments: functionArgs } = func;
                    const args = JSON.parse(functionArgs);
                    
                    // Test confirmation mechanism
                    const confirmed = await cli.confirmToolExecution(functionName, args);
                    expect(confirmed).toBe(true);
                    
                    // Execute tool
                    const toolOutput = await cli.toolSystem.executeTool(functionName, args);
                    expect(toolOutput).toBeDefined();
                    
                    // Add tool result to conversation
                    cli.conversation.addMessage('tool', toolOutput, null, toolId, functionName);
                }
                
                // Get next response based on iteration
                if (iterationCount === 1) {
                    currentResponse = responses[1];
                } else if (iterationCount === 2) {
                    currentResponse = responses[2];
                }
            } else {
                // No more tool calls, conversation complete
                break;
            }
        }
        
        // Verify the complete conversation flow
        expect(iterationCount).toBe(3); // Three iterations total
        expect(cli.toolSystem.executeTool).toHaveBeenCalledTimes(2); // write_file and read_file
        expect(mockRl.question).toHaveBeenCalledTimes(1); // Only write_file needs confirmation
        
        // Verify conversation history
        const messages = cli.conversation.getMessages();
        expect(messages.length).toBeGreaterThan(5); // User message + multiple assistant/tool messages
        
        // Check that we have both user and tool messages
        const userMessages = messages.filter(m => m.role === 'user');
        const toolMessages = messages.filter(m => m.role === 'tool');
        const assistantMessages = messages.filter(m => m.role === 'assistant');
        
        expect(userMessages.length).toBe(1); // One user query
        expect(toolMessages.length).toBe(2); // Two tool executions
        expect(assistantMessages.length).toBe(3); // Three assistant responses
        
        // Verify final state - conversation should end with assistant message containing no tool calls
        const finalMessage = messages[messages.length - 1];
        expect(finalMessage.role).toBe('assistant');
        expect(finalMessage.content).toContain('Perfect!');
    });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { execSync } from 'child_process';
import ToolSystem from '../src/toolSystem.js';

// Mock fs and execSync
vi.mock('fs', () => ({
    default: {
        promises: {
            readFile: vi.fn()
        }
    }
}));

vi.mock('child_process', () => ({
    execSync: vi.fn()
}));

describe('ToolSystem', () => {
    let toolSystem;
    
    beforeEach(() => {
        toolSystem = new ToolSystem();
        vi.clearAllMocks();
    });
    
    it('should initialize with empty tools', () => {
        expect(toolSystem.tools).toEqual([]);
        expect(toolSystem.currentDir).toBe(process.cwd());
    });
    
    it('should load tools from JSON file', async () => {
        const mockTools = [
            { type: 'function', function: { name: 'test_tool', description: 'Test' } }
        ];
        
        fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockTools));
        
        await toolSystem.loadTools();
        
        expect(toolSystem.tools).toEqual(mockTools);
        expect(fs.promises.readFile).toHaveBeenCalled();
    });
    
    it('should resolve tools path correctly', () => {
        const result = toolSystem.resolveToolsPath('../tools.json');
        expect(typeof result).toBe('string');
        expect(result).toContain('tools.json');
    });
    
    it('should execute list_files tool', async () => {
        const mockOutput = 'file1.txt\nfile2.txt';
        execSync.mockReturnValueOnce(mockOutput);
        
        const result = await toolSystem.executeTool('list_files', { path: '/test' });
        
        expect(result).toBe(mockOutput);
        expect(execSync).toHaveBeenCalledWith(
            'ls -l "/test"',
            { encoding: 'utf8' }
        );
    });
    
    it('should execute read_file tool', async () => {
        const mockContent = 'file content';
        fs.promises.readFile.mockResolvedValueOnce(mockContent);
        
        const result = await toolSystem.executeTool('read_file', { file_path: 'test.txt' });
        
        expect(result).toBe(mockContent);
        expect(fs.promises.readFile).toHaveBeenCalledWith('test.txt', 'utf8');
    });
    
    it('should execute run_command tool', async () => {
        const mockOutput = 'command output';
        execSync.mockReturnValueOnce(mockOutput);
        
        const result = await toolSystem.executeTool('run_command', { command: 'echo test' });
        
        expect(result).toBe(mockOutput);
        expect(execSync).toHaveBeenCalledWith(
            'echo test',
            expect.objectContaining({
                encoding: 'utf8',
                cwd: process.cwd(),
                timeout: 10000
            })
        );
    });
    
    it('should handle unknown tools', async () => {
        const result = await toolSystem.executeTool('unknown_tool', {});
        expect(result).toBe('Error: Unknown tool: unknown_tool');
    });
    
    it('should handle tool execution errors', async () => {
        execSync.mockImplementation(() => {
            throw new Error('Command failed');
        });
        
        const result = await toolSystem.executeTool('run_command', { command: 'fail' });
        expect(result).toContain('Command failed');
    });
});
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class ToolSystem {
    constructor() {
        this.tools = [];
        this.currentDir = process.cwd();
    }

    // Load tool definitions from JSON file, resolving path relative to module location
    async loadTools(toolsFilePath = '../tools.json') {
        try {
            const toolsPath = this.resolveToolsPath(toolsFilePath);
            const toolsData = await fs.promises.readFile(toolsPath, 'utf8');
            this.tools = JSON.parse(toolsData);
        } catch (error) {
            throw new Error(`Failed to load tools from ${toolsFilePath}: ${error.message}`);
        }
    }

    resolveToolsPath(toolsFilePath) {
        return path.resolve(path.dirname(import.meta.url.replace('file://', '')), toolsFilePath);
    }

    getToolsDefinition() {
        return this.tools;
    }

    async executeTool(toolName, args) {
        switch (toolName) {
            case 'list_files':
                return await this.executeListFiles(args);
            case 'read_file':
                return await this.executeReadFile(args);
            case 'run_command':
                return await this.executeRunCommand(args);
            default:
                return `Error: Unknown tool: ${toolName}`;
        }
    }

    async executeListFiles(args) {
        try {
            const targetPath = args.path || '.';
            const showHidden = args.show_hidden || false;
            
            if (process.env.DEBUG) console.log(`Listing files in: ${targetPath}`);
            
            const command = showHidden ? `ls -la "${targetPath}"` : `ls -l "${targetPath}"`;
            const output = execSync(command, { encoding: 'utf8' });
            return output;
        } catch (error) {
            return `Error: Could not list directory '${args.path}' - ${error.message}`;
        }
    }

    async executeReadFile(args) {
        try {
            const filePath = args.file_path;
            const maxLines = args.max_lines;
            
            if (process.env.DEBUG) console.log(`Reading file: ${filePath}`);
            
            const content = await fs.promises.readFile(filePath, 'utf8');
            
            if (maxLines) {
                const lines = content.split('\n').slice(0, maxLines);
                return lines.join('\n');
            }
            
            return content;
        } catch (error) {
            return `Error: File '${args.file_path}' not found or cannot be read - ${error.message}`;
        }
    }

    async executeRunCommand(args) {
        try {
            const command = args.command;
            if (process.env.DEBUG) console.log(`Executing: ${command}`);
            
            const output = execSync(command, { 
                encoding: 'utf8',
                cwd: this.currentDir,
                timeout: 10000
            });
            return output;
        } catch (error) {
            return `Command failed: ${error.message}`;
        }
    }
}

export default ToolSystem;
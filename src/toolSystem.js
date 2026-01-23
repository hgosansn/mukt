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
            case 'write_file':
                return await this.executeWriteFile(args);
            case 'create_directory':
                return await this.executeCreateDirectory(args);
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

    async executeWriteFile(args) {
        try {
            const filePath = args.file_path;
            const content = args.content;
            const append = args.append || false;
            
            if (process.env.DEBUG) console.log(`Writing to file: ${filePath} (append: ${append})`);
            
            if (append) {
                await fs.promises.appendFile(filePath, content, 'utf8');
                return `Successfully appended content to ${filePath}`;
            } else {
                await fs.promises.writeFile(filePath, content, 'utf8');
                return `Successfully wrote content to ${filePath}`;
            }
        } catch (error) {
            return `Error: Could not write to file '${args.file_path}' - ${error.message}`;
        }
    }

    async executeCreateDirectory(args) {
        try {
            const dirPath = args.dir_path;
            const recursive = args.recursive !== false; // Default to true
            
            if (process.env.DEBUG) console.log(`Creating directory: ${dirPath} (recursive: ${recursive})`);
            
            await fs.promises.mkdir(dirPath, { recursive });
            return `Successfully created directory: ${dirPath}`;
        } catch (error) {
            if (error.code === 'EEXIST') {
                return `Directory already exists: ${args.dir_path}`;
            }
            return `Error: Could not create directory '${args.dir_path}' - ${error.message}`;
        }
    }
}

export default ToolSystem;
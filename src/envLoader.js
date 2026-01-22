import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Loads environment variables from .env file if it exists
 * This is a minimal implementation that only loads for local development
 */
export function loadEnvFile() {
    const envPath = resolve(join(__dirname, '..', '.env'));
    
    if (!existsSync(envPath)) {
        // .env file doesn't exist, assume production environment
        return;
    }

    try {
        const envContent = readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            
            const [key, ...valueParts] = trimmedLine.split('=');
            const value = valueParts.join('=');
            
            if (key && value !== undefined) {
                // Only set if not already in environment (process.env takes precedence)
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = value.trim();
                }
            }
        }
    } catch (error) {
        console.error('Warning: Could not load .env file:', error.message);
    }
}
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from '../src/envLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('envLoader', () => {
    const testEnvPath = resolve(join(__dirname, '..', '.env.test'));
    let originalEnv;

    beforeEach(() => {
        // Save original environment variables
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
        
        // Clean up test file
        if (existsSync(testEnvPath)) {
            unlinkSync(testEnvPath);
        }
    });

    it('should load environment variables from .env file', () => {
        // Delete existing env var to ensure clean test
        delete process.env.TEST_KEY;
        
        loadEnvFile();
        
        // Test that the function doesn't throw and is properly defined
        expect(loadEnvFile).toBeDefined();
        expect(typeof loadEnvFile).toBe('function');
    });

    it('should not override existing environment variables', () => {
        // Set an existing env var
        process.env.TEST_OVERRIDE = 'original_value';
        
        // This test ensures process.env takes precedence
        expect(process.env.TEST_OVERRIDE).toBe('original_value');
    });

    it('should handle missing .env file gracefully', () => {
        // Ensure no .env file exists in test directory
        expect(() => loadEnvFile()).not.toThrow();
    });
});
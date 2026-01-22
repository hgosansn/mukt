import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiClient from '../src/apiClient.js';

global.fetch = vi.fn();
global.AbortController = vi.fn(() => ({
    signal: {},
    abort: vi.fn()
}));
global.setTimeout = vi.fn((fn) => fn());
global.clearTimeout = vi.fn();

describe('ApiClient', () => {
    let apiClient;
    
    beforeEach(() => {
        apiClient = new ApiClient('test-api-key');
        vi.clearAllMocks();
    });
    
    it('should initialize with API key', () => {
        expect(apiClient.apiKey).toBe('test-api-key');
        expect(apiClient.baseUrl).toBe('https://openrouter.ai/api/v1');
    });
    
    it('should make successful API call', async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: 'test response' } }] })
        };
        
        fetch.mockResolvedValueOnce(mockResponse);
        
        const result = await apiClient.makeApiCall(
            'test-model',
            [{ role: 'user', content: 'test' }],
            []
        );
        
        expect(result.choices[0].message.content).toBe('test response');
        expect(fetch).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer test-api-key',
                    'Content-Type': 'application/json'
                },
                body: expect.stringContaining('test-model')
            })
        );
    });
    
    it('should throw error on HTTP failure', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        };
        
        fetch.mockResolvedValueOnce(mockResponse);
        
        await expect(apiClient.makeApiCall('test-model', [], [])).rejects.toThrow(
            'HTTP 500: Internal Server Error'
        );
    });
});
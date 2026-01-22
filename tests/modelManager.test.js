import { describe, it, expect, vi, beforeEach } from 'vitest';
import ModelManager from '../src/modelManager.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('ModelManager', () => {
    let modelManager;
    
    beforeEach(() => {
        modelManager = new ModelManager('google', 'test-api-key');
        vi.clearAllMocks();
    });
    
    it('should initialize with default values', () => {
        expect(modelManager.preference).toBe('google');
        expect(modelManager.apiKey).toBe('test-api-key');
        expect(modelManager.baseUrl).toBe('https://openrouter.ai/api/v1');
        expect(modelManager.selectedModel).toBeNull();
    });
    
    it('should calculate model scores based on supported parameters', () => {
        const mockModel = {
            supported_parameters: ['temperature', 'max_tokens', 'structured_outputs', 'reasoning'],
            context_length: 128000
        };
        
        const score = modelManager.calculateModelScore(mockModel);
        expect(score).toBe(35);
    });
    
    it('should calculate parameter scores correctly', () => {
        const params = ['param1', 'param2', 'param3'];
        expect(modelManager.getParameterScore(params)).toBe(3);
    });
    
    it('should calculate advanced feature scores correctly', () => {
        const params = ['structured_outputs', 'reasoning'];
        expect(modelManager.getAdvancedFeatureScore(params)).toBe(18);
    });
    
    it('should calculate context length scores correctly', () => {
        expect(modelManager.getContextLengthScore(150000)).toBe(9); // 5+3+1
        expect(modelManager.getContextLengthScore(75000)).toBe(4);  // 3+1
        expect(modelManager.getContextLengthScore(15000)).toBe(1);  // 1
        expect(modelManager.getContextLengthScore(5000)).toBe(0);   // 0
    });
    
    it('should select a free model successfully', async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({
                data: [
                    { 
                        id: 'google/gemini:free', 
                        pricing: { prompt: '0', completion: '0' },
                        supported_parameters: ['tools', 'tool_choice', 'max_tokens']
                    },
                    { 
                        id: 'mistral/7b:free', 
                        pricing: { prompt: '0', completion: '0' },
                        supported_parameters: ['tools', 'temperature']
                    }
                ]
            })
        };
        
        fetch.mockResolvedValueOnce(mockResponse);
        
        await modelManager.selectModel();
        
        expect(modelManager.selectedModel).toBe('google/gemini:free');
        expect(fetch).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/models',
            { headers: { 'Authorization': 'Bearer test-api-key' } }
        );
    });
    
    it('should throw error when no free models found', async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({
                data: [
                    { id: 'paid-model:paid', pricing: { prompt: '0.001', completion: '0.001' } }
                ]
            })
        };
        
        fetch.mockResolvedValueOnce(mockResponse);
        
        await expect(modelManager.selectModel()).rejects.toThrow(
            'No free models with tool support found on OpenRouter currently.'
        );
    });
    
    it('should return selected model', () => {
        modelManager.selectedModel = 'test-model';
        expect(modelManager.getSelectedModel()).toBe('test-model');
    });
});
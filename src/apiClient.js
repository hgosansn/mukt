import { OPENROUTER_API_KEY } from '../constants.js';

class ApiClient {
    constructor(apiKey = OPENROUTER_API_KEY) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://openrouter.ai/api/v1';
    }

    // Make API call to OpenRouter with timeout and error handling
    // Returns parsed JSON response or throws descriptive error
    async makeApiCall(model, messages, tools, timeout = 30000, retryCount = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await this.sendRequest(model, messages, tools, controller.signal);
            clearTimeout(timeoutId);
            
            await this.validateResponse(response, model);
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw this.handleApiError(error);
        }
    }

    async sendRequest(model, messages, tools, signal) {
        return await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                tools: tools,
                tool_choice: 'auto'
            }),
            signal: signal
        });
    }

    async validateResponse(response, model) {
        if (!response.ok) {
            if (response.status === 404) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `Model ${model} not found`;
                throw new Error(errorMessage);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    handleApiError(error) {
        if (error.name === 'AbortError') {
            return new Error('API request timed out');
        }
        return error;
    }
}

export default ApiClient;
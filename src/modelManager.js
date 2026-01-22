import { OPENROUTER_API_KEY } from '../constants.js';

class ModelManager {
    constructor(preference = 'google', apiKey = OPENROUTER_API_KEY) {
        this.apiKey = apiKey;
        this.preference = preference;
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.selectedModel = null;
    }

    async selectModel() {
        try {
            if (process.env.DEBUG) console.log('Fetching available models...');
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const freeModelsWithTools = data.data.filter(model => 
                model.pricing.prompt === "0" && 
                model.pricing.completion === "0" &&
                model.supported_parameters?.includes('tools')
            );

            if (freeModelsWithTools.length === 0) {
                throw new Error('No free models with tool support found on OpenRouter currently.');
            }

            if (process.env.DEBUG) console.log(`Found ${freeModelsWithTools.length} free models with tool support`);

            if (process.env.DEBUG && freeModelsWithTools.length > 0) {
                console.log('\nAll free models with tool support:');
                freeModelsWithTools.forEach((model, i) => {
                    const dataPolicy = this.getDataPolicyDescription(model);
                    const contextLength = model.context_length ? `${Math.floor(model.context_length/1000)}k` : 'unknown';
                    const topProvider = model.top_provider?.name ? ` (${model.top_provider.name})` : '';
                    console.log(`${i+1}. ${model.id}${topProvider} (context: ${contextLength}${dataPolicy ? ', flags: ' + dataPolicy : ''})`);
                });
                console.log('');
            }

            this.showDetailedModelInfo(freeModelsWithTools);

            // Score models based on supported parameters to predict reliability
            const scoredModels = freeModelsWithTools.map(model => ({
                ...model,
                score: this.calculateModelScore(model)
            })).sort((a, b) => b.score - a.score);

            if (process.env.DEBUG) {
                console.log('Top 5 scored models:');
                scoredModels.slice(0, 5).forEach((model, i) => {
                    const policy = model.per_request_limits ? 'Limited' : (model.pricing?.prompt === "0" ? 'Free' : 'Paid');
                    const dataPolicy = this.getDataPolicyDescription(model);
                    console.log(`${i+1}. ${model.id} (score: ${model.score}, policy: ${policy}${dataPolicy ? ', data: ' + dataPolicy : ''})`);
                });
            }

            // Select the highest scored model
            this.selectedModel = scoredModels[0]?.id;

            if (process.env.DEBUG) console.log(`Selected model: ${this.selectedModel}`);
            return this.selectedModel;
        } catch (error) {
            throw new Error(`Failed to fetch models: ${error.message}`);
        }
    }

    // Calculate reliability score based on supported parameters and model characteristics
    // Higher scores indicate more mature models with better API compatibility
    calculateModelScore(model) {
        const params = model.supported_parameters || [];
        
        return this.getParameterScore(params) + 
               this.getAdvancedFeatureScore(params) +
               this.getStandardApiScore(params) +
               this.getContextLengthScore(model.context_length);
    }

    getParameterScore(params) {
        return params.length;
    }

    getAdvancedFeatureScore(params) {
        let score = 0;
        if (params.includes('structured_outputs')) score += 10;
        if (params.includes('reasoning')) score += 8;
        if (params.includes('response_format')) score += 6;
        if (params.includes('seed')) score += 4;
        if (params.includes('logprobs')) score += 3;
        return score;
    }

    getStandardApiScore(params) {
        let score = 0;
        if (params.includes('temperature')) score += 2;
        if (params.includes('max_tokens')) score += 2;
        if (params.includes('top_p')) score += 2;
        if (params.includes('frequency_penalty')) score += 1;
        if (params.includes('presence_penalty')) score += 1;
        return score;
    }

    getContextLengthScore(contextLength) {
        let score = 0;
        if (contextLength > 100000) score += 5;
        if (contextLength > 50000) score += 3;
        if (contextLength > 10000) score += 1;
        return score;
    }

    // Extract human-readable data policy description from model metadata
    getDataPolicyDescription(model) {
        const policies = [];
        
        if (model.pricing?.prompt !== "0" || model.pricing?.completion !== "0") {
            policies.push('paid-only');
        }
        
        if (model.per_request_limits) {
            policies.push('rate-limited');
        }
        
        if (model.top_provider?.is_moderated) {
            policies.push('moderated');
        }
        
        if (model.architecture?.modality && !model.architecture.modality.includes('text')) {
            policies.push('multimodal');
        }
        
        return policies.length > 0 ? policies.join(', ') : null;
    }

    // Display detailed model information for debugging (use DEBUG=2 for verbose output)
    showDetailedModelInfo(models) {
        if (process.env.DEBUG === '2' && models.length > 0) {
            console.log('\nDetailed model information:');
            models.slice(0, 3).forEach((model, i) => {
                console.log(`\n${i+1}. ${model.id}:`);
                console.log(`   Context Length: ${model.context_length}`);
                console.log(`   Pricing: prompt=${model.pricing?.prompt}, completion=${model.pricing?.completion}`);
                console.log(`   Top Provider: ${model.top_provider?.name || 'N/A'}`);
                console.log(`   Supported Parameters: ${(model.supported_parameters || []).join(', ')}`);
                if (model.per_request_limits) {
                    console.log(`   Request Limits: ${JSON.stringify(model.per_request_limits)}`);
                }
                if (model.architecture) {
                    console.log(`   Architecture: ${JSON.stringify(model.architecture)}`);
                }
            });
            console.log('');
        }
    }

    getSelectedModel() {
        return this.selectedModel;
    }
}

export default ModelManager;
/**
 * AI API Configuration Service
 * Manages API provider configuration, validation, and priority ordering
 */

/**
 * Get API configuration - returns ordered list of providers to try
 * @param {object} globalState - The global state object
 * @returns {Array} Array of provider configs in priority order
 */
export function getApiConfig(globalState) {
    const providerList = [];

    // Check localStorage first (legacy support)
    const apiKey = localStorage.getItem('api_key');
    const apiType = localStorage.getItem('api_type') || 'claude';

    console.log('ai-api-service getApiConfig - localStorage API Key exists:', !!apiKey);
    console.log('ai-api-service getApiConfig - localStorage API Type:', apiType);

    if (apiKey && apiKey.trim().length > 0) {
        console.log('ai-api-service getApiConfig - Using localStorage config');
        const provider = apiType === 'chatgpt' ? 'openai' : apiType;
        const defaultModels = {
            claude: 'claude-3-5-sonnet-20241022',
            openai: 'gpt-4o',
            browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC'
        };

        // Try to get route from settings if available, fallback to 'auto'
        let route = 'auto';
        const settings = globalState?.settings;
        if (settings && settings.apiProviders && settings.apiProviders[provider]) {
            route = settings.apiProviders[provider].route || 'auto';
        }

        providerList.push({
            provider,
            apiKey: apiKey.trim(),
            model: defaultModels[provider] || 'gpt-4o',
            route: route
        });
        console.log(`ai-api-service getApiConfig - Using route: ${route} for ${provider}`);
    }

    // Check newer settings structure
    const settings = globalState?.settings;
    if (settings && settings.apiProviders) {
        const providers = settings.apiProviders;
        const providerPriority = settings.preferences?.providerPriority || ['claude', 'openai', 'browser'];

        console.log('ai-api-service getApiConfig - Provider priority:', providerPriority);
        console.log('ai-api-service getApiConfig - Providers:', providers);

        // Build provider list in priority order
        for (const providerName of providerPriority) {
            const config = providers[providerName];

            // Skip if not configured, not enabled, or missing API key (browser provider doesn't need key)
            if (!config || !config.enabled) continue;
            if (providerName !== 'browser' && (!config.apiKey || config.apiKey.trim().length === 0)) continue;

            // Don't add duplicate if already in list from localStorage
            if (providerList.some(p => p.provider === providerName)) continue;

            const defaultModels = {
                claude: 'claude-3-5-sonnet-20241022',
                openai: 'gpt-4o',
                browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC'
            };

            const providerConfig = {
                provider: providerName,
                apiKey: config.apiKey ? config.apiKey.trim() : '',
                model: config.model || defaultModels[providerName] || 'gpt-4o',
                route: config.route || 'auto'
            };
            providerList.push(providerConfig);

            console.log(`ai-api-service getApiConfig - Added provider to list: ${providerName}, route: ${providerConfig.route}, model: ${providerConfig.model}`);
        }

        // Fallback: add any remaining enabled providers not in priority list
        for (const [providerName, config] of Object.entries(providers)) {
            if (!config || !config.enabled) continue;
            if (providerName !== 'browser' && (!config.apiKey || config.apiKey.trim().length === 0)) continue;
            if (providerList.some(p => p.provider === providerName)) continue;

            const defaultModels = {
                claude: 'claude-3-5-sonnet-20241022',
                openai: 'gpt-4o',
                browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC'
            };

            const providerConfig = {
                provider: providerName,
                apiKey: config.apiKey ? config.apiKey.trim() : '',
                model: config.model || defaultModels[providerName] || 'gpt-4o',
                route: config.route || 'auto'
            };
            providerList.push(providerConfig);

            console.log(`ai-api-service getApiConfig - Added fallback provider: ${providerName}, route: ${providerConfig.route}, model: ${providerConfig.model}`);
        }
    }

    if (providerList.length === 0) {
        console.log('ai-api-service getApiConfig - No valid API providers found');
        throw new Error('No valid API providers configured. Please set your API keys in Settings.');
    }

    console.log('ai-api-service getApiConfig - Final provider list:', providerList);
    return providerList;
}

/**
 * Get single API configuration (legacy support)
 * Returns the first provider from the list
 * @param {object} globalState - The global state object
 * @returns {object} Single provider configuration
 */
export function getSingleApiConfig(globalState) {
    const providerList = getApiConfig(globalState);
    if (providerList.length === 0) {
        throw new Error('No valid API providers configured');
    }
    return providerList[0];
}

/**
 * Check if valid API key is configured
 * @param {object} globalState - The global state object
 * @returns {boolean} True if at least one valid provider is configured
 */
export function hasValidApiKey(globalState) {
    try {
        getApiConfig(globalState);
        return true;
    } catch (error) {
        console.log('ai-api-service hasValidApiKey - No valid API key:', error.message);
        return false;
    }
}

/**
 * Validate provider configuration
 * @param {object} providerConfig - Provider configuration to validate
 * @returns {object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateProviderConfig(providerConfig) {
    const errors = [];

    if (!providerConfig) {
        errors.push('Provider configuration is required');
        return { valid: false, errors };
    }

    if (!providerConfig.provider) {
        errors.push('Provider name is required');
    }

    if (providerConfig.provider !== 'browser' && !providerConfig.apiKey) {
        errors.push('API key is required for non-browser providers');
    }

    if (!providerConfig.model) {
        errors.push('Model is required');
    }

    const validProviders = ['claude', 'openai', 'browser'];
    if (providerConfig.provider && !validProviders.includes(providerConfig.provider)) {
        errors.push(`Invalid provider: ${providerConfig.provider}. Must be one of: ${validProviders.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get default model for a provider
 * @param {string} providerName - Provider name
 * @returns {string} Default model for the provider
 */
export function getDefaultModel(providerName) {
    const defaultModels = {
        claude: 'claude-3-5-sonnet-20241022',
        openai: 'gpt-4o',
        browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC'
    };

    return defaultModels[providerName] || 'gpt-4o';
}

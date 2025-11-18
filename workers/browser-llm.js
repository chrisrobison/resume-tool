// Worker-side bridge for Browser LLM
// This file attempts to provide a `BrowserLLM` global in the worker context
// with an async `generate(prompt, opts)` method. Integrators are expected to
// provide a real runtime at `/vendor/web-llm/worker-llm.js` that defines
// `self.BrowserLLM` with appropriate methods. This shim provides helpful
// errors if the runtime is missing.

(function () {
    if (typeof self.BrowserLLM !== 'undefined') return;

    // Try to import MLC web-llm runtime from CDN (fast route).
    // Fallback: attempt to import a local vendor worker bridge at /vendor/web-llm/worker-llm.js
    function tryImportMLC() {
        try {
            importScripts('https://unpkg.com/@mlc-ai/web-llm@0.2.79/lib/index.js');
            if (typeof webllm !== 'undefined' || typeof CreateMLCEngine !== 'undefined') return true;
        } catch (e) {
            // ignore
        }
        try {
            importScripts('/vendor/web-llm/worker-llm.js');
            if (typeof self.BrowserLLM !== 'undefined') return true;
        } catch (e) {
            // ignore
        }
        return false;
    }

    // Internal engine cache per model id
    const engines = new Map();

    const shim = {
        async init(opts = {}) {
            // Try runtime imports (CDN first)
            const ok = tryImportMLC();
            if (!ok) {
                // If no runtime is available, leave shim in place and let callers handle errors
                return false;
            }
            return true;
        },

        async loadModel(modelId, opts = {}) {
            // If the runtime provides its own BrowserLLM API, prefer that
            if (typeof self.BrowserLLM?.loadModel === 'function' && self.BrowserLLM !== shim) {
                return await self.BrowserLLM.loadModel(modelId, opts);
            }

            // If webllm (global from mlc web-llm) is available, create an engine and cache it
            try {
                if (engines.has(modelId)) return engines.get(modelId);

                // webllm.createMLCEngine is available in non-module worker after importScripts
                if (typeof webllm !== 'undefined' && typeof webllm.createMLCEngine === 'function') {
                    const engine = await webllm.createMLCEngine(modelId);
                    engines.set(modelId, engine);
                    return engine;
                }

                // Some builds expose CreateMLCEngine
                if (typeof CreateMLCEngine === 'function') {
                    const engine = await CreateMLCEngine(modelId);
                    engines.set(modelId, engine);
                    return engine;
                }

                throw new Error('MLC web-llm runtime not found after import.');
            } catch (e) {
                throw new Error('Failed to create engine: ' + e.message);
            }
        },

        async generate(prompt, opts = {}) {
            // If the runtime provides its own API, prefer it
            if (typeof self.BrowserLLM?.generate === 'function' && self.BrowserLLM !== shim) {
                return await self.BrowserLLM.generate(prompt, opts);
            }

            // Ensure runtime is imported
            try {
                tryImportMLC();
            } catch (e) {
                // continue; error will be thrown below if runtime missing
            }

            const modelId = opts.model || opts.modelId || 'Llama-3.1-8B-Instruct-q4f32_1-MLC';

            // Ensure engine exists
            let engine = engines.get(modelId);
            if (!engine) {
                engine = await this.loadModel(modelId, opts).catch(err => {
                    throw err;
                });
            }

            if (!engine || !engine.chat || !engine.chat.completions || typeof engine.chat.completions.create !== 'function') {
                throw new Error('Engine does not expose chat.completions.create API');
            }

            // Build messages depending on input shape
            let messages = [];
            if (typeof prompt === 'string') {
                messages = [{ role: 'user', content: prompt }];
            } else if (Array.isArray(prompt)) {
                messages = prompt;
            } else if (prompt && typeof prompt === 'object' && prompt.messages) {
                messages = prompt.messages;
            } else {
                throw new Error('Invalid prompt format for BrowserLLM.generate');
            }

            // Default generation options
            const genOpts = {
                messages,
                max_tokens: opts.max_tokens || opts.maxTokens || 512,
                temperature: opts.temperature ?? 0.7
            };

            const result = await engine.chat.completions.create(genOpts);
            // Try to normalize to string
            const text = result?.choices?.[0]?.message?.content ?? result?.choices?.[0]?.text ?? result?.output_text ?? result;
            return text;
        }
    };

    self.BrowserLLM = shim;
})();

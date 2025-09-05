// Lightweight browser LLM manager
// Responsible for loading a browser LLM runtime (web-llm) and managing model caching/loading

const LLM = {
    _initialized: false,
    _models: new Map(),

    async init(options = {}) {
        if (this._initialized) return;
        this._initialized = true;

        // Try to load a local web-llm runtime if present under vendor/
        try {
            if (typeof window.WebLLM === 'undefined') {
                // Attempt to load vendor script; it's optional and may be provided by the integrator
                await this._loadScript('/vendor/web-llm/web-llm.js');
            }
        } catch (e) {
            console.warn('web-llm runtime not found at /vendor/web-llm/web-llm.js', e.message);
        }
    },

    async _loadScript(url) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = () => resolve();
            s.onerror = (err) => reject(new Error('Failed to load script: ' + url));
            document.head.appendChild(s);
        });
    },

    /**
     * Load a model from Hugging Face into the browser LLM runtime.
     * This function attempts to fetch the given model files and then instruct
     * the runtime to load them. Actual runtime API is implementation-specific.
     * @param {string} modelId - huggingface model id (e.g., 'meta-llama/Llama-2-7b-chat')
     */
    async loadModelFromHuggingFace(modelId, options = {}) {
        await this.init();
        if (typeof window.WebLLM === 'undefined') {
            throw new Error('Browser LLM runtime not available. Place runtime at /vendor/web-llm/web-llm.js');
        }

        // Simple cache key
        const key = `hf:${modelId}`;
        if (this._models.has(key)) return this._models.get(key);

    // The integrator should provide a model manifest or a specific filename to fetch
        const filename = options.filename || 'model.bin';
        const url = `https://huggingface.co/${modelId}/resolve/main/${filename}`;

        // Ask service worker to precache this URL (best-effort)
        try {
            const url = `https://huggingface.co/${modelId}/resolve/main/${filename}`;
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'precache-urls', urls: [url] });
            }
        } catch (e) {
            // ignore
        }

        // Fetch and cache via Cache API (if available)
        let blob = null;
        try {
            if ('caches' in window) {
                const cache = await caches.open('browser-llm-models');
                const cached = await cache.match(url);
                if (cached) {
                    blob = await cached.blob();
                } else {
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error(`Failed to fetch model file: ${resp.status}`);
                    await cache.put(url, resp.clone());
                    blob = await resp.blob();
                }
            } else {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`Failed to fetch model file: ${resp.status}`);
                blob = await resp.blob();
            }
        } catch (e) {
            throw new Error(`Failed to download model from Hugging Face: ${e.message}`);
        }

        // Ask runtime to load the model. The exact API depends on the runtime.
        try {
            const modelHandle = await window.WebLLM.loadModelFromBlob(blob, { id: modelId, filename });
            this._models.set(key, modelHandle);
            return modelHandle;
        } catch (e) {
            throw new Error('Failed to load model into web-llm runtime: ' + e.message);
        }
    },

    async generate(prompt, opts = {}) {
        await this.init();
        if (typeof window.WebLLM === 'undefined') {
            throw new Error('Browser LLM runtime not available. Place runtime at /vendor/web-llm/web-llm.js');
        }

        const modelId = opts.model || 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
        // If integrator provided preloaded model handles, use them; otherwise runtime decides
        if (typeof window.WebLLM.generate !== 'function') {
            throw new Error('WebLLM runtime missing generate() API');
        }

        return await window.WebLLM.generate({ prompt, model: modelId, ...opts });
    }
};

export default LLM;

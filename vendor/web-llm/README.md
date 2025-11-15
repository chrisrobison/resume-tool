Vendor web-llm runtime and model placement
=========================================

Purpose
-------
This directory is intended to hold a browser-friendly WebLLM runtime and any
worker bridge or pre-packaged model artifacts you want to ship with the app.

Recommended layout
------------------
- `vendor/web-llm/web-llm.js`        - optional main-thread runtime bridge (exposes `window.WebLLM`)
- `vendor/web-llm/worker-llm.js`     - optional worker bridge (exposes `self.BrowserLLM`) for in-worker inference
- `vendor/web-llm/<model-files>`     - model binaries (gguf/ggml/wasm) you host locally

Fast integration (CDN)
----------------------
The project uses the MLC web-llm runtime by default when the "fast route"
is selected. The worker shim (`workers/browser-llm.js`) attempts to import the
runtime from unpkg:

    https://unpkg.com/@mlc-ai/web-llm@0.2.79/lib/index.js

This is convenient for quick testing but relies on network connectivity and
the external CDN. For production/offline usage, host the runtime locally in
this directory and provide a `worker-llm.js` that exposes `self.BrowserLLM`.

Worker bridge example
---------------------
Provide a simple `worker-llm.js` that creates `self.BrowserLLM` with at least:

- `init()` - optional
- `loadModel(modelId, opts)` - optional
- `generate(prompt, opts)` - required

See the code in `workers/browser-llm.js` for the expected usage pattern. The
Ouija project uses `webllm.createMLCEngine(modelId)` and then calls
`engine.chat.completions.create({ messages })`.

Model files and licensing
------------------------
- Prefer pre-quantized GGUF/GGML builds (q4/q8) for browser inference.
- Check model license and hosting terms before serving model files publicly.
- Large models (7B+) may require multiple GB of memory; test on target
  devices and prefer smaller models for broad compatibility.

Security and privacy
--------------------
Hosting model files locally avoids external requests and potential costs, but
ensure your server is configured to serve large binary files efficiently and
with proper CORS headers if the browser will fetch them directly.

Support
-------
If you'd like, I can add a small worker-llm.js example that wraps the MLC
runtime and demonstrates how to load a bundled GGUF model and provide the
`generate()` API expected by the worker shim.


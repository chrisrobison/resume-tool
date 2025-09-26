Agents and MCP Server

- Location: `agents/`
- Purpose: Provide an MCP server that exposes job-hunting actions loaded from JSON "cards". Also prepares for using the OpenAI Agents SDK to orchestrate tasks like tailoring resumes, job matching, writing cover letters, and job discovery.

Setup

- `cd agents && npm install`
- Configure your MCP host to launch `npm start` in this folder (the server communicates over stdio).

Cards

- Put JSON files under `agents/cards/`.
- Schema (simple and JSON-friendly):
  {
    "name": "tailor_resume",
    "title": "Tailor Resume",
    "description": "Tailor resume to match a job description.",
    "model": "gpt-4o-mini",
    "input": {
      "resume": { "type": "string", "description": "Raw resume text", "required": true },
      "jobDescription": { "type": "string", "description": "Job posting text", "required": true },
      "focus": { "type": "string", "description": "Optional emphasis", "required": false }
    },
    "template": "You are an expert resume editor. Improve the resume to match the job description.\n\nResume:\n{{resume}}\n\nJob Description:\n{{jobDescription}}\n\nFocus:\n{{focus}}\n\nReturn the tailored resume as Markdown."
  }

Server Behavior

- On start, the server loads all cards and registers a tool per card.
- Calling a tool returns a JSON payload including the rendered `template` using the provided inputs. This payload is designed to be consumed by an Agent (e.g., using `@openai/agents`) which can then decide to call models or other tools.
- Tools available by default:
  - `health_check`: returns `ok`.
  - `list_cards`: returns a list of loaded card names and fields.

Notes

- `package.json` depends on `@openai/agents` for future orchestration; the MCP server does not yet invoke models directly. You can wire the rendered prompt to an Agent that uses OpenAI models and any additional MCP tools.
- Set `AGENT_CARDS_DIR` to point at an alternative cards folder if needed.


/*
 * Minimal MCP server that loads "action cards" from JSON files in ./cards
 * and exposes each as a tool. Cards can specify a simple input shape and an
 * optional prompt template. Future cards may drive richer handlers.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/transport/stdio.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Where cards live (JSON files)
const CARDS_DIR = process.env.AGENT_CARDS_DIR || path.join(__dirname, 'cards');

// Basic card schema: keep it intentionally simple and JSON-friendly
const FieldSchema = z.object({
    type: z.enum(['string', 'number', 'boolean']).default('string'),
    description: z.string().optional(),
    required: z.boolean().optional()
});

const CardSchema = z.object({
    name: z.string(),
    title: z.string().optional(),
    description: z.string().default(''),
    // Map of fieldName -> FieldSchema
    input: z.record(FieldSchema).default({}),
    // Optional prompt template. Uses {{var}} placeholders from input
    template: z.string().optional(),
    // Optional model hint for downstream agents (not used here yet)
    model: z.string().optional()
});

function loadCards(cardsDir) {
    if (!fs.existsSync(cardsDir)) return [];
    const files = fs.readdirSync(cardsDir).filter(f => f.endsWith('.json'));
    const cards = [];
    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(cardsDir, file), 'utf8');
            const json = JSON.parse(raw);
            const card = CardSchema.parse(json);
            cards.push(card);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`[agents] Failed to parse card ${file}:`, err.message);
        }
    }
    return cards;
}

function zodFromCardInput(inputSpec) {
    const shape = {};
    for (const [key, spec] of Object.entries(inputSpec)) {
        let schema;
        switch (spec.type) {
            case 'number':
                schema = z.number();
                break;
            case 'boolean':
                schema = z.boolean();
                break;
            case 'string':
            default:
                schema = z.string();
        }
        schema = schema.describe(spec.description || '');
        shape[key] = spec.required ? schema : schema.optional();
    }
    return z.object(shape);
}

function renderTemplate(tpl, params) {
    if (!tpl) return '';
    return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
        const v = params[k];
        return v === undefined || v === null ? '' : String(v);
    });
}

async function main() {
    const server = new Server(
        { name: 'job-tool-mcp', version: '0.1.0' },
        { capabilities: { tools: {} } }
    );

    // Health tool
    server.tool(
        'health_check',
        { inputSchema: z.object({}).strict() },
        async () => ({ content: [{ type: 'text', text: 'ok' }] })
    );

    const cards = loadCards(CARDS_DIR);

    // Tool to list loaded cards
    server.tool(
        'list_cards',
        { inputSchema: z.object({}).strict() },
        async () => ({
            content: [{
                type: 'text',
                text: JSON.stringify(cards.map(c => ({
                    name: c.name,
                    title: c.title || c.name,
                    description: c.description,
                    fields: Object.keys(c.input)
                })), null, 2)
            }]
        })
    );

    // Register each card as a tool
    for (const card of cards) {
        const inputSchema = zodFromCardInput(card.input);
        const toolName = card.name;
        const toolDesc = card.description || card.title || card.name;

        server.tool(
            toolName,
            { inputSchema },
            async (input) => {
                const summary = `Action: ${card.title || card.name}`;
                const prompt = renderTemplate(card.template || '', input || {});
                const payload = {
                    name: card.name,
                    description: toolDesc,
                    model: card.model || '',
                    input: input || {},
                    prompt
                };

                // For now, just return the rendered prompt and structured payload.
                // An orchestrating Agent (using @openai/agents) can consume this
                // to decide how to proceed and which tools to call next.
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(payload, null, 2) }
                    ]
                };
            }
        );

        // eslint-disable-next-line no-console
        console.error(`[agents] Registered tool: ${toolName} — ${toolDesc}`);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(err => {
    // eslint-disable-next-line no-console
    console.error('[agents] Fatal:', err);
    process.exit(1);
});


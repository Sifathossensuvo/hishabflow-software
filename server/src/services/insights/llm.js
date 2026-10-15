import { env } from '../../config/env.js';

// HOW TO CONNECT A REAL LLM
// 1. Set AI_PROVIDER=llm and LLM_API_KEY in server/.env
// 2. Send `context` (plain numbers from buildContext) to your model with an instruction like:
//    "Return a JSON array of up to 6 items: {id, type: positive|warning|alert|info, title, body}.
//     Write for a small shop owner in simple English. Use only the numbers provided."
// 3. Parse and validate the JSON, then return it. Return null on any failure and the
//    built-in rule-based insights will be used instead, so the page never breaks.
export async function generate(context) { // eslint-disable-line no-unused-vars
  if (!env.llmApiKey) return null;
  return null;
}

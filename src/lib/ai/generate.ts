import { generateText } from "ai";
import { getAgentModel } from "@/lib/agent/model";
import { callGemini } from "./gemini";

/**
 * Unified text generation helper for all AI tasks (summarize, translate, compose).
 * 1. Checks if an Agent Model is configured (Cloudflare Workers AI, OpenAI, OpenRouter, Groq, Anthropic).
 *    If configured, uses the unified Agent Model.
 * 2. If no agent provider is set or if calling it fails, seamlessly falls back to direct Gemini REST API.
 */
export async function generateAiText({
	env,
	prompt,
	systemInstruction,
}: {
	env: CloudflareEnv;
	prompt: string;
	systemInstruction?: string;
}): Promise<string> {
	// Try the unified Agent Model first (e.g. Cloudflare Workers AI Llama 3.3 70B, etc.)
	try {
		const selection = await getAgentModel(env);
		if (selection?.model) {
			const result = await generateText({
				model: selection.model,
				prompt,
				system: systemInstruction,
			});
			if (result.text?.trim()) {
				return result.text.trim();
			}
		}
	} catch (err) {
		console.warn("Unified Agent model execution error, falling back to Gemini:", err);
	}

	// Fallback to Gemini REST API
	return await callGemini(prompt, systemInstruction);
}

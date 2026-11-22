import type { AgentProviderPreset } from "./provider-types";

export const AGENT_SETTINGS_ID = "default";
export const DEFAULT_CLOUDFLARE_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const PROVIDER_BASE_URLS: Record<Exclude<AgentProviderPreset, "custom">, string> = {
	gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
	openai: "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com/v1",
	openrouter: "https://openrouter.ai/api/v1",
	groq: "https://api.groq.com/openai/v1",
};

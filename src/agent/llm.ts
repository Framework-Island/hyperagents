import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// The models supported by the LLM.
export const MODELS = {
  CLAUDE_SONNET: "anthropic/claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU: "anthropic/claude-3-haiku-20240307",
  OPENAI_GPT4O: "openai/gpt-4o",
  OPENAI_GPT4O_MINI: "openai/gpt-4o-mini",
  OPENAI_O3: "openai/o3",
  OPENAI_O3_MINI: "openai/o3-mini",
  OPENAI_O4_MINI: "openai/o4-mini",
  GEMINI_PRO: "gemini/gemini-2.5-pro",
  GEMINI_FLASH: "gemini/gemini-2.5-flash",
  OLLAMA_LLAMA3: "ollama/llama3",
} as const;

// The type of the model ID.
export type ModelId = (typeof MODELS)[keyof typeof MODELS] | (string & {});

// The configuration of the LLM.
export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Parse the model ID into a provider and model name.
 * 
 * @param model - The model ID.
 * @return {Object} The provider and model name.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function parseModelId(model: string): { provider: string; modelName: string } {
  const slashIndex = model.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(
      `Invalid model format "${model}". Expected "provider/model-name" (e.g. "openai/gpt-4o").`
    );
  }
  return {
    provider: model.slice(0, slashIndex),
    modelName: model.slice(slashIndex + 1),
  };
}

/**
 * Create a new LLM model.
 * 
 * @param config - The configuration of the LLM.
 * @return {BaseChatModel} The LLM model.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function createLLM(config: LLMConfig): BaseChatModel {
  const { provider, modelName } = parseModelId(config.model);
  const temperature = config.temperature ?? 0.0;
  const maxTokens = config.maxTokens ?? 16384;

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName,
        temperature,
        maxTokens,
      });

    case "anthropic":
      return new ChatAnthropic({
        modelName,
        temperature,
        maxTokens,
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        model: modelName,
        temperature,
        maxOutputTokens: maxTokens,
      });

    case "ollama":
      return new ChatOllama({
        baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
        model: modelName,
        temperature,
      });

    default:
      throw new Error(
        `Unsupported provider "${provider}". Supported: openai, anthropic, gemini, ollama.`
      );
  }
}

import { z } from 'zod';
import type { Settings, EnhanceRequest, HistoryEntry } from './types';

export type { Settings, EnhanceRequest, HistoryEntry };

export const SettingsSchema = z.object({
  useLocalModel: z.boolean().default(true),
  localModelName: z.string().default('Llama-3.2-1B-Instruct-q4f32_1-MLC'),
  nvidiaApiKey: z.string().default(''),
  nvidiaBaseUrl: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  geminiApiKey: z.string().default(''),
  geminiBaseUrl: z.string().url().default('https://generativelanguage.googleapis.com/v1beta/openai'),
  systemPrompt: z.string().min(10).max(5000).default(
    'You are an expert prompt engineer. Enhance the following prompt to be more detailed, specific, and effective while preserving the original intent. Return only the enhanced prompt without any explanations or formatting.'
  ),
  shortcut: z.string().default('CommandOrControl+E'),
  launchAtLogin: z.boolean().default(true),
  showLoadingOverlay: z.boolean().default(true),
});

export const EnhanceRequestSchema = z.object({
  text: z.string().min(1).max(50000),
});

export const HistorySearchSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;
export type EnhanceRequestInput = z.infer<typeof EnhanceRequestSchema>;
export type HistorySearchInput = z.infer<typeof HistorySearchSchema>;

export function validateSettings(data: unknown): Settings {
  return SettingsSchema.parse(data);
}

export function validateEnhanceRequest(data: unknown): EnhanceRequest {
  return EnhanceRequestSchema.parse(data);
}

export function validateHistorySearch(data: unknown): HistorySearchInput {
  return HistorySearchSchema.parse(data);
}
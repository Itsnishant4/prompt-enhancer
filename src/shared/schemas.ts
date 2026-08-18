import { z } from 'zod';
import type { Settings, EnhanceRequest, HistoryEntry } from './types';
import { DEFAULT_SETTINGS } from './constants';

export type { Settings, EnhanceRequest, HistoryEntry };

export const SettingsSchema = z.object({
  useLocalModel: z.boolean().default(true),
  localModelName: z.string().default('MiniCPM-V-4.6'),
  systemPrompt: z.string().min(10).max(5000).default(
    DEFAULT_SETTINGS.systemPrompt
  ),
  shortcut: z.string().default('CommandOrControl+E'),
  launchAtLogin: z.boolean().default(false),
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
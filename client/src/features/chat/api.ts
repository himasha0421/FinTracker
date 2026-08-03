import { fetchWithErrorHandling } from '@/services/apiClient';
import {
  assigneeOptions,
  categoryOptions,
  subcategoryOptionsByCategory,
} from '@/features/transactions/constants';
import type { ChatResponse } from './types';

function buildSchemaHints() {
  const subcategoriesByCategory: Record<string, string[]> = {};
  for (const [category, subs] of Object.entries(subcategoryOptionsByCategory)) {
    subcategoriesByCategory[category] = subs.map(s => s.value);
  }
  return {
    categories: categoryOptions.map(c => c.value),
    subcategoriesByCategory,
    assignees: assigneeOptions.map(a => a.value),
  };
}

export async function sendChat(formData: FormData): Promise<ChatResponse> {
  formData.append('schema_hints', JSON.stringify(buildSchemaHints()));

  return fetchWithErrorHandling<ChatResponse>('/api/chat', {
    method: 'POST',
    body: formData,
  });
}

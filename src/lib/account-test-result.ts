import type { AccountTestResult } from '@/src/types/admin';

export function extractAccountTestModels(result: AccountTestResult) {
  const models = new Set(result.events.map((event) => event.model).filter(Boolean) as string[]);

  return Array.from(models);
}

export function formatAccountTestResult(result: AccountTestResult) {
  const models = extractAccountTestModels(result);

  if (models.length > 0) {
    return `测试通过，可用模型：${models.slice(0, 8).join('、')}${models.length > 8 ? ` 等 ${models.length} 个` : ''}`;
  }

  if (result.message.trim()) {
    return `测试通过，${result.message.trim()}`;
  }

  return '测试通过';
}

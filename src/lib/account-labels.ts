import type { AccountType } from '@/src/types/admin';

export const PLATFORM_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok' },
  { value: 'sora', label: 'Sora' },
  { value: 'antigravity', label: 'Antigravity' },
  { value: 'video', label: '视频' },
];

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string; hint: string }> = [
  { value: 'apikey', label: 'API Key', hint: '填写 Base URL 和 API Key' },
  { value: 'oauth', label: 'OAuth', hint: '填写 Access Token，可选 Refresh Token' },
  { value: 'setup-token', label: 'Setup Token', hint: '填写初始化或授权 Token' },
  { value: 'upstream', label: '上游转发', hint: '填写上游地址和鉴权信息' },
  { value: 'bedrock', label: 'Bedrock', hint: '填写 AWS 区域和访问凭证' },
  { value: 'service_account', label: '服务账号', hint: '填写服务账号 JSON 或私钥配置' },
];

export function formatPlatformLabel(value?: string | null) {
  if (!value) return '未知平台';
  return PLATFORM_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function formatAccountTypeLabel(value?: string | null) {
  if (!value) return '未知类型';
  return ACCOUNT_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function formatAccountMeta(platform?: string | null, type?: string | null) {
  return `${formatPlatformLabel(platform)} · ${formatAccountTypeLabel(type)}`;
}

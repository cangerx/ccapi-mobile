import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCOUNT_TYPE_OPTIONS, PLATFORM_OPTIONS } from '@/src/lib/account-labels';
import { createAccount } from '@/src/services/admin';
import type { AccountType, CreateAccountRequest } from '@/src/types/admin';

const colors = {
  page: '#f6f7f9',
  card: '#ffffff',
  text: '#111827',
  subtext: '#6b7280',
  border: '#e5e7eb',
  inputBorder: '#d1d5db',
  primary: '#2563eb',
  dark: '#111827',
  disabled: '#9ca3af',
  errorBg: '#fef3f2',
  errorText: '#b42318',
  muted: '#f9fafb',
};

type JsonScalar = string | number | boolean | null;
type JsonRecord = Record<string, JsonScalar>;

function toNumber(raw: string) {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function toGroupIds(raw: string) {
  const values = raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return values.length > 0 ? values : undefined;
}

function parseObjectInput(raw: string, fieldLabel: string): JsonRecord | undefined {
  if (!raw.trim()) return undefined;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} 必须是 JSON 对象。`);
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  for (const [, value] of entries) {
    const valueType = typeof value;
    if (
      value !== null
      && value !== undefined
      && valueType !== 'string'
      && valueType !== 'number'
      && valueType !== 'boolean'
    ) {
      throw new Error(`${fieldLabel} 仅支持 string / number / boolean / null。`);
    }
  }

  return parsed as JsonRecord;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    switch (error.message) {
      case 'BASE_URL_REQUIRED':
        return '请先到服务器页填写服务地址。';
      case 'ADMIN_API_KEY_REQUIRED':
        return '请先到服务器页填写 Admin Key。';
      case 'INVALID_SERVER_RESPONSE':
        return '服务返回格式异常，请确认后端接口可用并检查网关日志。';
      case 'REQUEST_FAILED':
        return '请求失败，请检查服务地址、Token 和网络连通性。';
      default:
        return error.message;
    }
  }

  return '创建账号失败，请稍后重试。';
}

export default function CreateAdminAccountScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('anthropic');
  const [type, setType] = useState<AccountType>('apikey');
  const [notes, setNotes] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [extraCredentialsJson, setExtraCredentialsJson] = useState('');
  const [extraJson, setExtraJson] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [concurrency, setConcurrency] = useState('');
  const [priority, setPriority] = useState('');
  const [rateMultiplier, setRateMultiplier] = useState('');
  const [groupIds, setGroupIds] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (type === 'apikey' || type === 'upstream') return Boolean(baseUrl.trim() && apiKey.trim());
    if (type === 'bedrock' || type === 'service_account') return Boolean(extraCredentialsJson.trim());
    return Boolean(accessToken.trim());
  }, [accessToken, apiKey, baseUrl, extraCredentialsJson, name, type]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const extraCredentials = parseObjectInput(extraCredentialsJson, '额外凭证');
      const extra = parseObjectInput(extraJson, '扩展配置');
      const credentials =
        type === 'apikey' || type === 'upstream'
          ? {
              ...extraCredentials,
              base_url: baseUrl.trim(),
              api_key: apiKey.trim(),
            }
          : type === 'bedrock' || type === 'service_account'
            ? {
                ...extraCredentials,
              }
            : {
              ...extraCredentials,
              access_token: accessToken.trim(),
              refresh_token: refreshToken.trim() || undefined,
              client_id: clientId.trim() || undefined,
            };

      const payload: CreateAccountRequest = {
        name: name.trim(),
        platform,
        type,
        credentials,
        notes: notes.trim() || undefined,
        proxy_id: toNumber(proxyId),
        concurrency: toNumber(concurrency),
        priority: toNumber(priority),
        rate_multiplier: toNumber(rateMultiplier),
        group_ids: toGroupIds(groupIds),
        extra,
      };

      return createAccount(payload);
    },
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.replace('/(tabs)/accounts');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: '添加账号' }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.page }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>基础信息</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.subtext }}>先填写名称、平台和凭证，其他参数保持默认即可。</Text>

            <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 12, color: colors.subtext }}>账号名称</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="例如：openai-main"
              placeholderTextColor="#9ca3af"
              style={{
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.text,
                marginBottom: 10,
              }}
            />

            <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>平台</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {PLATFORM_OPTIONS.map((item) => {
                const active = platform === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setPlatform(item.value)}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : '#ffffff',
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>账号类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {ACCOUNT_TYPE_OPTIONS.map((item) => {
                const active = type === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setType(item.value)}
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : '#ffffff',
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ marginTop: 3, color: active ? '#dbeafe' : colors.subtext, fontSize: 10 }}>{item.hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>备注（可选）</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="例如：主线路账号"
              placeholderTextColor="#9ca3af"
              style={{
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.text,
              }}
            />
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>凭证信息</Text>
            {type === 'apikey' || type === 'upstream' ? (
              <>
                <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 12, color: colors.subtext }}>接口地址</Text>
                <TextInput
                  value={baseUrl}
                  onChangeText={setBaseUrl}
                  placeholder="https://api.example.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>API Key</Text>
                <TextInput
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-..."
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />
              </>
            ) : type === 'bedrock' || type === 'service_account' ? (
              <>
                <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: colors.subtext }}>
                  该类型需要在高级选项中填写“额外凭证 JSON”。保存前请先展开高级选项。
                </Text>
                <Pressable
                  onPress={() => setShowAdvanced(true)}
                  style={{ marginTop: 12, borderRadius: 10, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>填写凭证 JSON</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 12, color: colors.subtext }}>Access Token</Text>
                <TextInput
                  value={accessToken}
                  onChangeText={setAccessToken}
                  placeholder="access_token"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>Refresh Token（可选）</Text>
                <TextInput
                  value={refreshToken}
                  onChangeText={setRefreshToken}
                  placeholder="refresh_token"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>Client ID（可选）</Text>
                <TextInput
                  value={clientId}
                  onChangeText={setClientId}
                  placeholder="client_id"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />
              </>
            )}
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Pressable onPress={() => setShowAdvanced((value) => !value)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>高级选项</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{showAdvanced ? '收起' : '展开'}</Text>
            </Pressable>

            {showAdvanced ? (
              <>
                <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 12, color: colors.subtext }}>代理 ID</Text>
                <TextInput
                  value={proxyId}
                  onChangeText={setProxyId}
                  keyboardType="number-pad"
                  placeholder="例如：3"
                  placeholderTextColor="#9ca3af"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>并发数</Text>
                <TextInput
                  value={concurrency}
                  onChangeText={setConcurrency}
                  keyboardType="number-pad"
                  placeholder="例如：10"
                  placeholderTextColor="#9ca3af"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>优先级</Text>
                <TextInput
                  value={priority}
                  onChangeText={setPriority}
                  keyboardType="number-pad"
                  placeholder="例如：0"
                  placeholderTextColor="#9ca3af"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>倍率</Text>
                <TextInput
                  value={rateMultiplier}
                  onChangeText={setRateMultiplier}
                  keyboardType="decimal-pad"
                  placeholder="例如：1"
                  placeholderTextColor="#9ca3af"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>分组 ID（逗号分隔）</Text>
                <TextInput
                  value={groupIds}
                  onChangeText={setGroupIds}
                  placeholder="例如：1,2,5"
                  placeholderTextColor="#9ca3af"
                  style={{
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />

                <Text style={{ marginTop: 10, marginBottom: 6, fontSize: 12, color: colors.subtext }}>额外凭证 JSON（可选）</Text>
                <TextInput
                  value={extraCredentialsJson}
                  onChangeText={setExtraCredentialsJson}
                  multiline
                  textAlignVertical="top"
                  placeholder='例如：{"project_id":"abc"}'
                  placeholderTextColor="#9ca3af"
                  style={{
                    minHeight: 88,
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                    marginBottom: 10,
                  }}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>扩展配置 JSON（可选）</Text>
                <TextInput
                  value={extraJson}
                  onChangeText={setExtraJson}
                  multiline
                  textAlignVertical="top"
                  placeholder='例如：{"window_cost_limit":50}'
                  placeholderTextColor="#9ca3af"
                  style={{
                    minHeight: 88,
                    backgroundColor: colors.muted,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />
              </>
            ) : (
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.subtext }}>代理、并发、优先级、倍率、分组和 JSON 扩展配置默认隐藏。</Text>
            )}
          </View>

          {formError ? (
            <View style={{ backgroundColor: colors.errorBg, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ color: colors.errorText }}>{formError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              setFormError(null);
              createMutation.mutate();
            }}
            disabled={!canSubmit || createMutation.isPending}
            style={{
              backgroundColor: !canSubmit || createMutation.isPending ? colors.disabled : colors.dark,
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {createMutation.isPending ? '创建中...' : canSubmit ? '创建账号' : '请先填写必填项'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

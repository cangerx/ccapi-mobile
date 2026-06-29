import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChartCard } from '@/src/components/bar-chart-card';
import { LineTrendChart } from '@/src/components/line-trend-chart';
import { ACCOUNT_TYPE_OPTIONS, PLATFORM_OPTIONS, formatAccountMeta } from '@/src/lib/account-labels';
import { formatAccountTestResult } from '@/src/lib/account-test-result';
import {
  clearAccountError,
  getAccount,
  getAccountStats,
  getAccountTodayStats,
  listAccountModels,
  recoverAccountState,
  refreshAccount,
  setAccountSchedulable,
  testAccount,
  updateAccount,
} from '@/src/services/admin';
import type { AdminAccount, JsonObject, JsonValue, UpdateAccountRequest } from '@/src/types/admin';

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
  successBg: '#ecfdf3',
  successText: '#027a48',
  muted: '#f9fafb',
};

type RangeKey = '24h' | '7d' | '30d';
type JsonScalar = string | number | boolean | null | undefined;
type JsonRecord = Record<string, JsonScalar>;

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
];

function getDateRange(rangeKey: RangeKey) {
  const end = new Date();
  const start = new Date();

  if (rangeKey === '24h') {
    start.setHours(end.getHours() - 23, 0, 0, 0);
  } else if (rangeKey === '30d') {
    start.setDate(end.getDate() - 29);
  } else {
    start.setDate(end.getDate() - 6);
  }

  const toDate = (value: Date) => value.toISOString().slice(0, 10);

  return {
    start_date: toDate(start),
    end_date: toDate(end),
    granularity: rangeKey === '24h' ? ('hour' as const) : ('day' as const),
  };
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

  return '操作失败，请稍后重试。';
}

function parseNumberValue(raw: string) {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function parseGroupIds(raw: string) {
  const values = raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return values.length > 0 ? values : undefined;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (valueType === 'object') return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}

function parseFlatJsonObject(raw: string, fieldLabel: string): JsonRecord | undefined {
  if (!raw.trim()) return undefined;

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} 必须是 JSON 对象。`);
  }

  Object.entries(parsed as Record<string, unknown>).forEach(([, value]) => {
    const valueType = typeof value;
    if (value !== null && value !== undefined && valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
      throw new Error(`${fieldLabel} 仅支持 string / number / boolean / null。`);
    }
  });

  return parsed as JsonRecord;
}

function parseJsonObject(raw: string, fieldLabel: string): JsonObject | undefined {
  if (!raw.trim()) return undefined;

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} 必须是 JSON 对象。`);
  }

  if (!isJsonValue(parsed)) {
    throw new Error(`${fieldLabel} 仅支持合法 JSON 值。`);
  }

  return parsed as JsonObject;
}

function toJsonText(value?: JsonObject | null) {
  if (!value || Object.keys(value).length === 0) {
    return '';
  }

  return JSON.stringify(value, null, 2);
}

function formatMoney(value?: number | null, digits = 4) {
  return `$${Number(value ?? 0).toFixed(digits)}`;
}

function formatNumber(value?: number | null) {
  const number = Number(value ?? 0);
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return new Intl.NumberFormat('en-US').format(number);
}

function formatTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getAccountStatus(account?: AdminAccount) {
  if (!account) return '未知';
  const normalizedStatus = `${account.status ?? ''}`.toLowerCase();
  if (account.status === 'error' || account.error_message) return '异常';
  if (['inactive', 'disabled', 'paused', 'stop', 'stopped'].includes(normalizedStatus) || account.schedulable === false) return '暂停';
  return '正常';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
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
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        keyboardType={keyboardType}
        style={{
          minHeight: multiline ? 96 : undefined,
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
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 10, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
      <Text style={{ fontSize: 11, color: colors.subtext }}>{label}</Text>
      <Text style={{ marginTop: 6, fontSize: 16, fontWeight: '800', color: colors.text }}>{value}</Text>
    </View>
  );
}

function OptionChips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
      {options.map((item) => {
        const active = value === item.value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
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
            {item.hint ? <Text style={{ marginTop: 3, color: active ? '#dbeafe' : colors.subtext, fontSize: 10 }}>{item.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AccountDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = Number(params.id);
  const queryClient = useQueryClient();
  const [rangeKey, setRangeKey] = useState<RangeKey>('7d');
  const range = getDateRange(rangeKey);
  const [feedback, setFeedback] = useState('');
  const [testModels, setTestModels] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('anthropic');
  const [accountType, setAccountType] = useState('apikey');
  const [notes, setNotes] = useState('');
  const [concurrency, setConcurrency] = useState('');
  const [priority, setPriority] = useState('');
  const [rateMultiplier, setRateMultiplier] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [groupIds, setGroupIds] = useState('');
  const [extraJson, setExtraJson] = useState('');
  const [credentialsJson, setCredentialsJson] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const accountQuery = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => getAccount(accountId),
    enabled: Number.isFinite(accountId),
  });

  const todayStatsQuery = useQuery({
    queryKey: ['account-today-stats', accountId],
    queryFn: () => getAccountTodayStats(accountId),
    enabled: Number.isFinite(accountId),
  });

  const accountStatsQuery = useQuery({
    queryKey: ['account-stats', accountId, rangeKey],
    queryFn: () => getAccountStats(accountId, rangeKey === '24h' ? 1 : rangeKey === '7d' ? 7 : 30),
    enabled: Number.isFinite(accountId),
  });

  const modelsQuery = useQuery({
    queryKey: ['account-models', accountId],
    queryFn: () => listAccountModels(accountId),
    enabled: Number.isFinite(accountId),
  });

  const account = accountQuery.data;

  useEffect(() => {
    if (!account) return;

    setName(account.name || '');
    setPlatform(account.platform || 'anthropic');
    setAccountType(account.type || 'apikey');
    setNotes(account.notes || '');
    setConcurrency(account.concurrency === undefined ? '' : `${account.concurrency}`);
    setPriority(account.priority === undefined ? '' : `${account.priority}`);
    setRateMultiplier(account.rate_multiplier === undefined ? '' : `${account.rate_multiplier}`);
    setProxyId(account.proxy_id === undefined || account.proxy_id === null ? '' : `${account.proxy_id}`);
    setGroupIds((account.group_ids ?? account.groups?.map((group) => group.id) ?? []).join(','));
    setExtraJson(toJsonText(account.extra));
    setCredentialsJson('');
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error('账号名称不能为空。');
      }

      const extra = parseJsonObject(extraJson, 'extra');
      const credentials = parseFlatJsonObject(credentialsJson, 'credentials');
      const payload: UpdateAccountRequest = {
        name: name.trim(),
        platform,
        type: accountType,
        notes: notes.trim() || undefined,
        concurrency: parseNumberValue(concurrency),
        priority: parseNumberValue(priority),
        rate_multiplier: parseNumberValue(rateMultiplier),
        proxy_id: parseNumberValue(proxyId),
        group_ids: parseGroupIds(groupIds),
      };

      if (extra) payload.extra = extra;
      if (credentials) payload.credentials = credentials;

      return updateAccount(accountId, payload);
    },
    onSuccess: () => {
      setFormError(null);
      setFeedback('账号已保存。');
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-accounts'] });
    },
    onError: (error) => {
      setFeedback('');
      setFormError(getErrorMessage(error));
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const models = await listAccountModels(accountId);
      const result = await testAccount(accountId, {
        model_id: models[0]?.id || models[0]?.name || models[0]?.model,
      });
      return { models, result };
    },
    onSuccess: ({ models, result }) => {
      const modelNames = models.map((model) => model.id || model.display_name || model.name || model.model).filter(Boolean) as string[];
      setTestModels(modelNames);
      setFeedback(formatAccountTestResult(result));
    },
    onError: (error) => {
      setTestModels([]);
      setFeedback(getErrorMessage(error));
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshAccount(accountId),
    onSuccess: () => {
      setFeedback('账号刷新成功。');
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (error) => setFeedback(getErrorMessage(error)),
  });

  const recoverMutation = useMutation({
    mutationFn: () => recoverAccountState(accountId),
    onSuccess: () => {
      setFeedback('账号运行状态已恢复。');
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-accounts'] });
    },
    onError: (error) => setFeedback(getErrorMessage(error)),
  });

  const clearErrorMutation = useMutation({
    mutationFn: () => clearAccountError(accountId),
    onSuccess: () => {
      setFeedback('账号异常已清除。');
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-accounts'] });
    },
    onError: (error) => setFeedback(getErrorMessage(error)),
  });

  const schedulableMutation = useMutation({
    mutationFn: (schedulable: boolean) => setAccountSchedulable(accountId, schedulable),
    onSuccess: () => {
      setFeedback('账号调度状态已更新。');
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['monitor-accounts'] });
    },
    onError: (error) => setFeedback(getErrorMessage(error)),
  });

  const history = accountStatsQuery.data?.history ?? [];
  const trendPoints = history.map((item) => ({
    label: rangeKey === '24h' ? item.label || item.date.slice(5, 10) : item.label || item.date.slice(5, 10),
    value: item.tokens,
  }));

  const modelItems = (accountStatsQuery.data?.models ?? [])
    .slice()
    .sort((left, right) => right.total_tokens - left.total_tokens)
    .slice(0, 8)
    .map((item) => ({
      label: item.model || 'unknown',
      value: item.total_tokens,
      meta: `${formatNumber(item.requests)} 次请求 · ${formatMoney(item.cost)}`,
    }));

  const todayCost = todayStatsQuery.data?.cost ?? account?.extra?.today_cost;
  const nextSchedulable = account?.schedulable === false;
  const summary = accountStatsQuery.data?.summary;
  const availableModelNames = (testModels.length > 0 ? testModels : (modelsQuery.data ?? []).map((model) => model.id || model.display_name || model.name || model.model).filter(Boolean) as string[]);

  function submitUpdate() {
    setFormError(null);
    setFeedback('');
    setTestModels([]);
    updateMutation.mutate();
  }

  function toggleSchedulable() {
    const actionLabel = nextSchedulable ? '恢复调度' : '暂停调度';
    Alert.alert(actionLabel, `确认要${actionLabel}该账号吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        style: nextSchedulable ? 'default' : 'destructive',
        onPress: () => schedulableMutation.mutate(nextSchedulable),
      },
    ]);
  }

  const isBusy = updateMutation.isPending || testMutation.isPending || refreshMutation.isPending || schedulableMutation.isPending || recoverMutation.isPending || clearErrorMutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: account?.name || '账号详情' }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.page }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {accountQuery.isLoading ? (
            <Section title="状态">
              <Text style={{ color: colors.subtext }}>正在加载账号详情...</Text>
            </Section>
          ) : null}

          {accountQuery.error ? (
            <Section title="状态">
              <View style={{ backgroundColor: colors.errorBg, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: colors.errorText, fontWeight: '700' }}>账号信息加载失败</Text>
                <Text style={{ marginTop: 6, color: colors.errorText }}>{getErrorMessage(accountQuery.error)}</Text>
              </View>
            </Section>
          ) : null}

          {account ? (
            <>
              <Section title="账号概览">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <MetricCard label="状态" value={getAccountStatus(account)} />
                  <MetricCard label="今日请求" value={formatNumber(todayStatsQuery.data?.requests)} />
                  <MetricCard label="今日成本" value={formatMoney(typeof todayCost === 'number' ? todayCost : 0, 2)} />
                </View>
                <Text style={{ marginTop: 12, fontSize: 12, color: colors.subtext }}>
                  {formatAccountMeta(account.platform, account.type)} · 最近使用 {formatTime(account.last_used_at || account.updated_at)}
                </Text>
                {account.error_message ? <Text style={{ marginTop: 8, fontSize: 12, color: colors.errorText }}>异常信息：{account.error_message}</Text> : null}

                <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pressable
                    disabled={testMutation.isPending}
                    onPress={() => testMutation.mutate()}
                    style={{ borderRadius: 10, backgroundColor: colors.dark, paddingHorizontal: 14, paddingVertical: 11 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{testMutation.isPending ? '测试中...' : '测试账号'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={modelsQuery.isFetching}
                    onPress={() => {
                      setTestModels(availableModelNames);
                      setFeedback(availableModelNames.length > 0 ? `已加载 ${availableModelNames.length} 个可用模型。` : '后端未返回可用模型。');
                    }}
                    style={{ borderRadius: 10, backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 11 }}
                  >
                    <Text style={{ color: '#4b5563', fontSize: 12, fontWeight: '700' }}>{modelsQuery.isFetching ? '加载中...' : '查看模型'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={refreshMutation.isPending}
                    onPress={() => refreshMutation.mutate()}
                    style={{ borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 11 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{refreshMutation.isPending ? '刷新中...' : '刷新账号'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={schedulableMutation.isPending}
                    onPress={toggleSchedulable}
                    style={{ borderRadius: 10, backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 11 }}
                  >
                    <Text style={{ color: '#4b5563', fontSize: 12, fontWeight: '700' }}>
                      {schedulableMutation.isPending ? '处理中...' : nextSchedulable ? '恢复调度' : '暂停调度'}
                    </Text>
                  </Pressable>
                  {account.error_message || account.rate_limit_reset_at || account.temp_unschedulable_until || account.overload_until ? (
                    <Pressable
                      disabled={recoverMutation.isPending}
                      onPress={() => recoverMutation.mutate()}
                      style={{ borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 11 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{recoverMutation.isPending ? '恢复中...' : '恢复状态'}</Text>
                    </Pressable>
                  ) : null}
                  {account.error_message ? (
                    <Pressable
                      disabled={clearErrorMutation.isPending}
                      onPress={() => clearErrorMutation.mutate()}
                      style={{ borderRadius: 10, backgroundColor: colors.errorBg, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: '#fecaca' }}
                    >
                      <Text style={{ color: colors.errorText, fontSize: 12, fontWeight: '700' }}>{clearErrorMutation.isPending ? '清除中...' : '清除异常'}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {feedback ? (
                  <View style={{ marginTop: 12, borderRadius: 10, backgroundColor: colors.successBg, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Text style={{ color: colors.successText }}>{feedback}</Text>
                  </View>
                ) : null}

                {availableModelNames.length > 0 ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ marginBottom: 8, fontSize: 12, fontWeight: '700', color: colors.text }}>可用模型</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {availableModelNames.slice(0, 20).map((model) => (
                        <View key={model} style={{ borderRadius: 999, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7 }}>
                          <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{model}</Text>
                        </View>
                      ))}
                    </View>
                    {availableModelNames.length > 20 ? <Text style={{ marginTop: 8, fontSize: 11, color: colors.subtext }}>还有 {availableModelNames.length - 20} 个模型未显示。</Text> : null}
                  </View>
                ) : null}
              </Section>

              <Section title="修改账号">
                <Field label="账号名称" value={name} onChangeText={setName} placeholder="例如：openai-main" />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>平台</Text>
                <OptionChips
                  value={platform}
                  options={PLATFORM_OPTIONS.some((item) => item.value === platform) ? PLATFORM_OPTIONS : [{ value: platform, label: platform }, ...PLATFORM_OPTIONS]}
                  onChange={setPlatform}
                />

                <Text style={{ marginBottom: 6, fontSize: 12, color: colors.subtext }}>账号类型</Text>
                <OptionChips
                  value={accountType}
                  options={ACCOUNT_TYPE_OPTIONS.some((item) => item.value === accountType) ? ACCOUNT_TYPE_OPTIONS : [{ value: accountType, label: accountType }, ...ACCOUNT_TYPE_OPTIONS]}
                  onChange={setAccountType}
                />

                <Field label="备注" value={notes} onChangeText={setNotes} placeholder="可选" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="并发" value={concurrency} onChangeText={setConcurrency} placeholder="10" keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="优先级" value={priority} onChangeText={setPriority} placeholder="0" keyboardType="number-pad" />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="倍率" value={rateMultiplier} onChangeText={setRateMultiplier} placeholder="1" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="代理 ID" value={proxyId} onChangeText={setProxyId} placeholder="3" keyboardType="number-pad" />
                  </View>
                </View>
                <Field label="分组 ID（逗号分隔）" value={groupIds} onChangeText={setGroupIds} placeholder="1,2,5" />

                <Pressable
                  onPress={() => setShowAdvanced((value) => !value)}
                  style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>高级 JSON 配置</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{showAdvanced ? '收起' : '展开'}</Text>
                </Pressable>

                {showAdvanced ? (
                  <>
                    <Field label="扩展配置 JSON" value={extraJson} onChangeText={setExtraJson} multiline placeholder='{"window_cost_limit":50}' />
                    <Field label="凭证 JSON（留空不修改）" value={credentialsJson} onChangeText={setCredentialsJson} multiline placeholder='{"base_url":"https://api.example.com","api_key":"sk-..."}' />
                  </>
                ) : (
                  <Text style={{ marginBottom: 12, fontSize: 12, lineHeight: 18, color: colors.subtext }}>默认不会修改原凭证。需要更新密钥或扩展配置时再展开。</Text>
                )}

                {formError ? (
                  <View style={{ backgroundColor: colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <Text style={{ color: colors.errorText }}>{formError}</Text>
                  </View>
                ) : null}

                <Pressable
                  disabled={isBusy || !name.trim()}
                  onPress={submitUpdate}
                  style={{
                    borderRadius: 12,
                    backgroundColor: isBusy || !name.trim() ? colors.disabled : colors.dark,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{updateMutation.isPending ? '保存中...' : '保存账号'}</Text>
                </Pressable>
              </Section>
            </>
          ) : null}

          <Section title="使用记录">
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {RANGE_OPTIONS.map((item) => {
                const active = item.key === rangeKey;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setRangeKey(item.key)}
                    style={{
                      backgroundColor: active ? colors.primary : colors.muted,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <MetricCard label="请求" value={formatNumber(summary?.total_requests)} />
              <MetricCard label="Token" value={formatNumber(summary?.total_tokens)} />
              <MetricCard label="账号成本" value={formatMoney(summary?.total_cost)} />
            </View>

            {summary ? (
              <Text style={{ marginTop: 10, fontSize: 12, color: colors.subtext }}>
                用户成本 {formatMoney(summary.total_user_cost)} · 日均请求 {formatNumber(summary.avg_daily_requests)}
              </Text>
            ) : null}

            {accountStatsQuery.isLoading ? <Text style={{ marginTop: 12, color: colors.subtext }}>正在加载用量统计...</Text> : null}
            {accountStatsQuery.error ? (
              <View style={{ marginTop: 12, backgroundColor: colors.errorBg, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: colors.errorText, fontWeight: '700' }}>用量统计加载失败</Text>
                <Text style={{ marginTop: 6, color: colors.errorText }}>{getErrorMessage(accountStatsQuery.error)}</Text>
              </View>
            ) : null}

            {!accountStatsQuery.isLoading && trendPoints.length > 1 ? (
              <View style={{ marginTop: 14 }}>
                <LineTrendChart
                  title="账号用量趋势"
                  subtitle={`${range.start_date} 到 ${range.end_date}`}
                  points={trendPoints}
                  color="#2563eb"
                  formatValue={(value) => formatNumber(value)}
                  compact
                />
              </View>
            ) : null}

            {!accountStatsQuery.isLoading && modelItems.length > 0 ? (
              <View style={{ marginTop: 14 }}>
                <BarChartCard
                  title="模型使用"
                  subtitle={`${range.start_date} 到 ${range.end_date}`}
                  items={modelItems}
                  formatValue={(value) => formatNumber(value)}
                />
              </View>
            ) : null}

            {!accountStatsQuery.isLoading && !accountStatsQuery.error && trendPoints.length === 0 && modelItems.length === 0 ? (
              <Text style={{ marginTop: 12, color: colors.subtext }}>当前时间范围内暂无使用记录。</Text>
            ) : null}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

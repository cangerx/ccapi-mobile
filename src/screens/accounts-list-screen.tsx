import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { KeyRound, Plus, Search, ShieldCheck, ShieldOff } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import { ListCard } from '@/src/components/list-card';
import { ScreenShell } from '@/src/components/screen-shell';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { formatAccountMeta } from '@/src/lib/account-labels';
import { formatTokenValue } from '@/src/lib/formatters';
import { getBatchAccountTodayStats, listAccountModels, listAccounts, setAccountSchedulable } from '@/src/services/admin';
import type { AdminAccount } from '@/src/types/admin';

type AccountStatusFilter = 'all' | 'active' | 'paused' | 'error';
type UsageSort = 'usage-desc' | 'usage-asc';
type AccountVisualStatus = {
  filterKey: AccountStatusFilter;
  label: '正常' | '暂停' | '异常';
  badgeTone: 'success' | 'muted' | 'danger';
};

type AccountTodaySummary = {
  requests: number;
  tokens: number;
  cost: number;
};

function formatTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getAccountError(account: AdminAccount) {
  return Boolean(account.status === 'error' || account.error_message);
}

function getAccountVisualStatus(account: AdminAccount): AccountVisualStatus {
  const normalizedStatus = `${account.status ?? ''}`.toLowerCase();
  const isPausedStatus = ['inactive', 'disabled', 'paused', 'stop', 'stopped'].includes(normalizedStatus);

  if (getAccountError(account)) {
    return { filterKey: 'error', label: '异常', badgeTone: 'danger' };
  }
  if (isPausedStatus || account.schedulable === false) {
    return { filterKey: 'paused', label: '暂停', badgeTone: 'muted' };
  }
  return { filterKey: 'active', label: '正常', badgeTone: 'success' };
}

type AccountsListScreenProps = {
  safeAreaEdges?: Edge[];
};

export function AccountsListScreen({ safeAreaEdges }: AccountsListScreenProps) {
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<AccountStatusFilter>('all');
  const [usageSort, setUsageSort] = useState<UsageSort>('usage-desc');
  const [testingAccountId, setTestingAccountId] = useState<number | null>(null);
  const [testFeedbackByAccountId, setTestFeedbackByAccountId] = useState<Record<number, string>>({});
  const [togglingAccountId, setTogglingAccountId] = useState<number | null>(null);
  const keyword = useDebouncedValue(searchText.trim(), 300);
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts', keyword],
    queryFn: () => listAccounts(keyword),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ accountId, schedulable }: { accountId: number; schedulable: boolean }) =>
      setAccountSchedulable(accountId, schedulable),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const modelsMutation = useMutation({
    mutationFn: (accountId: number) => listAccountModels(accountId),
  });

  const items = accountsQuery.data?.items ?? [];
  const accountIds = useMemo(() => items.map((account) => account.id), [items]);
  const batchTodayStatsQuery = useQuery({
    queryKey: ['account-today-stats-batch', accountIds.join(',')],
    queryFn: () => getBatchAccountTodayStats(accountIds),
    enabled: accountIds.length > 0,
    staleTime: 60_000,
  });

  const todayByAccountId = useMemo(() => {
    const next = new Map<number, AccountTodaySummary>();
    const stats = batchTodayStatsQuery.data?.stats ?? {};
    items.forEach((account) => {
      const result = stats[String(account.id)];
      const fromStatsCost = typeof result?.cost === 'number' && Number.isFinite(result.cost) ? result.cost : undefined;
      const fromExtra = typeof account.extra?.today_cost === 'number' ? account.extra.today_cost : undefined;
      const cost = fromStatsCost ?? fromExtra ?? 0;
      const requests = typeof result?.requests === 'number' && Number.isFinite(result.requests) ? result.requests : 0;
      const tokens = typeof result?.tokens === 'number' && Number.isFinite(result.tokens) ? result.tokens : 0;
      next.set(account.id, { requests, tokens, cost });
    });
    return next;
  }, [batchTodayStatsQuery.data?.stats, items]);

  const filteredItems = useMemo(() => {
    const statusMatched = items.filter((account) => {
      const visualStatus = getAccountVisualStatus(account);
      if (filter === 'all') return true;
      if (filter === 'active') return visualStatus.filterKey === 'active';
      if (filter === 'paused') return visualStatus.filterKey === 'paused';
      if (filter === 'error') return visualStatus.filterKey === 'error';
      return true;
    });

    const sorted = [...statusMatched].sort((left, right) => {
      const requestsLeft = todayByAccountId.get(left.id)?.requests ?? 0;
      const requestsRight = todayByAccountId.get(right.id)?.requests ?? 0;
      if (requestsLeft === requestsRight) {
        const tokensLeft = todayByAccountId.get(left.id)?.tokens ?? 0;
        const tokensRight = todayByAccountId.get(right.id)?.tokens ?? 0;
        return tokensLeft - tokensRight;
      }
      if (usageSort === 'usage-asc') return requestsLeft - requestsRight;
      return requestsRight - requestsLeft;
    });

    return sorted;
  }, [filter, items, todayByAccountId, usageSort]);
  const errorMessage = accountsQuery.error instanceof Error ? accountsQuery.error.message : '';

  const summary = useMemo(() => {
    const total = items.length;
    const errors = items.filter((item) => getAccountVisualStatus(item).filterKey === 'error').length;
    const paused = items.filter((item) => getAccountVisualStatus(item).filterKey === 'paused').length;
    const active = items.filter((item) => getAccountVisualStatus(item).filterKey === 'active').length;
    return { total, active, paused, errors };
  }, [items]);

  const listHeader = useMemo(
    () => (
      <View className="pb-2">
        <View className="rounded-[12px] border border-[#e5e7eb] bg-white p-3">
          <View className="flex-row items-center rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5">
            <Search color="#6b7280" size={18} />
            <TextInput
              defaultValue=""
              onChangeText={setSearchText}
              placeholder="搜索账号名称或平台"
              placeholderTextColor="#9ca3af"
              className="ml-3 flex-1 text-[15px] text-[#111827]"
            />
          </View>

          <View className="mt-3 flex-row gap-2">
            {([
              ['all', `全部 ${summary.total}`],
              ['active', `正常 ${summary.active}`],
              ['paused', `暂停 ${summary.paused}`],
              ['error', `异常 ${summary.errors}`],
            ] as const).map(([key, label]) => {
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  className={active ? 'rounded-full bg-[#2563eb] px-3 py-2' : 'rounded-full bg-[#f3f4f6] px-3 py-2'}
                >
                  <Text className={active ? 'text-xs font-semibold text-white' : 'text-xs font-semibold text-[#4b5563]'}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-3 flex-row gap-2">
            {([
              ['usage-desc', '请求最多'],
              ['usage-asc', '请求最少'],
            ] as const).map(([key, label]) => {
              const active = usageSort === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setUsageSort(key)}
                  className={active ? 'rounded-full bg-[#111827] px-3 py-3' : 'rounded-full bg-[#f3f4f6] px-3 py-3'}
                >
                  <Text className={active ? 'text-xs font-semibold text-white' : 'text-xs font-semibold text-[#4b5563]'}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    ),
    [filter, summary.active, summary.errors, summary.paused, summary.total, usageSort]
  );

  const renderItem = useCallback(
    ({ item: account }: { item: (typeof filteredItems)[number] }) => {
      const isError = getAccountError(account);
      const visualStatus = getAccountVisualStatus(account);
      const statusText = visualStatus.label;
      const groupsText = account.groups?.map((group) => group.name).filter(Boolean).slice(0, 3).join(' · ');
      const todayStats = todayByAccountId.get(account.id) ?? { requests: 0, tokens: 0, cost: 0 };
      const nextSchedulable = visualStatus.filterKey === 'paused';
      const toggleLabel = nextSchedulable ? '恢复' : '暂停';
      const testFeedback = testFeedbackByAccountId[account.id];
      const isTogglingCurrent = togglingAccountId === account.id && toggleMutation.isPending;
      const isTestingCurrent = testingAccountId === account.id && modelsMutation.isPending;

      return (
        <Pressable onPress={() => router.push(`/accounts/${account.id}`)}>
          <ListCard
            title={account.name}
            meta={formatAccountMeta(account.platform, account.type)}
            badge={statusText}
            badgeTone={visualStatus.badgeTone}
            icon={KeyRound}
          >
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {account.schedulable && !isError ? <ShieldCheck color="#6b7280" size={14} /> : <ShieldOff color="#6b7280" size={14} />}
                  <Text className="text-sm text-[#6b7280]">状态：{statusText}</Text>
                </View>
                <Text className="text-xs text-[#6b7280]">最近使用 {formatTime(account.last_used_at || account.updated_at)}</Text>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3">
                  <Text className="text-[11px] text-[#6b7280]">今日请求</Text>
                  <Text className="mt-1 text-sm font-bold text-[#111827]">{todayStats.requests}</Text>
                </View>
                <View className="flex-1 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3">
                  <Text className="text-[11px] text-[#6b7280]">今日成本</Text>
                  <Text className="mt-1 text-sm font-bold text-[#111827]">${todayStats.cost.toFixed(2)}</Text>
                </View>
                <View className="flex-1 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3">
                  <Text className="text-[11px] text-[#6b7280]">Token</Text>
                  <Text className="mt-1 text-sm font-bold text-[#111827]">{formatTokenValue(todayStats.tokens)}</Text>
                </View>
              </View>

              <Text className="text-xs text-[#6b7280]">优先级 {account.priority ?? 0} · 倍率 {(account.rate_multiplier ?? 1).toFixed(2)}x</Text>

              {groupsText ? <Text className="text-xs text-[#6b7280]">分组 {groupsText}</Text> : null}
              {account.error_message ? <Text className="text-xs text-[#b42318]">异常信息：{account.error_message}</Text> : null}

              <View className="flex-row gap-2">
                <Pressable
                  className="rounded-[10px] bg-[#111827] px-4 py-2"
                  disabled={isTestingCurrent}
                  onPress={(event) => {
                    event.stopPropagation();
                    setTestingAccountId(account.id);
                    modelsMutation.mutate(account.id, {
                      onSuccess: (models) => {
                        const modelNames = models
                          .map((model) => model.id || model.display_name || model.name || model.model)
                          .filter(Boolean) as string[];
                        setTestFeedbackByAccountId((current) => ({
                          ...current,
                          [account.id]: modelNames.length > 0
                            ? `可用模型：${modelNames.slice(0, 6).join('、')}${modelNames.length > 6 ? ` 等 ${modelNames.length} 个` : ''}`
                            : '后端未返回可用模型',
                        }));
                      },
                      onError: (error) => {
                        const message = error instanceof Error && error.message ? error.message : '模型列表获取失败';
                        setTestFeedbackByAccountId((current) => ({ ...current, [account.id]: message }));
                      },
                      onSettled: () => {
                        setTestingAccountId((current) => (current === account.id ? null : current));
                      },
                    });
                  }}
                >
                  <Text className="text-xs font-semibold text-white">{isTestingCurrent ? '加载中...' : '查看模型'}</Text>
                </Pressable>
                <Pressable
                  className="rounded-[10px] bg-[#2563eb] px-4 py-2"
                  onPress={(event) => {
                    event.stopPropagation();
                    router.push(`/accounts/${account.id}`);
                  }}
                >
                  <Text className="text-xs font-semibold text-white">编辑</Text>
                </Pressable>
                <Pressable
                  className="rounded-[10px] bg-[#f3f4f6] px-4 py-2"
                  disabled={isTogglingCurrent}
                  onPress={(event) => {
                    event.stopPropagation();
                    setTogglingAccountId(account.id);
                    toggleMutation.mutate({
                      accountId: account.id,
                      schedulable: nextSchedulable,
                    }, {
                      onSettled: () => {
                        setTogglingAccountId((current) => (current === account.id ? null : current));
                      },
                    });
                  }}
                >
                  <Text className="text-xs font-semibold text-[#4b5563]">{isTogglingCurrent ? '处理中...' : toggleLabel}</Text>
                </Pressable>
              </View>

              {testFeedback ? <Text className="text-xs leading-4 text-[#2563eb]">{testFeedback}</Text> : null}
            </View>
          </ListCard>
        </Pressable>
      );
    },
    [modelsMutation, testFeedbackByAccountId, testingAccountId, todayByAccountId, toggleMutation, togglingAccountId]
  );

  const emptyState = useMemo(
    () => <ListCard title="暂无账号" meta={errorMessage || '连上后这里会展示账号列表。'} icon={KeyRound} />,
    [errorMessage]
  );

  return (
    <ScreenShell
      title="账号清单"
      subtitle="查看账号状态、今日用量、可用模型，并快速测试或编辑。"
      right={(
        <Pressable
          onPress={() => router.push('/accounts/create')}
          className="h-10 w-10 items-center justify-center rounded-[10px] bg-[#2563eb]"
        >
          <Plus color="#ffffff" size={18} />
        </Pressable>
      )}
      variant="minimal"
      scroll={false}
      safeAreaEdges={safeAreaEdges}
      bottomInsetClassName="pb-6"
      contentGapClassName="mt-2 gap-2"
    >
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}`}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={accountsQuery.isRefetching || batchTodayStatsQuery.isRefetching} onRefresh={() => {
          void accountsQuery.refetch();
          void batchTodayStatsQuery.refetch();
        }} tintColor="#2563eb" />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        ItemSeparatorComponent={() => <View className="h-4" />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </ScreenShell>
  );
}

import { router } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { z } from 'zod';

import { getAdminSettings, getDashboardStats } from '@/src/services/admin';
import { queryClient } from '@/src/lib/query-client';
import { adminConfigState, removeAdminAccount, saveAdminConfig, switchAdminAccount, type AdminAccountProfile } from '@/src/store/admin-config';

const { useSnapshot } = require('valtio/react');

const schema = z
  .object({
    baseUrl: z.string().min(1, '请输入服务器地址'),
    adminApiKey: z.string(),
  })
  .refine((values) => values.adminApiKey.trim().length > 0, {
    path: ['adminApiKey'],
    message: '请输入 Admin Key',
  });

type FormValues = z.infer<typeof schema>;
type ConnectionState = 'idle' | 'checking' | 'success' | 'error';

const colors = {
  page: '#f6f7f9',
  card: '#ffffff',
  mutedCard: '#f9fafb',
  primary: '#2563eb',
  text: '#111827',
  subtext: '#6b7280',
  border: '#e5e7eb',
  inputBorder: '#d1d5db',
  dangerBg: '#fef3f2',
  danger: '#b42318',
  successBg: '#ecfdf3',
  success: '#027a48',
  disabled: '#9ca3af',
};

function getConnectionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    switch (error.message) {
      case 'BASE_URL_REQUIRED':
        return '请先填写服务器地址。';
      case 'ADMIN_API_KEY_REQUIRED':
        return '请先填写 Admin Key。';
      case 'INVALID_SERVER_RESPONSE':
        return '当前地址返回的数据不正确，请确认它是可用的管理接口。';
      default:
        return error.message;
    }
  }

  return '连接失败，请检查服务器地址、Admin Key 和网络连通性。';
}

function ServerCard({
  account,
  active,
  onSelect,
  onDelete,
}: {
  account: AdminAccountProfile;
  active: boolean;
  onSelect: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: active ? colors.successBg : colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: active ? colors.success : colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{account.label}</Text>
          <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 20, color: colors.subtext }}>{account.baseUrl}</Text>
          <Text style={{ marginTop: 8, fontSize: 11, color: colors.subtext }}>更新时间 {new Date(account.updatedAt).toLocaleString()}</Text>
        </View>
        {active ? (
          <View style={{ backgroundColor: colors.success, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>当前使用</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressable onPress={onSelect} style={{ flex: 1, backgroundColor: active ? '#dcfce7' : colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ color: active ? colors.success : '#fff', fontSize: 13, fontWeight: '700' }}>{active ? '已选中' : '切换到此服务器'}</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={{ backgroundColor: colors.dangerBg, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 16, justifyContent: 'center' }}>
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>删除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const config = useSnapshot(adminConfigState);
  const [showForm, setShowForm] = useState(config.accounts.length === 0);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseUrl: '',
      adminApiKey: '',
    },
  });

  async function verifyAndEnter(successMessage: string) {
    setConnectionState('checking');
    setConnectionMessage('正在检测当前服务是否可用...');

    try {
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
      await queryClient.prefetchQuery({ queryKey: ['monitor-stats'], queryFn: getDashboardStats });
      setConnectionState('success');
      setConnectionMessage(successMessage);
      router.replace('/monitor');
    } catch (error) {
      setConnectionState('error');
      setConnectionMessage(getConnectionErrorMessage(error));
    }
  }

  async function handleAdd(values: FormValues) {
    await saveAdminConfig(values);
    reset({ baseUrl: '', adminApiKey: '' });
    setShowForm(false);
    await verifyAndEnter('服务器已添加并切换成功。');
  }

  async function handleSelect(account: AdminAccountProfile) {
    await switchAdminAccount(account.id);
    await verifyAndEnter(`已切换到 ${account.label}。`);
  }

  async function handleDelete(account: AdminAccountProfile) {
    await removeAdminAccount(account.id);
    queryClient.clear();
  }

  async function handleRefresh() {
    if (!config.baseUrl.trim()) {
      return;
    }

    setIsRefreshing(true);
    setConnectionState('idle');
    setConnectionMessage('');

    try {
      await Promise.all([
        queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings }),
        queryClient.prefetchQuery({ queryKey: ['monitor-stats'], queryFn: getDashboardStats }),
      ]);
    } catch (error) {
      setConnectionState('error');
      setConnectionMessage(getConnectionErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} tintColor="#2563eb" />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>服务器</Text>
            <Text style={{ marginTop: 6, fontSize: 13, color: colors.subtext }}>选择当前管理的服务器，或添加新的服务器。</Text>
          </View>
          <Pressable
            onPress={() => {
              setShowForm((value) => !value);
              setConnectionState('idle');
              setConnectionMessage('');
            }}
            style={{ backgroundColor: colors.primary, borderRadius: 10, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 24, lineHeight: 24 }}>+</Text>
          </Pressable>
        </View>

        {showForm ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>添加服务器</Text>

            <View>
              <Text style={{ marginBottom: 8, fontSize: 12, color: colors.subtext }}>服务器地址</Text>
              <Controller
                control={control}
                name="baseUrl"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="例如：https://api.example.com"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ backgroundColor: colors.mutedCard, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text }}
                  />
                )}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 8, fontSize: 12, color: colors.subtext }}>Admin Key</Text>
              <Controller
                control={control}
                name="adminApiKey"
                render={({ field: { onChange, value } }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="admin-xxxxxxxx"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!showAdminKey}
                      style={{
                        flex: 1,
                        backgroundColor: colors.mutedCard,
                        borderWidth: 1,
                        borderColor: colors.inputBorder,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: colors.text,
                      }}
                    />
                    <Pressable
                      onPress={() => setShowAdminKey((value) => !value)}
                      style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4b5563' }}>{showAdminKey ? '隐藏' : '显示'}</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>

            {formState.errors.baseUrl || formState.errors.adminApiKey ? (
              <View style={{ borderRadius: 10, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: colors.danger, fontSize: 14 }}>{formState.errors.baseUrl?.message || formState.errors.adminApiKey?.message}</Text>
              </View>
            ) : null}

            {connectionMessage ? (
              <View style={{ borderRadius: 10, backgroundColor: connectionState === 'success' ? colors.successBg : colors.dangerBg, borderWidth: 1, borderColor: connectionState === 'success' ? '#bbf7d0' : '#fecaca', paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: connectionState === 'success' ? colors.success : colors.danger, fontSize: 14 }}>{connectionMessage}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={handleSubmit(handleAdd)}
                disabled={connectionState === 'checking'}
                style={{ flex: 1, backgroundColor: connectionState === 'checking' ? colors.disabled : colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{connectionState === 'checking' ? '检测中...' : '保存并使用'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowForm(false);
                  setConnectionState('idle');
                  setConnectionMessage('');
                  reset({ baseUrl: '', adminApiKey: '' });
                }}
                style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#4b5563', fontSize: 14, fontWeight: '700' }}>取消</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          {config.accounts.map((account: AdminAccountProfile) => (
            <ServerCard
              key={account.id}
              account={account}
              active={account.id === config.activeAccountId}
              onSelect={() => handleSelect(account)}
              onDelete={() => handleDelete(account)}
            />
          ))}

          {config.accounts.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 18 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>还没有服务器</Text>
              <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 21, color: colors.subtext }}>点击右上角 + 添加服务器，保存成功后会自动切换并进入概览。</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

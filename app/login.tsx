import { Redirect, router } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { getAdminSettings, getDashboardStats } from '@/src/services/admin';
import { queryClient } from '@/src/lib/query-client';
import { adminConfigState, hasAuthenticatedAdminSession, saveAdminConfig } from '@/src/store/admin-config';

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
type ConnectionState = 'idle' | 'checking' | 'error';

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

export default function LoginScreen() {
  const config = useSnapshot(adminConfigState);
  const hasAccount = hasAuthenticatedAdminSession(config);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseUrl: config.baseUrl,
      adminApiKey: config.adminApiKey,
    },
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);

  if (hasAccount) {
    return <Redirect href="/monitor" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 34, fontWeight: '800', color: colors.text }}>管理员入口</Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: colors.subtext }}>
              首次进入请填写服务器地址和 Admin Key。连接成功后即可进入应用，并在“服务器”页管理多个服务器。
            </Text>
          </View>

          <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 16 }}>
            <View>
              <Text style={{ marginBottom: 8, fontSize: 12, color: colors.subtext }}>服务器地址</Text>
              <Controller
                control={control}
                name="baseUrl"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={(text) => {
                      if (connectionState !== 'idle') {
                        setConnectionState('idle');
                        setConnectionMessage('');
                      }
                      onChange(text);
                    }}
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
                      onChangeText={(text) => {
                        if (connectionState !== 'idle') {
                          setConnectionState('idle');
                          setConnectionMessage('');
                        }
                        onChange(text);
                      }}
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
              <View style={{ borderRadius: 10, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: colors.danger, fontSize: 14 }}>{connectionMessage}</Text>
              </View>
            ) : null}

            <Pressable
              style={{ backgroundColor: connectionState === 'checking' ? colors.disabled : colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center' }}
              disabled={connectionState === 'checking'}
              onPress={handleSubmit(async (values) => {
                setConnectionState('checking');
                setConnectionMessage('正在验证服务器连接...');

                try {
                  await saveAdminConfig(values);
                  queryClient.clear();
                  await queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
                  await queryClient.prefetchQuery({ queryKey: ['monitor-stats'], queryFn: getDashboardStats });
                  router.replace('/monitor');
                } catch (error) {
                  setConnectionState('error');
                  setConnectionMessage(getConnectionErrorMessage(error));
                }
              })}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{connectionState === 'checking' ? '连接中...' : '进入应用'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import type { PropsWithChildren, ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  titleAside?: ReactNode;
  right?: ReactNode;
  variant?: 'card' | 'minimal';
  scroll?: boolean;
  bottomInsetClassName?: string;
  horizontalInsetClassName?: string;
  contentGapClassName?: string;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  safeAreaEdges?: Edge[];
}>;

function ScreenHeader({
  title,
  subtitle,
  titleAside,
  right,
  variant,
}: Pick<ScreenShellProps, 'title' | 'subtitle' | 'titleAside' | 'right' | 'variant'>) {
  if (variant === 'minimal') {
    return (
      <View className="mt-4 flex-row items-start justify-between gap-4 px-1 py-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[22px] font-bold text-[#111827]">{title}</Text>
            {titleAside}
          </View>
          {subtitle ? (
            <Text numberOfLines={1} className="mt-1 text-[12px] leading-4 text-[#6b7280]">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View className="items-end justify-start">{right}</View> : null}
      </View>
    );
  }

  return (
    <View className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-white px-4 py-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-[24px] font-bold text-[#111827]">{title}</Text>
          <Text numberOfLines={1} className="mt-1 text-xs leading-4 text-[#6b7280]">
            {subtitle}
          </Text>
        </View>
        {right}
      </View>
    </View>
  );
}

export function ScreenShell({
  title,
  subtitle,
  titleAside,
  right,
  children,
  variant = 'card',
  scroll = true,
  bottomInsetClassName = 'pb-24',
  horizontalInsetClassName = 'px-5',
  contentGapClassName = 'mt-4 gap-4',
  refreshing = false,
  onRefresh,
  safeAreaEdges = ['top', 'bottom'],
}: ScreenShellProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={safeAreaEdges} style={{ flex: 1, backgroundColor: '#f6f7f9' }}>
        <View className={`flex-1 ${horizontalInsetClassName} ${bottomInsetClassName}`}>
          <ScreenHeader title={title} subtitle={subtitle} titleAside={titleAside} right={right} variant={variant} />
          <View className={`flex-1 ${contentGapClassName}`}>{children}</View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={safeAreaEdges} style={{ flex: 1, backgroundColor: '#f6f7f9' }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" /> : undefined}
      >
        <View className={`${horizontalInsetClassName} ${bottomInsetClassName}`}>
          <ScreenHeader title={title} subtitle={subtitle} titleAside={titleAside} right={right} variant={variant} />
          <View className={contentGapClassName}>{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

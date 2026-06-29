import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type ListCardProps = {
  title: string;
  meta?: string;
  badge?: string;
  badgeTone?: 'default' | 'success' | 'muted' | 'danger';
  children?: ReactNode;
  icon?: LucideIcon;
};

const badgeClassMap: Record<NonNullable<ListCardProps['badgeTone']>, { wrap: string; text: string }> = {
  default: {
    wrap: 'rounded-full bg-[#f3f4f6] px-2.5 py-1',
    text: 'text-[10px] font-semibold text-[#4b5563]',
  },
  success: {
    wrap: 'rounded-full bg-[#ecfdf3] px-2.5 py-1',
    text: 'text-[10px] font-semibold text-[#027a48]',
  },
  muted: {
    wrap: 'rounded-full bg-[#f3f4f6] px-2.5 py-1',
    text: 'text-[10px] font-semibold text-[#6b7280]',
  },
  danger: {
    wrap: 'rounded-full bg-[#fef3f2] px-2.5 py-1',
    text: 'text-[10px] font-semibold text-[#b42318]',
  },
};

export function ListCard({ title, meta, badge, badgeTone = 'default', children, icon: Icon }: ListCardProps) {
  const badgeClass = badgeClassMap[badgeTone];

  return (
    <View className="rounded-[12px] border border-[#e5e7eb] bg-white p-3.5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            {Icon ? <Icon color="#6b7280" size={16} /> : null}
            <Text className="text-base font-semibold text-[#111827]">{title}</Text>
          </View>
          {meta ? <Text numberOfLines={1} className="mt-1 text-xs text-[#6b7280]">{meta}</Text> : null}
        </View>
        {badge ? (
          <View className={badgeClass.wrap}>
            <Text className={badgeClass.text}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}

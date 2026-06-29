import type { LucideIcon } from 'lucide-react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text, View } from 'react-native';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'light' | 'dark';
  trend?: 'up' | 'down';
  icon?: LucideIcon;
};

export function StatCard({ label, value, tone = 'light', trend, icon: Icon }: StatCardProps) {
  const dark = tone === 'dark';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <View className={dark ? 'rounded-[16px] bg-[#111827] p-4' : 'rounded-[16px] border border-[#e5e7eb] bg-white p-4'}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className={dark ? 'text-xs font-semibold text-[#c7d2fe]' : 'text-xs font-semibold text-[#6b7280]'}>
          {label}
        </Text>
        <View className="flex-row items-center gap-2">
          {TrendIcon ? <TrendIcon color={dark ? '#c7d2fe' : '#6b7280'} size={14} /> : null}
          {Icon ? <Icon color={dark ? '#c7d2fe' : '#6b7280'} size={14} /> : null}
        </View>
      </View>
      <Text className={dark ? 'mt-3 text-3xl font-bold text-white' : 'mt-3 text-3xl font-bold text-[#111827]'}>
        {value}
      </Text>
    </View>
  );
}

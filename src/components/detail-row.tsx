import { Text, View } from 'react-native';

type DetailRowProps = {
  label: string;
  value: string;
};

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-b border-[#e5e7eb] py-3 last:border-b-0">
      <Text className="text-sm text-[#6b7280]">{label}</Text>
      <Text className="max-w-[62%] text-right text-sm font-medium text-[#111827]">{value}</Text>
    </View>
  );
}

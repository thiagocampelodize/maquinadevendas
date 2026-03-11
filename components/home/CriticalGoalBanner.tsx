import { AlertTriangle, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

interface CriticalGoalBannerProps {
  companyName: string;
  missingAmount: number;
  onDismiss: () => void;
}

export function CriticalGoalBanner({ companyName, missingAmount, onDismiss }: CriticalGoalBannerProps) {
  const formattedMissingAmount = missingAmount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

  return (
    <View className="mx-4 mt-4 rounded-2xl border border-[#FCA5A5]/40 bg-[#DC2626] px-4 py-4 shadow-sm">
      <View className="flex-row items-start gap-3">
        <AlertTriangle size={20} color="#FFFFFF" />

        <View className="flex-1">
          <Text className="text-base font-extrabold text-white">Urgente: Muito Abaixo da Meta!</Text>
          <Text className="mt-1 text-sm font-bold text-white">
            {companyName} - Faltam {formattedMissingAmount}
          </Text>
        </View>

        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Fechar alerta crítico"
          className="rounded-lg p-1"
        >
          <X size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

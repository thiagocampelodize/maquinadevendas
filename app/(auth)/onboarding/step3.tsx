import { useRouter } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

import { Step3Conclusion } from '@/components/onboarding/Step3Conclusion';
import { SubmenuBackButton } from '@/components/ui/SubmenuBackButton';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingStep3() {
  const router = useRouter();
  const {
    companyName,
    ownerName,
    monthlyGoal,
    initialSales,
    isSaving,
    handleCompleteOnboarding,
    hasUnsavedChanges,
  } = useOnboarding(() => router.replace('/'));

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="border-b border-[#404040] bg-[#1a1a1a] px-6 py-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-[#9CA3AF]">Passo 3 de 3</Text>
          <SubmenuBackButton onPress={() => router.replace('/(auth)/onboarding/step2')} />
        </View>
        <View className="flex-row gap-2">
          <View className="h-2 flex-1 rounded-full bg-[#FF6B35]" />
          <View className="h-2 flex-1 rounded-full bg-[#FF6B35]" />
          <View className="h-2 flex-1 rounded-full bg-[#FF6B35]" />
        </View>
        {hasUnsavedChanges ? (
          <View className="mt-2 rounded-lg border border-amber-700 bg-amber-900/20 px-3 py-2">
            <Text className="text-xs text-amber-200">
              Alteracoes nao salvas no servidor. Seus dados ficam salvos localmente ate finalizar.
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-1 px-6 py-8">
        <Step3Conclusion
          companyName={companyName}
          ownerName={ownerName}
          monthlyGoal={monthlyGoal}
          initialSales={initialSales}
          isSaving={isSaving}
          onComplete={handleCompleteOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}

import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Step1CompanyInfo } from '@/components/onboarding/Step1CompanyInfo';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingStep1() {
  const router = useRouter();
  const { companyName, setCompanyName, ownerName, setOwnerName, draftRestored, hasUnsavedChanges } =
    useOnboarding(() => router.replace('/'));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="border-b border-[#404040] bg-card px-6 py-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-text-muted">Passo 1 de 3</Text>
        </View>
        <View className="flex-row gap-2">
          <View className="h-2 flex-1 rounded-full bg-[#FF6B35]" />
          <View className="h-2 flex-1 rounded-full bg-[#404040]" />
          <View className="h-2 flex-1 rounded-full bg-[#404040]" />
        </View>
        {draftRestored ? (
          <View className="mt-3 rounded-lg border border-emerald-700 bg-emerald-900/20 px-3 py-2">
            <Text className="text-xs text-emerald-200">Rascunho recuperado automaticamente.</Text>
          </View>
        ) : null}
        {hasUnsavedChanges ? (
          <View className="mt-2 rounded-lg border border-amber-700 bg-amber-900/20 px-3 py-2">
            <Text className="text-xs text-amber-200">
              Alteracoes nao salvas no servidor. Seus dados ficam salvos localmente ate finalizar.
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-1 px-6 py-8">
        <Step1CompanyInfo
          companyName={companyName}
          setCompanyName={setCompanyName}
          ownerName={ownerName}
          setOwnerName={setOwnerName}
          onNext={() => router.push('/(auth)/onboarding/step2')}
        />
      </View>
    </SafeAreaView>
  );
}

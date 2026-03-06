import { Target } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, parseCurrency } from '@/utils/masks';

interface Step2GoalsProps {
  monthlyGoal: string;
  setMonthlyGoal: (val: string) => void;
  initialSales: string;
  setInitialSales: (val: string) => void;
  onNext: () => void;
}

export function Step2Goals({
  monthlyGoal,
  setMonthlyGoal,
  initialSales,
  setInitialSales,
  onNext,
}: Step2GoalsProps) {
  const canProceed = monthlyGoal && parseCurrency(monthlyGoal) > 0;
  const [showErrors, setShowErrors] = useState(false);

  const handleNext = () => {
    if (!canProceed) {
      setShowErrors(true);
      return;
    }
    onNext();
  };

  return (
    <View className="gap-6">
      <View className="items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-[#FF6B35]">
          <Target stroke="#FFFFFF" size={40} />
        </View>
        <Text className="mb-2 text-center text-2xl text-white">Cadastro de Metas 🎯</Text>
        <Text className="text-center text-[#9CA3AF]">Quais as metas de vendas para este mes?</Text>
      </View>

      <Card>
        <Text className="mb-4 text-lg text-white">Configurar Meta Mensal</Text>

        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm text-[#D1D5DB]">Meta do Mes (R$) *</Text>
            <TextInput
              keyboardType="numeric"
              value={monthlyGoal}
              onChangeText={(text) => setMonthlyGoal(formatCurrency(text))}
              placeholder="100.000,00"
              placeholderTextColor="#6B7280"
              className={`rounded-xl border-2 bg-[#262626] px-4 py-4 text-lg text-white ${showErrors && !canProceed ? 'border-red-500' : 'border-[#404040]'}`}
            />
            {showErrors && !canProceed ? (
              <Text className="mt-2 text-xs text-red-500">Informe uma meta valida para continuar.</Text>
            ) : null}
          </View>

          <View>
            <Text className="mb-2 text-sm text-[#D1D5DB]">Total acumulado de vendas ate agora (R$)</Text>
            <TextInput
              keyboardType="numeric"
              value={initialSales}
              onChangeText={(text) => setInitialSales(formatCurrency(text))}
              placeholder="0,00"
              placeholderTextColor="#6B7280"
              className="rounded-xl border-2 border-[#404040] bg-[#262626] px-4 py-4 text-white"
            />
            <Text className="mt-2 text-xs text-[#9CA3AF]">💡 Se sua empresa ja vendeu este mes, informe aqui</Text>
          </View>
        </View>
      </Card>

      <Button disabled={!canProceed} onPress={handleNext}>
        Proximo Passo
      </Button>

      {showErrors && !canProceed ? (
        <Text className="text-center text-sm text-red-500">Preencha a meta obrigatoria para continuar.</Text>
      ) : null}
    </View>
  );
}

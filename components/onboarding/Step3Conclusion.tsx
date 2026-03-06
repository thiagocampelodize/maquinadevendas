import { Rocket } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { parseCurrency } from '@/utils/masks';

interface Step3ConclusionProps {
  companyName: string;
  ownerName: string;
  monthlyGoal: string;
  initialSales: string;
  isSaving?: boolean;
  onComplete: () => void;
}

export function Step3Conclusion({
  companyName,
  ownerName,
  monthlyGoal,
  initialSales,
  isSaving = false,
  onComplete,
}: Step3ConclusionProps) {
  return (
    <View className="gap-6">
      <View className="items-center">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-[#FF6B35]">
          <Rocket stroke="#FFFFFF" size={48} />
        </View>
        <Text className="mb-3 text-3xl text-white">Tudo Pronto! 🚀</Text>
        <Text className="text-center text-lg text-[#9CA3AF]">
          Agora e a hora de colocar a maquina para funcionar e vender muito
        </Text>
      </View>

      <Card>
        <Text className="mb-4 text-lg text-white">📋 Resumo da Configuracao</Text>

        <View className="gap-3">
          <View className="flex-row items-center justify-between border-b border-[#404040] pb-3">
            <Text className="text-[#9CA3AF]">🏢 Empresa:</Text>
            <Text className="text-white">{companyName}</Text>
          </View>
          <View className="flex-row items-center justify-between border-b border-[#404040] pb-3">
            <Text className="text-[#9CA3AF]">👤 Gestor:</Text>
            <Text className="text-white">{ownerName}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[#9CA3AF]">🎯 Meta do Mes:</Text>
            <Text className="text-white">R$ {monthlyGoal || '0,00'}</Text>
          </View>
          {parseCurrency(initialSales) > 0 ? (
            <View className="flex-row items-center justify-between border-t border-[#404040] pt-3">
              <Text className="text-[#9CA3AF]">💰 Vendas Iniciais:</Text>
              <Text className="text-white">R$ {initialSales}</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card style={{ backgroundColor: '#FF6B351A', borderColor: '#FF6B3540' }}>
        <Text className="text-sm text-[#D1D5DB]">
          💡 Dica: Adicione seus vendedores na aba Perfil para acompanhar as vendas de cada um
        </Text>
      </Card>

      <Button loading={isSaving} onPress={onComplete}>
        {isSaving ? 'Salvando...' : 'Comecar a Vender!'}
      </Button>
    </View>
  );
}

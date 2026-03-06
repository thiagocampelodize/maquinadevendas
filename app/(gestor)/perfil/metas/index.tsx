import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SubmenuActionsCard } from '@/components/ui/SubmenuActionsCard';
import { Select } from '@/components/ui/Select';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { goalsService } from '@/services/goalsService';
import { formatCurrency, parseCurrency } from '@/utils/masks';

export default function GoalsConfigPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToastContext();

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [monthValue, setMonthValue] = useState(monthOptions[0]?.value || '');

  const [meta1, setMeta1] = useState('');
  const [meta2, setMeta2] = useState('');
  const [supermeta, setSupermeta] = useState('');
  const [realizadoAnterior, setRealizadoAnterior] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const companyId = user?.company_id;

  const loadGoal = async () => {
    if (!companyId || !monthValue) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const goal = await goalsService.getGoalByMonth(companyId, monthValue);
      setMeta1(goal?.meta1 ? formatCurrency(goal.meta1) : '');
      setMeta2(goal?.meta2 ? formatCurrency(goal.meta2) : '');
      setSupermeta(goal?.supermeta ? formatCurrency(goal.supermeta) : '');
      setRealizadoAnterior(goal?.realizado_anterior ? formatCurrency(goal.realizado_anterior) : '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGoal();
  }, [companyId, monthValue]);

  const applySuggestions = () => {
    const m1 = parseCurrency(meta1);
    if (m1 <= 0) {
      toast.error('Informe a meta principal para calcular sugestões.');
      return;
    }
    setMeta2(formatCurrency((m1 * 1.2).toFixed(2)));
    setSupermeta(formatCurrency((m1 * 1.5).toFixed(2)));
  };

  const saveGoal = async () => {
    if (!companyId) {
      toast.error('Empresa não vinculada.');
      return;
    }

    const parsedMeta1 = parseCurrency(meta1);
    if (parsedMeta1 <= 0) {
      toast.error('A meta principal deve ser maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const result = await goalsService.upsertGoal({
        company_id: companyId,
        month: monthValue,
        meta1: parsedMeta1,
        meta2: Math.max(parseCurrency(meta2), parsedMeta1),
        supermeta: Math.max(parseCurrency(supermeta), parseCurrency(meta2), parsedMeta1),
        realizado_anterior: parseCurrency(realizadoAnterior),
      });

      if (!result) {
        toast.error('Não foi possível salvar as metas.');
        return;
      }

      toast.success('Metas salvas com sucesso!');
      await loadGoal();
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-lg font-semibold text-white">Sem empresa vinculada</Text>
        <Text className="mt-2 text-center text-[#9CA3AF]">Vincule uma empresa ao usuário para configurar metas.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(gestor)/perfil')}
          title="Configuração de Metas"
          subtitle="Defina metas da empresa para acompanhar performance mensal."
        />

        <SubmenuActionsCard>
          <Select label="Mês de referência" value={monthValue} options={monthOptions} onValueChange={setMonthValue} />

          {loading ? (
            <View className="mt-4 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text className="text-sm text-[#9CA3AF]">Carregando metas...</Text>
            </View>
          ) : (
            <View className="mt-4 gap-3">
              <CurrencyField label="Meta principal" value={meta1} onChange={setMeta1} />
              <CurrencyField label="Meta 2" value={meta2} onChange={setMeta2} />
              <CurrencyField label="Supermeta" value={supermeta} onChange={setSupermeta} />
              <CurrencyField label="Realizado anterior" value={realizadoAnterior} onChange={setRealizadoAnterior} />

              <Button variant="outline" className="h-12 rounded-xl" onPress={applySuggestions}>
                Aplicar sugestões automáticas
              </Button>
              <Button className="h-12 rounded-xl" onPress={() => void saveGoal()} loading={saving}>
                Salvar metas
              </Button>
            </View>
          )}
        </SubmenuActionsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function CurrencyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View>
      <Text className="mb-2 text-sm text-[#D1D5DB]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(formatCurrency(text))}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor="#6B7280"
        className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-base text-white"
      />
    </View>
  );
}

function buildMonthOptions() {
  const options: Array<{ label: string; value: string }> = [];
  const base = new Date();
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
    options.push({ label, value });
  }
  return options;
}

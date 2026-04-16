import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useToastContext } from '@/contexts/ToastContext';
import { adminService, type SitePlanPricingRow } from '@/services/adminService';

export default function PlansManagementPage() {
  const router = useRouter();
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<SitePlanPricingRow[]>([]);

  const loadPlans = async () => {
    setLoading(true);
    const data = await adminService.getSitePlanPricing();
    setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const updatePlan = (
    planCode: SitePlanPricingRow['plan_code'],
    field: 'label' | 'unit_price_monthly' | 'min_users' | 'max_users' | 'active',
    value: string | number | boolean,
  ) => {
    setPlans((current) => current.map((plan) => (plan.plan_code === planCode ? { ...plan, [field]: value } : plan)));
  };

  const handleSave = async () => {
    const semestral = plans.find((plan) => plan.plan_code === 'semestral');
    const anual = plans.find((plan) => plan.plan_code === 'anual');

    if (!semestral || !anual) {
      toast.error('Configure semestral e anual antes de salvar.');
      return;
    }

    if (semestral.min_users < 1 || anual.min_users < 1 || semestral.max_users < semestral.min_users || anual.max_users < anual.min_users) {
      toast.error('Faixas de usuários inválidas.');
      return;
    }

    setSaving(true);
    const [saveSemestral, saveAnual] = await Promise.all([
      adminService.upsertSitePlanPricing({
        plan_code: semestral.plan_code,
        label: semestral.label,
        cycle_months: semestral.cycle_months,
        unit_price_monthly: Number(semestral.unit_price_monthly || 0),
        min_users: Number(semestral.min_users || 0),
        max_users: Number(semestral.max_users || 0),
        active: !!semestral.active,
      }),
      adminService.upsertSitePlanPricing({
        plan_code: anual.plan_code,
        label: anual.label,
        cycle_months: anual.cycle_months,
        unit_price_monthly: Number(anual.unit_price_monthly || 0),
        min_users: Number(anual.min_users || 0),
        max_users: Number(anual.max_users || 0),
        active: !!anual.active,
      }),
    ]);
    setSaving(false);

    if (!saveSemestral || !saveAnual) {
      toast.error('Não foi possível salvar todos os planos.');
      return;
    }

      toast.success('Preços atualizados com sucesso.');
    await loadPlans();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Preços de Assinatura"
          subtitle="Fonte de verdade para os ciclos semestral e anual."
        />

        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row gap-2">
            <Pressable className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card" onPress={() => void loadPlans()}>
              <RefreshCw size={14} color="#9CA3AF" />
              <Text className="text-sm font-medium text-text-secondary">Recarregar</Text>
            </Pressable>
            <Pressable className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#FF6B35]" onPress={() => void handleSave()} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={14} color="#FFFFFF" />}
              <Text className="text-sm font-semibold text-white">Salvar Preços</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color="#FF6B35" />
            <Text className="mt-2 text-center text-sm text-text-muted">Carregando planos...</Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan.id} className="rounded-2xl border border-border bg-surface p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-semibold text-white">{plan.plan_code === 'semestral' ? 'Semestral' : 'Anual'}</Text>
                  <Text className="text-xs text-text-muted">Ciclo de {plan.cycle_months} meses com faixas por usuário</Text>
                </View>
                <View className="items-center">
                  <Switch
                    value={plan.active}
                    onValueChange={(value) => updatePlan(plan.plan_code, 'active', value)}
                    trackColor={{ false: '#374151', true: '#FF6B35' }}
                  />
                  <Text className="mt-1 text-xs text-text-muted">{plan.active ? 'Ativo' : 'Inativo'}</Text>
                </View>
              </View>

              <Field label="Nome publico" value={plan.label} onChangeText={(value) => updatePlan(plan.plan_code, 'label', value)} />
              <Field
                    label="Preço mensal por usuário (R$)"
                value={`${plan.unit_price_monthly}`}
                keyboardType="numeric"
                onChangeText={(value) => updatePlan(plan.plan_code, 'unit_price_monthly', Number(value || 0))}
              />
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1">
                  <Field
                    label="Usuários mín."
                    value={`${plan.min_users}`}
                    keyboardType="numeric"
                    onChangeText={(value) => updatePlan(plan.plan_code, 'min_users', Number(value || 0))}
                  />
                </View>
                <View className="flex-1">
                  <Field
                    label="Usuários máx."
                    value={`${plan.max_users}`}
                    keyboardType="numeric"
                    onChangeText={(value) => updatePlan(plan.plan_code, 'max_users', Number(value || 0))}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View className="mt-3">
      <Text className="mb-2 text-xs text-text-secondary">{label}</Text>
      <TextInput
        className="h-12 rounded-lg border border-border bg-card px-3 text-white"
        value={value}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor="#6B7280"
      />
    </View>
  );
}

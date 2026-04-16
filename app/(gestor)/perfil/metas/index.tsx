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
import { periodicGoalsService, type PeriodicGoal } from '@/services/periodicGoalsService';
import { salesService } from '@/services/salesService';
import { usersService } from '@/services/usersService';
import { formatCurrency, parseCurrency } from '@/utils/masks';

type Seller = { id: string; full_name: string | null };

type SellerGoalState = {
  meta1: string;
  meta2: string;
  supermeta: string;
  saving: boolean;
};

function getDaysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getPreviousMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

export default function GoalsConfigPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToastContext();

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [monthValue, setMonthValue] = useState(monthOptions[0]?.value || '');

  // Metas da empresa
  const [meta1, setMeta1] = useState('');
  const [meta2, setMeta2] = useState('');
  const [supermeta, setSupermeta] = useState('');
  const [realizadoAnterior, setRealizadoAnterior] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Metas por vendedor
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerGoals, setSellerGoals] = useState<Record<string, SellerGoalState>>({});
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);

  const companyId = user?.company_id;
  const daysInMonth = getDaysInMonth(monthValue);

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

  const loadSellerGoals = async () => {
    if (!companyId) return;
    setLoadingSellers(true);
    try {
      const fetchedSellers = await usersService.getSellersByCompany(companyId);
      const sellerList = fetchedSellers as Seller[];
      setSellers(sellerList);

      const ids = sellerList.map((s) => s.id);
      const goalsMap = await periodicGoalsService.getGoalsBySellerIds(ids, monthValue);

      const initialState: Record<string, SellerGoalState> = {};
      sellerList.forEach((s) => {
        const g: PeriodicGoal | undefined = goalsMap.get(s.id);
        initialState[s.id] = {
          meta1: g?.meta1 ? formatCurrency(g.meta1) : '',
          meta2: g?.meta2 ? formatCurrency(g.meta2) : '',
          supermeta: g?.supermeta ? formatCurrency(g.supermeta) : '',
          saving: false,
        };
      });
      setSellerGoals(initialState);
    } finally {
      setLoadingSellers(false);
    }
  };

  useEffect(() => {
    void loadGoal();
    void loadSellerGoals();
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
      toast.success('Metas da empresa salvas!');
      await loadGoal();
    } finally {
      setSaving(false);
    }
  };

  const updateSellerField = (sellerId: string, field: keyof Omit<SellerGoalState, 'saving'>, value: string) => {
    setSellerGoals((prev) => ({
      ...prev,
      [sellerId]: { ...prev[sellerId], [field]: value },
    }));
  };

  /**
   * Calcula sugestão de metas baseada no histórico real do vendedor (mês anterior).
   * - Se há histórico (>0): meta1 = realizado × 1.15, meta2 = × 1.20, supermeta = × 1.25
   * - Se não há histórico: usa Meta 1 atual e aplica ×1.2 / ×1.5 (fallback)
   * Retorna true se aplicou sugestão (por histórico ou fallback), false se nem isso foi possível.
   */
  const applySellerSuggestion = async (sellerId: string): Promise<boolean> => {
    const prevMonth = getPreviousMonth(monthValue);
    const totalPrev = await salesService.getSalesBySellerMonth(sellerId, prevMonth);

    if (totalPrev > 0) {
      setSellerGoals((prev) => ({
        ...prev,
        [sellerId]: {
          ...prev[sellerId],
          meta1: formatCurrency((totalPrev * 1.15).toFixed(2)),
          meta2: formatCurrency((totalPrev * 1.2).toFixed(2)),
          supermeta: formatCurrency((totalPrev * 1.25).toFixed(2)),
        },
      }));
      return true;
    }

    // Fallback: baseado na Meta 1 atual
    const m1 = parseCurrency(sellerGoals[sellerId]?.meta1 || '');
    if (m1 <= 0) return false;

    setSellerGoals((prev) => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        meta2: formatCurrency((m1 * 1.2).toFixed(2)),
        supermeta: formatCurrency((m1 * 1.5).toFixed(2)),
      },
    }));
    return true;
  };

  const handleApplySellerSuggestion = async (sellerId: string) => {
    const applied = await applySellerSuggestion(sellerId);
    if (!applied) {
      toast.error('Sem histórico e sem Meta 1 definida. Informe a Meta 1 ou use outro mês.');
    }
  };

  const applyAllSellerSuggestions = async () => {
    if (sellers.length === 0) return;
    setApplyingAll(true);
    try {
      const results = await Promise.all(sellers.map((s) => applySellerSuggestion(s.id)));
      const appliedCount = results.filter(Boolean).length;
      if (appliedCount === 0) {
        toast.error('Nenhum vendedor possui histórico ou Meta 1 definida.');
      } else if (appliedCount < sellers.length) {
        toast.success(`Sugestão aplicada a ${appliedCount}/${sellers.length} vendedores.`);
      } else {
        toast.success('Sugestão aplicada a todos os vendedores!');
      }
    } finally {
      setApplyingAll(false);
    }
  };

  const saveSellerGoal = async (sellerId: string) => {
    const state = sellerGoals[sellerId];
    if (!state) return;
    const m1 = parseCurrency(state.meta1);
    if (m1 <= 0) {
      toast.error('A Meta 1 deve ser maior que zero.');
      return;
    }
    setSellerGoals((prev) => ({ ...prev, [sellerId]: { ...prev[sellerId], saving: true } }));
    try {
      const m2 = Math.max(parseCurrency(state.meta2), m1);
      const sm = Math.max(parseCurrency(state.supermeta), m2);
      const result = await periodicGoalsService.upsertMeta({
        user_id: sellerId,
        mes_ref: monthValue,
        meta1: m1,
        meta2: m2,
        supermeta: sm,
        daily_meta1: Math.round(m1 / daysInMonth),
        daily_meta2: Math.round(m2 / daysInMonth),
        daily_supermeta: Math.round(sm / daysInMonth),
      });
      if (!result) {
        toast.error('Erro ao salvar meta do vendedor.');
        return;
      }
      toast.success('Meta salva!');
    } finally {
      setSellerGoals((prev) => ({ ...prev, [sellerId]: { ...prev[sellerId], saving: false } }));
    }
  };

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-lg font-semibold text-white">Sem empresa vinculada</Text>
        <Text className="mt-2 text-center text-text-muted">Vincule uma empresa ao usuário para configurar metas.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(gestor)/perfil')}
          title="Configuração de Metas"
          subtitle="Defina metas da empresa e por vendedor para acompanhar performance mensal."
        />

        {/* Mês de referência */}
        <SubmenuActionsCard>
          <Select label="Mês de referência" value={monthValue} options={monthOptions} onValueChange={setMonthValue} />
        </SubmenuActionsCard>

        {/* Metas da empresa */}
        <SubmenuActionsCard>
          <Text className="mb-3 text-base font-semibold text-white">Metas da Empresa</Text>

          {loading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text className="text-sm text-text-muted">Carregando metas...</Text>
            </View>
          ) : (
            <View className="gap-3">
              <CurrencyField label="Meta principal" value={meta1} onChange={setMeta1} />
              <CurrencyField label="Meta 2" value={meta2} onChange={setMeta2} />
              <CurrencyField label="Supermeta" value={supermeta} onChange={setSupermeta} />
              <CurrencyField label="Realizado anterior" value={realizadoAnterior} onChange={setRealizadoAnterior} />

              <Button variant="outline" className="h-12 rounded-xl" onPress={applySuggestions}>
                Aplicar sugestões automáticas
              </Button>
              <Button className="h-12 rounded-xl" onPress={() => void saveGoal()} loading={saving}>
                Salvar metas da empresa
              </Button>
            </View>
          )}
        </SubmenuActionsCard>

        {/* Metas por vendedor */}
        <SubmenuActionsCard>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">Metas por Vendedor</Text>
          </View>
          <Text className="mb-3 text-xs text-text-muted">
            Metas individuais para {monthOptions.find((o) => o.value === monthValue)?.label} ({daysInMonth} dias).
            {'\n'}
            Sugestão automática calcula +15/20/25% do realizado no mês anterior ({getPreviousMonth(monthValue)}).
          </Text>

          {loadingSellers ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text className="text-sm text-text-muted">Carregando vendedores...</Text>
            </View>
          ) : sellers.length === 0 ? (
            <Text className="text-sm text-text-muted">Nenhum vendedor cadastrado nesta empresa.</Text>
          ) : (
            <View className="gap-4">
              <Button
                variant="outline"
                className="h-12 rounded-xl"
                loading={applyingAll}
                onPress={() => void applyAllSellerSuggestions()}
              >
                Sugestão automática (todos)
              </Button>

              {sellers.map((seller) => {
                const sg = sellerGoals[seller.id];
                if (!sg) return null;
                const m1Parsed = parseCurrency(sg.meta1);
                const dailyMeta1 = m1Parsed > 0 ? Math.round(m1Parsed / daysInMonth) : 0;

                return (
                  <View key={seller.id} className="rounded-xl border border-border bg-card p-4">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-white">
                        {seller.full_name || 'Vendedor'}
                      </Text>
                      {dailyMeta1 > 0 ? (
                        <Text className="text-xs text-text-muted">
                          Meta/dia: {dailyMeta1.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </Text>
                      ) : null}
                    </View>

                    <View className="gap-2">
                      <CurrencyField
                        label="Meta 1"
                        value={sg.meta1}
                        onChange={(v) => updateSellerField(seller.id, 'meta1', v)}
                      />
                      <CurrencyField
                        label="Meta 2"
                        value={sg.meta2}
                        onChange={(v) => updateSellerField(seller.id, 'meta2', v)}
                      />
                      <CurrencyField
                        label="Supermeta"
                        value={sg.supermeta}
                        onChange={(v) => updateSellerField(seller.id, 'supermeta', v)}
                      />
                    </View>

                    <View className="mt-3 flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl"
                        onPress={() => void handleApplySellerSuggestion(seller.id)}
                      >
                        Sugestão
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl"
                        loading={sg.saving}
                        onPress={() => void saveSellerGoal(seller.id)}
                      >
                        Salvar
                      </Button>
                    </View>
                  </View>
                );
              })}
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
      <Text className="mb-2 text-sm text-text-secondary">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(formatCurrency(text))}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor="#6B7280"
        className="h-12 rounded-xl border border-border bg-surface px-3 text-base text-white"
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

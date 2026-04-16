import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, DollarSign, Edit2, Trash2, TrendingUp, Users } from 'lucide-react-native';
import { ActivityIndicator, Animated, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { DeleteSaleConfirmModal } from '@/components/sales/DeleteSaleConfirmModal';
import { EditSaleModal } from '@/components/sales/EditSaleModal';
import { SalesLaunch } from '@/components/sales/SalesLaunch';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useEntranceAnimation } from '@/components/ui/useEntranceAnimation';
import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { goalsService } from '@/services/goalsService';
import { salesService, type Sale, type SalesSummary } from '@/services/salesService';
import { settingsService } from '@/services/settingsService';
import { usersService } from '@/services/usersService';
import { getPeriodicGoalsMapWithBackfill, resolveSellerGoals } from '@/utils/periodicGoals';
import { getBrazilDateString, getDaysInMonthFor, getRetroactiveStartDate } from '@/utils/dateUtils';

interface Seller {
  id: string;
  name: string;
  individualGoal: number;
  dailyGoal: number;
}

interface UiSale {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  shift: 'morning' | 'afternoon' | 'evening';
  timestamp: string;
  rawSale: Sale;
}

interface SellerRow {
  type: 'seller';
  key: string;
  seller: Seller;
  sellerTotal: number;
  sellerCount: number;
  sellerDailyGoal: number;
  sellerProgress: number;
  isExpanded: boolean;
  salesCount: number;
}

interface SaleRow {
  type: 'sale';
  key: string;
  sale: UiSale;
}

type SalesListRow = SellerRow | SaleRow;

export function GestorSales() {
  const { user } = useAuth();
  const toast = useToastContext();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesShift, setSalesShift] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [selectedDate, setSelectedDate] = useState(getBrazilDateString());
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);
  const [dailySales, setDailySales] = useState<UiSale[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [salePendingDelete, setSalePendingDelete] = useState<Sale | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [retroactiveDaysLimit, setRetroactiveDaysLimit] = useState(30);
  const loadIdRef = useRef(0);

  // Resumo do mês (colapsável)
  const monthSummaryOptions = useMemo(() => buildMonthOptions(), []);
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [summaryMonth, setSummaryMonth] = useState(monthSummaryOptions[0]?.value || '');
  const [monthSummary, setMonthSummary] = useState<SalesSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const panelEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.sales,
    index: 0,
  });
  const ctaEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.sales,
    index: 1,
  });
  const tableEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.sales,
    index: 2,
  });
  const tipEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.sales,
    index: 3,
  });

  const companyId = user?.company_id;
  const today = getBrazilDateString();
  const minDate = getRetroactiveStartDate(retroactiveDaysLimit);

  const loadData = async () => {
    const loadId = ++loadIdRef.current;
    const isCurrentLoad = () => loadId === loadIdRef.current;

    if (!companyId) {
      if (isCurrentLoad()) setIsLoading(false);
      return;
    }

    if (isCurrentLoad()) setIsLoading(true);
    try {
      const monthKey = selectedDate.slice(0, 7);
      const [year, month] = monthKey.split('-').map(Number);
      const daysInMonth = getDaysInMonthFor(year, Math.max(0, month - 1));

      const [goalData, daysLimit] = await Promise.all([
        goalsService.getGoalByMonth(companyId, monthKey),
        settingsService.getRetroactiveDaysLimit(companyId),
      ]);
      if (!isCurrentLoad()) return;
      setMonthlyGoal(goalData?.meta1 || 0);
      setRetroactiveDaysLimit(daysLimit);

      const sellersData = await usersService.getSellersByCompany(companyId);
      const normalizedSellersData = Array.isArray(sellersData) ? sellersData : [];
      const periodicGoalsMap = await getPeriodicGoalsMapWithBackfill(normalizedSellersData, monthKey);
      if (!isCurrentLoad()) return;
      setSellers(
        normalizedSellersData.map((s) => {
          const resolvedGoals = resolveSellerGoals({
            seller: s,
            periodicGoal: periodicGoalsMap.get(s.id),
            companyGoal: goalData?.meta1 || 0,
            sellersCount: normalizedSellersData.length,
            daysInMonth,
          });

          return {
            id: s.id,
            name: s.full_name,
            individualGoal: resolvedGoals.individualGoal,
            dailyGoal: resolvedGoals.dailyGoal,
          };
        })
      );

      const salesData = await salesService.getSalesByDate(companyId, selectedDate);
      const normalizedSalesData = Array.isArray(salesData) ? salesData : [];
      const mapPeriodToShift = (period: string): 'morning' | 'afternoon' | 'evening' => {
        const p = period?.toLowerCase();
        if (p === 'morning' || p === 'manha') return 'morning';
        if (p === 'night' || p === 'evening' || p === 'noite') return 'evening';
        return 'afternoon';
      };

      if (!isCurrentLoad()) return;
      setDailySales(
        normalizedSalesData.map((s) => ({
          id: s.id,
          sellerId: s.seller_id,
          sellerName: s.seller?.full_name || 'Vendedor',
          amount: s.value,
          shift: mapPeriodToShift(s.period),
          timestamp: s.created_at,
          rawSale: s,
        }))
      );
    } finally {
      if (isCurrentLoad()) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    return () => {
      loadIdRef.current += 1;
    };
  }, [companyId, selectedDate]);

  useEffect(() => {
    if (!companyId || !showMonthSummary || !summaryMonth) return;
    let cancelled = false;
    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const data = await salesService.getMonthSummary(companyId, summaryMonth);
        if (!cancelled) setMonthSummary(data);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [companyId, showMonthSummary, summaryMonth]);

  const [selectedYear, selectedMonth] = selectedDate.slice(0, 7).split('-').map(Number);
  const daysInSelectedMonth = getDaysInMonthFor(selectedYear, Math.max(0, selectedMonth - 1));
  const dailyGoal = monthlyGoal > 0 ? Math.round((monthlyGoal / daysInSelectedMonth) * 100) / 100 : 0;
  const totalSalesAmount = dailySales.reduce((sum, s) => sum + s.amount, 0);
  const rawProgress = dailyGoal > 0 ? (totalSalesAmount / dailyGoal) * 100 : 0;
  const visualProgress = Math.min(rawProgress, 100);

  const salesBySeller = useMemo(() => {
    return dailySales.reduce((acc, sale) => {
      if (!acc[sale.sellerId]) {
        acc[sale.sellerId] = { name: sale.sellerName, total: 0, count: 0, sales: [] as UiSale[] };
      }
      acc[sale.sellerId].total += sale.amount;
      acc[sale.sellerId].count += 1;
      acc[sale.sellerId].sales.push(sale);
      return acc;
    }, {} as Record<string, { name: string; total: number; count: number; sales: UiSale[] }>);
  }, [dailySales]);

  const salesTeamForModal = sellers.map((s) => ({ id: s.id, name: s.name, goal: s.individualGoal }));

  const salesRows = useMemo<SalesListRow[]>(() => {
    if (dailySales.length === 0 || sellers.length === 0) {
      return [];
    }

    const rows: SalesListRow[] = [];

    sellers.forEach((seller) => {
      const data = salesBySeller[seller.id];
      const sellerTotal = data?.total || 0;
      const sellerCount = data?.count || 0;
      const sellerDailyGoal =
        seller.dailyGoal > 0
          ? seller.dailyGoal
          : seller.individualGoal > 0
            ? Math.round((seller.individualGoal / daysInSelectedMonth) * 100) / 100
            : 0;
      const sellerProgress = sellerDailyGoal > 0 ? Math.min((sellerTotal / sellerDailyGoal) * 100, 100) : 0;
      const isExpanded = expandedSeller === seller.id;

      rows.push({
        type: 'seller',
        key: `seller-${seller.id}`,
        seller,
        sellerTotal,
        sellerCount,
        sellerDailyGoal,
        sellerProgress,
        isExpanded,
        salesCount: data?.sales?.length || 0,
      });

      if (isExpanded && data?.sales?.length) {
        data.sales.forEach((sale) => {
          rows.push({
            type: 'sale',
            key: `sale-${seller.id}-${sale.id}`,
            sale,
          });
        });
      }
    });

    return rows;
  }, [dailySales.length, sellers, salesBySeller, daysInSelectedMonth, expandedSeller]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirmDeleteSale = async () => {
    if (!salePendingDelete || !user?.id) return;
    setIsDeletingSale(true);
    const success = await salesService.deleteSale(salePendingDelete.id, user.id);
    setIsDeletingSale(false);
    if (!success) {
      toast.error('Nao foi possivel excluir o lancamento.');
      return;
    }
    toast.success('Lancamento excluido com sucesso.');
    setSalePendingDelete(null);
    await loadData();
  };

  const formatSaleExtras = (sale: Sale) => {
    const extras: string[] = [];
    if (sale.client?.trim()) extras.push(`Cliente: ${sale.client.trim()}`);
    if (sale.product?.trim()) extras.push(`Produto: ${sale.product.trim()}`);
    if (sale.notes?.trim()) extras.push(`Descricao: ${sale.notes.trim()}`);
    return extras.join(' • ');
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text className="mt-2 text-sm text-text-muted">Carregando painel de vendas...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
    >
      {!companyId ? (
        <View className="rounded-xl border border-[#404040] bg-card p-6">
          <Text className="text-center text-lg text-white">Empresa nao vinculada</Text>
          <Text className="mt-2 text-center text-sm text-text-muted">Entre em contato com o administrador do sistema.</Text>
        </View>
      ) : (
        <>
          <Animated.View className="rounded-xl border border-[#404040] bg-card p-5" style={panelEntranceStyle}>
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-2xl font-semibold text-white">💰 Painel de Vendas</Text>
                <Text className="text-sm text-[#a3a3a3]">Acompanhe o desempenho da equipe em tempo real</Text>
              </View>
              <View className="w-[86px] flex-row items-start gap-1">
                <Users stroke="#a3a3a3" size={18} />
                <Text className="flex-1 text-xs leading-4 text-[#a3a3a3]">{sellers.length} vendedores ativos</Text>
              </View>
            </View>

            <Select
              label="Data de referencia do lancamento"
              value={selectedDate}
              options={buildDateOptions(minDate, today)}
              onValueChange={setSelectedDate}
            />
            <Text className="mt-1 text-xs text-[#737373]">
              Permitido lancar vendas de hoje e dos ultimos {retroactiveDaysLimit} {retroactiveDaysLimit === 1 ? 'dia' : 'dias'}.
            </Text>

            <View className="mt-4 rounded-xl border border-[#404040] bg-card-elevated p-4">
              <View className="mb-3 flex-row items-end justify-between">
                <View>
                  <Text className="text-xs text-text-muted">Meta da Empresa (Dia)</Text>
                  <Text className="text-xl font-bold text-white">
                    {dailyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-text-muted">Realizado</Text>
                  <Text className="text-xl font-bold text-[#FF6B35]">
                    {totalSalesAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
              </View>
              <View className="h-3 rounded-full bg-[#404040]">
                <View
                  className={`${rawProgress >= 100 ? 'bg-green-500' : 'bg-[#FF6B35]'} h-3 rounded-full`}
                  style={{ width: `${visualProgress}%` }}
                />
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-[#737373]">0%</Text>
                <Text className={`text-xs ${rawProgress >= 100 ? 'text-green-400' : 'text-[#a3a3a3]'}`}>
                  {rawProgress.toFixed(1)}% atingido
                </Text>
              </View>
            </View>
          </Animated.View>

          <View className="rounded-xl border border-[#404040] bg-card">
            <Pressable
              className="flex-row items-center justify-between p-4"
              onPress={() => setShowMonthSummary((prev) => !prev)}
            >
              <View className="flex-row items-center gap-2">
                <BarChart3 stroke="#FF6B35" size={18} />
                <Text className="text-base text-white">Resumo do Mês</Text>
              </View>
              {showMonthSummary ? (
                <ChevronUp stroke="#9CA3AF" size={18} />
              ) : (
                <ChevronDown stroke="#9CA3AF" size={18} />
              )}
            </Pressable>

            {showMonthSummary ? (
              <View className="gap-3 border-t border-[#404040] p-4">
                <Select
                  label="Mês"
                  value={summaryMonth}
                  options={monthSummaryOptions}
                  onValueChange={setSummaryMonth}
                />

                {summaryLoading ? (
                  <View className="flex-row items-center gap-2 py-3">
                    <ActivityIndicator size="small" color="#FF6B35" />
                    <Text className="text-sm text-text-muted">Carregando resumo...</Text>
                  </View>
                ) : !monthSummary || monthSummary.count === 0 ? (
                  <View className="items-center rounded-xl border border-[#404040] bg-card-elevated p-5">
                    <TrendingUp stroke="#6B7280" size={24} />
                    <Text className="mt-2 text-sm text-text-muted">Nenhuma venda no mês selecionado.</Text>
                  </View>
                ) : (
                  <>
                    <View className="rounded-xl border border-[#404040] bg-card-elevated p-4">
                      <Text className="text-xs text-text-muted">Total do mês</Text>
                      <Text className="text-2xl font-bold text-[#FF6B35]">
                        {monthSummary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Text>
                      <Text className="mt-1 text-xs text-text-muted">
                        {monthSummary.count} venda(s) • ticket médio {monthSummary.average.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Text>
                    </View>

                    <View className="rounded-xl border border-[#404040] bg-card-elevated p-4">
                      <Text className="mb-2 text-xs text-text-muted">Por período</Text>
                      {(['morning', 'noon', 'afternoon', 'night'] as const).map((p) => (
                        <View key={p} className="flex-row items-center justify-between py-1">
                          <Text className="text-sm text-text-secondary">{PERIOD_LABELS[p]}</Text>
                          <Text className="text-sm text-white">
                            {monthSummary.byPeriod[p].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View className="rounded-xl border border-[#404040] bg-card-elevated p-4">
                      <Text className="mb-2 text-xs text-text-muted">Ranking de vendedores</Text>
                      {[...monthSummary.bySeller]
                        .sort((a, b) => b.total - a.total)
                        .map((row, idx) => (
                          <View key={row.seller_id} className="flex-row items-center justify-between py-1.5">
                            <View className="flex-1 flex-row items-center gap-2">
                              <Text className="w-6 text-sm font-bold text-[#FF6B35]">#{idx + 1}</Text>
                              <Text className="flex-1 text-sm text-white" numberOfLines={1}>{row.seller_name}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-sm text-white">
                                {row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </Text>
                              <Text className="text-xs text-text-muted">{row.count} venda(s)</Text>
                            </View>
                          </View>
                        ))}
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>

          <Animated.View style={ctaEntranceStyle}>
            <Button
              className="h-14 rounded-2xl"
              onPress={() => {
                const h = new Date().getHours();
                setSalesShift(h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');
                setShowSalesModal(true);
              }}
            >
              $  Lancar Venda ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')})
            </Button>
          </Animated.View>

          <Animated.View className="rounded-xl border border-[#404040] bg-card p-4" style={tableEntranceStyle}>
            <View className="mb-3 flex-row items-center gap-2">
              <BarChart3 stroke="#FF6B35" size={18} />
              <Text className="text-base text-white">Vendas por Vendedor ({dailySales.length})</Text>
            </View>

            {sellers.length === 0 ? (
              <View className="items-center rounded-xl border border-[#404040] bg-card-elevated p-5">
                <Users stroke="#6B7280" size={28} />
                <Text className="mt-2 text-sm text-text-muted">Nenhum vendedor encontrado.</Text>
              </View>
            ) : null}

            {sellers.length > 0 && dailySales.length === 0 ? (
              <View className="items-center rounded-xl border border-[#404040] bg-card-elevated p-5">
                <TrendingUp stroke="#6B7280" size={28} />
                <Text className="mt-2 text-sm text-text-muted">
                  {selectedDate === today ? 'Nenhuma venda registrada hoje' : 'Nenhuma venda registrada na data selecionada'}
                </Text>
              </View>
            ) : null}

            {dailySales.length > 0 ? (
              <FlatList
                data={salesRows}
                keyExtractor={(item) => item.key}
                scrollEnabled={false}
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                renderItem={({ item }) => {
                  if (item.type === 'sale') {
                    const extras = formatSaleExtras(item.sale.rawSale);
                    return (
                      <View className="mb-2 ml-3 flex-row items-center justify-between rounded-lg bg-card p-2">
                        <View>
                          <Text className={`${item.sale.amount < 0 ? 'text-red-500' : 'text-white'}`}>
                            {item.sale.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </Text>
                          <Text className="text-xs text-text-muted">
                            {new Date(item.sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          {extras ? <Text className="mt-1 text-[11px] text-text-muted">{extras}</Text> : null}
                        </View>
                        <View className="flex-row gap-2">
                          <Pressable onPress={() => setEditingSale(item.sale.rawSale)}>
                            <Edit2 stroke="#60A5FA" size={16} />
                          </Pressable>
                          <Pressable onPress={() => setSalePendingDelete(item.sale.rawSale)}>
                            <Trash2 stroke="#F87171" size={16} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View className="mb-2 rounded-xl border border-[#404040] bg-card-elevated p-3">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-white">{item.seller.name}</Text>
                        <Text className={`text-xs ${item.sellerProgress >= 100 ? 'text-green-400' : 'text-[#a3a3a3]'}`}>
                          {item.sellerProgress.toFixed(0)}%
                        </Text>
                      </View>
                      <View className="mb-2 flex-row items-center gap-2">
                        <Text className="text-[#FF6B35]">{item.sellerTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                        <Text className="text-xs text-[#a3a3a3]">
                          / {item.sellerDailyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • {item.sellerCount} venda(s)
                        </Text>
                      </View>

                      <View className="h-2 rounded-full bg-[#404040]">
                        <View
                          className={`h-2 rounded-full ${item.sellerProgress >= 100 ? 'bg-green-500' : 'bg-[#FF6B35]'}`}
                          style={{ width: `${item.sellerProgress}%` }}
                        />
                      </View>

                      {item.salesCount > 0 ? (
                        <Pressable
                          className="mt-2 flex-row items-center justify-center gap-1 rounded-lg border border-[#404040] bg-card py-2"
                          onPress={() => setExpandedSeller(item.isExpanded ? null : item.seller.id)}
                        >
                          {item.isExpanded ? <ChevronUp stroke="#9CA3AF" size={14} /> : <ChevronDown stroke="#9CA3AF" size={14} />}
                          <Text className="text-xs text-[#a3a3a3]">
                            {item.isExpanded ? 'Ocultar vendas' : `Ver vendas (${item.salesCount})`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                }}
              />
            ) : null}
          </Animated.View>

          <Animated.View className="rounded-lg border border-[#404040] bg-card p-3" style={tipEntranceStyle}>
            <Text className="text-xs text-text-muted">
              💡 Dica: Lance as vendas de cada vendedor ao final de cada turno para manter o painel atualizado em tempo real.
            </Text>
          </Animated.View>
        </>
      )}

      <SalesLaunch
        isOpen={showSalesModal}
        onClose={() => {
          setShowSalesModal(false);
          void loadData();
        }}
        salesTeam={salesTeamForModal}
        shift={salesShift}
        currentUserId={user?.id}
        companyId={companyId || undefined}
        referenceDate={selectedDate}
        retroactiveDaysLimit={retroactiveDaysLimit}
      />

      {editingSale ? (
        <EditSaleModal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
          userId={user?.id || ''}
          onSaved={() => {
            void loadData();
            setEditingSale(null);
          }}
        />
      ) : null}

      <DeleteSaleConfirmModal
        isOpen={!!salePendingDelete}
        sellerName={salePendingDelete?.seller?.full_name || 'Vendedor'}
        saleAmount={salePendingDelete?.value || 0}
        onClose={() => {
          if (!isDeletingSale) setSalePendingDelete(null);
        }}
        onConfirm={() => void handleConfirmDeleteSale()}
        isLoading={isDeletingSale}
      />
    </ScrollView>
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

const PERIOD_LABELS: Record<'morning' | 'noon' | 'afternoon' | 'night', string> = {
  morning: 'Manhã',
  noon: 'Almoço',
  afternoon: 'Tarde',
  night: 'Noite',
};

function buildDateOptions(minDate: string, maxDate: string) {
  const options: Array<{ label: string; value: string }> = [];
  const start = new Date(`${minDate}T00:00:00`);
  const end = new Date(`${maxDate}T00:00:00`);

  for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    options.push({ label: d.toLocaleDateString('pt-BR'), value: iso });
  }

  return options;
}

import { useEffect, useRef, useState } from 'react';
import { BarChart3, CalendarDays, Edit2, Trash2, TrendingUp, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeleteSaleConfirmModal } from '@/components/sales/DeleteSaleConfirmModal';
import { EditSaleModal } from '@/components/sales/EditSaleModal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useEntranceAnimation } from '@/components/ui/useEntranceAnimation';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { periodicGoalsService } from '@/services/periodicGoalsService';
import { salesService, type Sale } from '@/services/salesService';
import { settingsService } from '@/services/settingsService';
import { usersService } from '@/services/usersService';
import { hasValidGoal } from '@/utils/goalUtils';
import { resolveSellerGoals } from '@/utils/periodicGoals';
import { getBrazilDateString, getDaysInMonthFor, getRetroactiveStartDate } from '@/utils/dateUtils';
import { formatCurrency, parseCurrency } from '@/utils/masks';

type Shift = 'morning' | 'noon' | 'afternoon' | 'night';

export function VendedorSales() {
  const { user } = useAuth();
  const toast = useToastContext();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getBrazilDateString());
  const [sales, setSales] = useState<Sale[]>([]);
  const [monthSalesTotal, setMonthSalesTotal] = useState(0);
  const [monthSalesCount, setMonthSalesCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);

  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [salePendingDelete, setSalePendingDelete] = useState<Sale | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [retroactiveDaysLimit, setRetroactiveDaysLimit] = useState(30);
  const loadIdRef = useRef(0);

  const panelStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.sales, index: 0 });
  const actionStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.sales, index: 1 });
  const listStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.sales, index: 2 });

  const companyId = user?.company_id;
  const userId = user?.id || '';
  const today = getBrazilDateString();
  const minDate = getRetroactiveStartDate(retroactiveDaysLimit);

  const loadData = async () => {
    const loadId = ++loadIdRef.current;
    const isCurrentLoad = () => loadId === loadIdRef.current;

    if (!companyId || !userId) {
      if (isCurrentLoad()) setIsLoading(false);
      return;
    }

    if (isCurrentLoad()) setIsLoading(true);
    try {
      const monthKey = selectedDate.slice(0, 7);
      const [year, month] = monthKey.split('-').map(Number);
      const daysInMonth = getDaysInMonthFor(year, Math.max(0, month - 1));

      const [userRow, daySalesAll, monthSalesAll, daysLimit] = await Promise.all([
        usersService.getUserById(userId),
        salesService.getSalesByDate(companyId, selectedDate),
        salesService.getMonthSales(companyId, monthKey),
        settingsService.getRetroactiveDaysLimit(companyId),
      ]);
      if (!isCurrentLoad()) return;
      setRetroactiveDaysLimit(daysLimit);

      const normalizedDaySales = Array.isArray(daySalesAll) ? daySalesAll : [];
      const normalizedMonthSales = Array.isArray(monthSalesAll) ? monthSalesAll : [];
      const mineDay = normalizedDaySales.filter((sale) => sale.seller_id === userId);
      const mineMonth = normalizedMonthSales.filter((sale) => sale.seller_id === userId);

      if (!isCurrentLoad()) return;
      setSales(mineDay);
      setMonthSalesTotal(mineMonth.reduce((acc, sale) => acc + sale.value, 0));
      setMonthSalesCount(mineMonth.length);

      const periodicGoal = await periodicGoalsService.getMetaPorPeriodo(userId, monthKey);
      const effectivePeriodicGoal =
        periodicGoal ||
        (hasValidGoal(userRow?.individual_goal)
          ? await periodicGoalsService.upsertMeta(userId, monthKey, Number(userRow?.individual_goal || 0))
          : null);

      const resolvedGoals = resolveSellerGoals({
        seller: userRow || { id: userId },
        periodicGoal: effectivePeriodicGoal || undefined,
        daysInMonth,
      });

      if (isCurrentLoad()) setDailyGoal(resolvedGoals.dailyGoal);
    } finally {
      if (isCurrentLoad()) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    return () => {
      loadIdRef.current += 1;
    };
  }, [companyId, userId, selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const dayTotal = sales.reduce((sum, sale) => sum + sale.value, 0);
  const dayCount = sales.length;
  const ticketMedio = dayCount > 0 ? dayTotal / dayCount : 0;
  const progressRaw = dailyGoal > 0 ? (dayTotal / dailyGoal) * 100 : 0;
  const progressVisual = Math.min(progressRaw, 100);

  const handleDeleteSale = async () => {
    if (!salePendingDelete || !userId) return;
    setIsDeletingSale(true);
    const success = await salesService.deleteSale(salePendingDelete.id, userId);
    setIsDeletingSale(false);
    if (!success) {
      toast.error('Não foi possível excluir o lançamento.');
      return;
    }
    toast.success('Lançamento excluído com sucesso.');
    setSalePendingDelete(null);
    await loadData();
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text className="mt-2 text-sm text-[#9CA3AF]">Carregando suas vendas...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
    >
      {!companyId ? (
        <View className="rounded-xl border border-[#404040] bg-[#1a1a1a] p-6">
          <Text className="text-center text-lg text-white">Empresa não vinculada</Text>
          <Text className="mt-2 text-center text-sm text-[#9CA3AF]">Entre em contato com o administrador.</Text>
        </View>
      ) : (
        <>
          <Animated.View className="rounded-xl border border-[#404040] bg-[#1a1a1a] p-5" style={panelStyle}>
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-2xl font-semibold text-white">💰 Minhas Vendas</Text>
                <Text className="text-sm text-[#a3a3a3]">Acompanhe seu desempenho diário e mensal</Text>
              </View>
              <CalendarDays stroke="#a3a3a3" size={18} />
            </View>

            <Select
              label="Data de referência"
              value={selectedDate}
              options={buildDateOptions(minDate, today)}
              onValueChange={setSelectedDate}
            />
            <Text className="mt-1 text-xs text-[#737373]">
              Permitido lançar vendas de hoje e dos últimos {retroactiveDaysLimit} {retroactiveDaysLimit === 1 ? 'dia' : 'dias'}.
            </Text>

            <View className="mt-4 rounded-xl border border-[#404040] bg-[#262626] p-4">
              <View className="mb-3 flex-row items-end justify-between">
                <View>
                  <Text className="text-xs text-[#9CA3AF]">Meta diária</Text>
                  <Text className="text-xl font-bold text-white">{toBRL(dailyGoal)}</Text>
                </View>
                <View>
                  <Text className="text-xs text-[#9CA3AF]">Realizado no dia</Text>
                  <Text className="text-xl font-bold text-[#FF6B35]">{toBRL(dayTotal)}</Text>
                </View>
              </View>

              <View className="h-3 rounded-full bg-[#404040]">
                <View
                  className={`${progressRaw >= 100 ? 'bg-green-500' : 'bg-[#FF6B35]'} h-3 rounded-full`}
                  style={{ width: `${progressVisual}%` }}
                />
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-[#737373]">0%</Text>
                <Text className={`text-xs ${progressRaw >= 100 ? 'text-green-400' : 'text-[#a3a3a3]'}`}>
                  {progressRaw.toFixed(1)}% atingido
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row gap-2">
              <MiniMetric label="Lançamentos" value={`${dayCount}`} />
              <MiniMetric label="Ticket médio" value={toBRL(ticketMedio)} />
              <MiniMetric label="Total mês" value={toBRL(monthSalesTotal)} />
            </View>
          </Animated.View>

          <Animated.View style={actionStyle}>
            <Button className="h-14 rounded-2xl" onPress={() => setShowLaunchModal(true)}>
              + Lançar venda ({new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')})
            </Button>
          </Animated.View>

          <Animated.View className="rounded-xl border border-[#404040] bg-[#1a1a1a] p-4" style={listStyle}>
            <View className="mb-3 flex-row items-center gap-2">
              <BarChart3 stroke="#FF6B35" size={18} />
              <Text className="text-base text-white">Lançamentos do dia ({dayCount})</Text>
            </View>

            {sales.length === 0 ? (
              <View className="items-center rounded-xl border border-[#404040] bg-[#262626] p-5">
                <TrendingUp stroke="#6B7280" size={28} />
                <Text className="mt-2 text-sm text-[#9CA3AF]">
                  {selectedDate === today ? 'Nenhuma venda registrada hoje' : 'Nenhuma venda registrada na data selecionada'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={sales}
                keyExtractor={(sale) => sale.id}
                scrollEnabled={false}
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                ItemSeparatorComponent={() => <View className="h-2" />}
                renderItem={({ item: sale }) => (
                  <View className="rounded-lg border border-[#404040] bg-[#262626] p-3">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className={`${sale.value < 0 ? 'text-red-500' : 'text-white'} text-base font-semibold`}>
                          {toBRL(sale.value)}
                        </Text>
                        <Text className="text-xs text-[#9CA3AF]">
                          {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {shiftLabel(sale.period as Shift)}
                        </Text>
                        {sale.client ? <Text className="mt-1 text-xs text-[#9CA3AF]">Cliente: {sale.client}</Text> : null}
                        {sale.product ? <Text className="text-xs text-[#9CA3AF]">Produto: {sale.product}</Text> : null}
                        {sale.notes ? <Text className="text-xs text-[#9CA3AF]">Obs: {sale.notes}</Text> : null}
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable onPress={() => setEditingSale(sale)}>
                          <Edit2 stroke="#60A5FA" size={16} />
                        </Pressable>
                        <Pressable onPress={() => setSalePendingDelete(sale)}>
                          <Trash2 stroke="#F87171" size={16} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </Animated.View>
        </>
      )}

      <VendedorLaunchSaleModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        companyId={companyId || ''}
        sellerId={userId}
        referenceDate={selectedDate}
        retroactiveDaysLimit={retroactiveDaysLimit}
        onSaved={() => {
          setShowLaunchModal(false);
          void loadData();
        }}
      />

      {editingSale ? (
        <EditSaleModal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
          userId={userId}
          onSaved={() => {
            setEditingSale(null);
            void loadData();
          }}
        />
      ) : null}

      <DeleteSaleConfirmModal
        isOpen={!!salePendingDelete}
        sellerName={user?.name || 'Vendedor'}
        saleAmount={salePendingDelete?.value || 0}
        onClose={() => {
          if (!isDeletingSale) setSalePendingDelete(null);
        }}
        onConfirm={() => void handleDeleteSale()}
        isLoading={isDeletingSale}
      />
    </ScrollView>
  );
}

function VendedorLaunchSaleModal({
  isOpen,
  onClose,
  companyId,
  sellerId,
  referenceDate,
  retroactiveDaysLimit = 30,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  sellerId: string;
  referenceDate: string;
  retroactiveDaysLimit?: number;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToastContext();

  const [saleDate, setSaleDate] = useState(referenceDate);
  const [shift, setShift] = useState<Shift>('afternoon');
  const [amount, setAmount] = useState('');
  const [client, setClient] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );

  useEffect(() => {
    if (!isOpen) return;
    setSaleDate(referenceDate);
  }, [isOpen, referenceDate]);

  if (!shouldRender) return null;

  const today = getBrazilDateString();
  const minDate = getRetroactiveStartDate(retroactiveDaysLimit);

  const canSave = parseCurrency(amount) !== 0;

  const saveSale = async () => {
    const value = parseCurrency(amount);
    if (value === 0) {
      toast.error('Informe um valor diferente de zero.');
      return;
    }

    setSaving(true);
    let created;
    try {
      created = await salesService.createSale({
        company_id: companyId,
        seller_id: sellerId,
        created_by: sellerId,
        period: shift,
        value,
        client: client.trim() || undefined,
        product: product.trim() || undefined,
        notes: notes.trim() || undefined,
        sale_date: saleDate,
      });
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a venda.');
      return;
    }
    setSaving(false);

    if (!created) {
      toast.error('Não foi possível salvar a venda.');
      return;
    }

    toast.success('Venda lançada com sucesso!');
    setAmount('');
    setClient('');
    setProduct('');
    setNotes('');
    onSaved();
  };

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Lançar venda</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            <Select
              label="Data de referência"
              value={saleDate}
              options={buildDateOptions(minDate, today)}
              onValueChange={setSaleDate}
            />

            <Select
              label="Turno"
              value={shift}
              options={[
                { label: '🌅 Manhã', value: 'morning' },
                { label: '☀️ Meio-dia', value: 'noon' },
                { label: '🌤️ Tarde', value: 'afternoon' },
                { label: '🌙 Noite', value: 'night' },
              ]}
              onValueChange={(value) => setShift(value as Shift)}
            />

            <Field label="Valor da venda *">
              <TextInput
                value={amount}
                onChangeText={(text) => setAmount(formatCurrency(text))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#6B7280"
                className="h-12 rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
              />
            </Field>

            <Field label="Cliente">
              <TextInput
                value={client}
                onChangeText={setClient}
                placeholder="Nome do cliente"
                placeholderTextColor="#6B7280"
                className="h-12 rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
              />
            </Field>

            <Field label="Produto">
              <TextInput
                value={product}
                onChangeText={setProduct}
                placeholder="Produto vendido"
                placeholderTextColor="#6B7280"
                className="h-12 rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
              />
            </Field>

            <Field label="Observações">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Observações adicionais"
                placeholderTextColor="#6B7280"
                className="min-h-[100px] rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-3 text-white"
              />
            </Field>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button className="h-12 rounded-xl" onPress={saveSale} loading={saving} disabled={!canSave}>
                  Salvar venda
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="outline" className="h-12 rounded-xl" onPress={onClose}>
                  Cancelar
                </Button>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-2 text-sm text-[#D1D5DB]">{label}</Text>
      {children}
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-lg bg-[#1A1A1A] px-2 py-2">
      <Text className="text-[11px] text-[#9CA3AF]" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-1 text-xs font-semibold text-white" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
    </View>
  );
}

function shiftLabel(shift: Shift) {
  if (shift === 'morning') return 'Manhã';
  if (shift === 'noon') return 'Meio-dia';
  if (shift === 'afternoon') return 'Tarde';
  return 'Noite';
}

function toBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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

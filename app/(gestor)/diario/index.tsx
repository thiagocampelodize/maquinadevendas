import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  ClipboardList,
  MessageCircle,
  X,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useEntranceAnimation } from '@/components/ui/useEntranceAnimation';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { calculateLinearProjection } from '@/domain/forecast/forecastCalculator';
import { checklistService } from '@/services/checklistService';
import { goalsService } from '@/services/goalsService';
import { salesService, type Sale } from '@/services/salesService';
import {
  sellerDailyObservationsService,
  type SellerDailyObservation,
} from '@/services/sellerDailyObservationsService';
import { usersService } from '@/services/usersService';
import { formatMonthToYYYYMM, getDaysInMonthFor } from '@/utils/dateUtils';

type ViewFilter = 'all' | 'mine';
type ObservationType = 'observation' | 'feedback';
type DayMood = 'great' | 'good' | 'regular' | 'bad';

interface DiaryObservation {
  id: string;
  date: string;
  sellerId: string;
  sellerName: string;
  authorId: string;
  authorName: string;
  type: ObservationType;
  text: string;
  createdAt: string;
}

interface DayMetrics {
  totalSales: number;
  metGoal: boolean;
  routineOk: boolean;
  observationCount: number;
  sellerObservationCount: number;
  hasNoteWithoutSales: boolean;
}

const WORKING_DAYS = 22;

let diarySessionViewFilter: ViewFilter = 'all';

const mapObservationRow = (
  row: SellerDailyObservation,
  sellers: Array<{ id: string; full_name: string }>,
): DiaryObservation => ({
  id: row.id,
  date: row.reference_date,
  sellerId: row.seller_id,
  sellerName:
    row.seller?.full_name ||
    sellers.find((seller) => seller.id === row.seller_id)?.full_name ||
    'Vendedor',
  authorId: row.created_by,
  authorName: row.creator?.full_name || 'Gestor',
  type: row.observation_type === 'FEEDBACK' ? 'feedback' : 'observation',
  text: row.content,
  createdAt: row.created_at,
});

export default function GestorDiaryPage() {
  const { user } = useAuth();
  const toast = useToastContext();

  const now = new Date();
  const [monthDate, setMonthDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [viewFilter, setViewFilter] = useState<ViewFilter>(diarySessionViewFilter);
  const [selectedSellerId, setSelectedSellerId] = useState('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | ObservationType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [monthSales, setMonthSales] = useState<Sale[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [routineByDate, setRoutineByDate] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState<DiaryObservation[]>([]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDayListModalOpen, setIsDayListModalOpen] = useState(false);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);

  const [registerDate, setRegisterDate] = useState('');
  const [registerMood, setRegisterMood] = useState<DayMood>('good');
  const [registerNotes, setRegisterNotes] = useState('');

  const [detailSellerId, setDetailSellerId] = useState('all');
  const [detailNoteText, setDetailNoteText] = useState('');
  const [detailType, setDetailType] = useState<ObservationType>('observation');

  const sectionOneStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 0 });
  const sectionTwoStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 1 });
  const sectionThreeStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 2 });
  const sectionFourStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 3 });

  const companyId = user?.company_id;
  const userId = user?.id || '';
  const monthKey = formatMonthToYYYYMM(monthDate);
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const daysInMonth = getDaysInMonthFor(year, monthIndex);
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
  const selectedDateISO = `${monthKey}-${String(Math.min(selectedDay, daysInMonth)).padStart(2, '0')}`;

  const loadObservations = async (sellerRows: Array<{ id: string; full_name: string }>) => {
    if (!companyId) {
      setObservations([]);
      return;
    }

    const rows = await sellerDailyObservationsService.getByCompanyAndPeriod(
      companyId,
      monthStart,
      monthEnd,
    );
    setObservations(rows.map((row) => mapObservationRow(row, sellerRows)));
  };

  const loadData = async () => {
    if (!companyId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [sellerRows, goal, salesRows, periodProgress] = await Promise.all([
        usersService.getSellersByCompany(companyId),
        goalsService.getGoalByMonth(companyId, monthKey),
        salesService.getMonthSales(companyId, monthKey),
        checklistService.getPeriodProgress(userId, companyId, monthStart, monthEnd, 'omc'),
      ]);

      setSellers(sellerRows || []);
      setMonthlyGoal(goal?.meta1 || 0);
      setMonthSales(salesRows || []);

      const routineAccumulator = new Map<string, { completed: number; total: number }>();
      periodProgress.forEach((row) => {
        const current = routineAccumulator.get(row.date) || { completed: 0, total: 0 };
        current.completed += row.completed;
        current.total += row.total;
        routineAccumulator.set(row.date, current);
      });

      const routineMap: Record<string, boolean> = {};
      routineAccumulator.forEach((value, date) => {
        routineMap[date] = value.total > 0 && value.completed >= value.total;
      });
      setRoutineByDate(routineMap);

       await loadObservations(sellerRows || []);
     } catch {
      toast.error('Não foi possível carregar os dados do diário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [companyId, monthEnd, monthKey, monthStart, userId]);

  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  const sellerOptions = useMemo(
    () => [
      { label: 'Selecionar vendedor...', value: 'all' },
      ...sellers.map((s) => ({ label: s.full_name, value: s.id })),
    ],
    [sellers]
  );

  const filteredSales = useMemo(() => {
    if (viewFilter === 'mine') {
      return monthSales.filter((sale) => sale.seller_id === userId);
    }
    if (selectedSellerId === 'all') return monthSales;
    return monthSales.filter((sale) => sale.seller_id === selectedSellerId);
  }, [monthSales, selectedSellerId, userId, viewFilter]);

  const filteredObservations = useMemo(() => {
    return observations
      .filter((item) => {
        if (viewFilter === 'mine' && item.authorId !== userId) return false;
        if (selectedSellerId !== 'all' && item.sellerId !== selectedSellerId) return false;
        if (historyTypeFilter !== 'all' && item.type !== historyTypeFilter) return false;
        return true;
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [historyTypeFilter, observations, selectedSellerId, userId, viewFilter]);

  useEffect(() => {
    diarySessionViewFilter = viewFilter;
  }, [viewFilter]);

  useEffect(() => {
    if (viewFilter === 'mine') {
      setSelectedSellerId('all');
    }
  }, [viewFilter]);

  const dailyGoal = monthlyGoal > 0 ? monthlyGoal / WORKING_DAYS : 0;

  const salesTotalByDateSeller = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach((sale) => {
      const key = `${sale.sale_date}|${sale.seller_id}`;
      map.set(key, (map.get(key) || 0) + sale.value);
    });
    return map;
  }, [filteredSales]);

  const dayMetricsMap = useMemo(() => {
    const map: Record<string, DayMetrics> = {};

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${monthKey}-${String(day).padStart(2, '0')}`;
      const daySales = filteredSales.filter((sale) => sale.sale_date === date);
      const totalSales = daySales.reduce((acc, sale) => acc + sale.value, 0);
      const dayObs = filteredObservations.filter((obs) => obs.date === date);
      const sellerCount = new Set(dayObs.map((obs) => obs.sellerId)).size;

      map[date] = {
        totalSales,
        metGoal: dailyGoal > 0 && totalSales >= dailyGoal,
        routineOk: !!routineByDate[date],
        observationCount: dayObs.length,
        sellerObservationCount: sellerCount,
        hasNoteWithoutSales: dayObs.length > 0 && totalSales <= 0,
      };
    }

    return map;
  }, [dailyGoal, daysInMonth, filteredObservations, filteredSales, monthKey, routineByDate]);

  const dayRecords = useMemo(
    () => filteredObservations.filter((obs) => obs.date === selectedDateISO),
    [filteredObservations, selectedDateISO]
  );

  const detailSellerName =
    sellers.find((seller) => seller.id === detailSellerId)?.full_name ||
    observations.find((rec) => rec.sellerId === detailSellerId)?.sellerName ||
    'Vendedor';

  const detailSellerDaySales = salesTotalByDateSeller.get(`${selectedDateISO}|${detailSellerId}`) || 0;
  const detailSellerRecords = dayRecords.filter((record) => record.sellerId === detailSellerId);
  const detailSellerOptions = sellers.map((seller) => ({ id: seller.id, name: seller.full_name }));

  const consideredDays = useMemo(() => {
    const isCurrentMonth = monthKey === formatMonthToYYYYMM(new Date());
    return isCurrentMonth ? now.getDate() : daysInMonth;
  }, [daysInMonth, monthKey, now]);

  const monthTotalSales = filteredSales.reduce((acc, sale) => acc + sale.value, 0);
  const projection = calculateLinearProjection(monthTotalSales, Math.max(1, consideredDays), daysInMonth).projection;

  const summary = useMemo(() => {
    let metGoalDays = 0;
    let routineOkDays = 0;

    for (let day = 1; day <= consideredDays; day += 1) {
      const date = `${monthKey}-${String(day).padStart(2, '0')}`;
      const metric = dayMetricsMap[date];
      if (!metric) continue;
      if (metric.metGoal) metGoalDays += 1;
      if (metric.routineOk) routineOkDays += 1;
    }

    const routineNotOkDays = Math.max(0, consideredDays - routineOkDays);
    const adherence = consideredDays > 0 ? (routineOkDays / consideredDays) * 100 : 0;

    return {
      metGoalDays,
      routineOkDays,
      routineNotOkDays,
      adherence,
    };
  }, [consideredDays, dayMetricsMap, monthKey]);

  const monthTitle = monthDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const appendObservation = async (payload: {
    date: string;
    sellerId: string;
    sellerName: string;
    type: ObservationType;
    text: string;
  }) => {
    if (!companyId || !userId) {
      throw new Error('missing-company-or-user');
    }

    const created = await sellerDailyObservationsService.createObservation({
      company_id: companyId,
      seller_id: payload.sellerId,
      reference_date: payload.date,
      content: payload.text,
      observation_type: payload.type === 'feedback' ? 'FEEDBACK' : 'OBSERVACAO',
      created_by: userId,
    });

    if (!created) {
      throw new Error('create-observation-failed');
    }

    setObservations((prev) => [mapObservationRow(created, sellers), ...prev]);
  };

  const getEntriesForDate = (date: string) => {
    const sellerMap = new Map<string, string>();

    filteredSales
      .filter((sale) => sale.sale_date === date)
      .forEach((sale) => {
        const sellerName = sale.seller?.full_name || sellers.find((s) => s.id === sale.seller_id)?.full_name || 'Vendedor';
        sellerMap.set(sale.seller_id, sellerName);
      });

    filteredObservations
      .filter((obs) => obs.date === date)
      .forEach((obs) => {
        sellerMap.set(obs.sellerId, obs.sellerName || sellers.find((s) => s.id === obs.sellerId)?.full_name || 'Vendedor');
      });

    return Array.from(sellerMap.entries()).map(([sellerId, sellerName]) => ({ sellerId, sellerName }));
  };

  const openRegisterForDate = (date: string) => {
    setRegisterDate(date);
    setRegisterMood('good');
    setRegisterNotes('');
    setIsRegisterModalOpen(true);
  };

  const onRegisterNewDay = () => {
    openRegisterForDate(selectedDateISO);
  };

  const saveRegisterModal = async () => {
    if (!registerNotes.trim()) {
      toast.error('Preencha as anotações do dia.');
      return;
    }

    setSaving(true);
    try {
      await appendObservation({
        date: registerDate,
        sellerId: userId,
        sellerName: user?.name || 'Gestor',
        type: 'observation',
        text: `[${moodLabel(registerMood)}] ${registerNotes.trim()}`,
      });
      setIsRegisterModalOpen(false);
      toast.success('Registro do dia salvo com sucesso!');
    } catch {
      toast.error('Não foi possível salvar o registro.');
    } finally {
      setSaving(false);
    }
  };

  const onCalendarPressDay = (day: number) => {
    setSelectedDay(day);
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    const entries = getEntriesForDate(date);

    const preferredSellerId =
      selectedSellerId !== 'all'
        ? selectedSellerId
        : viewFilter === 'mine'
          ? userId
          : entries[0]?.sellerId || sellers[0]?.id || '';

    setDetailSellerId(preferredSellerId);
    setDetailType('observation');
    setDetailNoteText('');
    setIsDayListModalOpen(false);
    setIsRegisterModalOpen(false);
    setIsDayDetailModalOpen(true);
  };

  const openDetailFromList = (sellerId: string) => {
    setDetailSellerId(sellerId);
    setDetailType('observation');
    setDetailNoteText('');
    setIsDayListModalOpen(false);
    setIsDayDetailModalOpen(true);
  };

  const addDetailObservation = async () => {
    if (!detailNoteText.trim()) {
      toast.error('Digite a observação antes de adicionar.');
      return;
    }

    if (!detailSellerId || detailSellerId === 'all') {
      toast.error('Selecione um vendedor para registrar a observação.');
      return;
    }

    setSaving(true);
    try {
      await appendObservation({
        date: selectedDateISO,
        sellerId: detailSellerId,
        sellerName: detailSellerName,
        type: detailType,
        text: detailNoteText.trim(),
      });
      setDetailNoteText('');
      toast.success('Observação adicionada!');
    } catch {
      toast.error('Não foi possível adicionar a observação.');
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const leadingEmpty = Array.from({ length: firstWeekday });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const selectedDateSellerEntries = useMemo(
    () => getEntriesForDate(selectedDateISO),
    [filteredObservations, filteredSales, selectedDateISO, sellers]
  );

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-8">
        <Text className="mb-2 text-xl font-bold text-white">Diario indisponivel</Text>
        <Text className="text-center text-[#9CA3AF]">Sua conta não tem empresa vinculada.</Text>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black" edges={['left', 'right']}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="mt-2 text-sm text-[#9CA3AF]">Carregando dados do diário...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-5" style={sectionOneStyle}>
          <View className="flex-row items-center gap-2">
            <CalendarDays size={22} color="#FF6B35" />
            <Text className="flex-1 text-[30px] font-semibold text-white">Calendário com métricas diárias</Text>
          </View>
        </Animated.View>

        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4" style={sectionTwoStyle}>
          <Text className="mb-3 text-sm text-[#A3A3A3]">Visualização:</Text>
          <View className="gap-2">
            <Pressable
              className={`rounded-xl px-3 py-3 ${viewFilter === 'all' ? 'bg-[#FF6B35]' : 'bg-[#262626]'}`}
              onPress={() => setViewFilter('all')}
            >
              <Text className={`font-semibold ${viewFilter === 'all' ? 'text-white' : 'text-[#D1D5DB]'}`}>📊 Todos os Vendedores</Text>
            </Pressable>
            <Pressable
              className={`rounded-xl px-3 py-3 ${viewFilter === 'mine' ? 'bg-[#FF6B35]' : 'bg-[#262626]'}`}
              onPress={() => setViewFilter((current) => (current === 'mine' ? 'all' : 'mine'))}
            >
              <Text className={`font-semibold ${viewFilter === 'mine' ? 'text-white' : 'text-[#D1D5DB]'}`}>👑 Apenas meus registros</Text>
            </Pressable>
          </View>

          <Text className="mb-2 mt-3 text-sm text-[#A3A3A3]">Ou selecione um vendedor</Text>
          <Select
            value={selectedSellerId}
            options={sellerOptions}
            onValueChange={(value) => {
              setSelectedSellerId(value);
              if (value !== 'all') {
                setViewFilter('all');
              }
            }}
            disabled={viewFilter === 'mine'}
          />
        </Animated.View>

        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4" style={sectionThreeStyle}>
          <View className="mb-2 flex-row items-center gap-2">
            <ClipboardList size={18} color="#FACC15" />
            <Text className="flex-1 text-xl font-semibold text-white">Histórico de Observações do Mês</Text>
          </View>
          <Text className="mb-2 text-sm text-[#A3A3A3]">Consulte todas as observações do período.</Text>
          <Text className="mb-3 text-sm text-[#A3A3A3]">
            Filtro aplicado:{' '}
            {viewFilter === 'mine'
              ? '👑 Apenas meus registros'
              : selectedSellerId === 'all'
                ? '📊 Todos os vendedores'
                : sellers.find((s) => s.id === selectedSellerId)?.full_name || 'Vendedor'}
          </Text>

          <Select
            value={historyTypeFilter}
            options={[
              { label: 'Todos os tipos', value: 'all' },
              { label: 'Observação', value: 'observation' },
              { label: 'Feedback', value: 'feedback' },
            ]}
            onValueChange={(value) => setHistoryTypeFilter(value as 'all' | ObservationType)}
          />

          <View className="mt-3 gap-2">
            {loading ? <ActivityIndicator color="#FF6B35" /> : null}
            {!loading && filteredObservations.length === 0 ? (
              <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-center text-sm text-[#9CA3AF]">Nenhum registro encontrado com os filtros atuais.</Text>
              </View>
            ) : null}
            {!loading
              ? filteredObservations.slice(0, 6).map((obs) => (
                  <View key={obs.id} className="rounded-xl border border-[#2F4A75] bg-[#1A2942] p-3">
                    <Text className="text-sm text-[#D1D5DB]" numberOfLines={1}>
                      {new Date(`${obs.date}T00:00:00`).toLocaleDateString('pt-BR')} • {obs.sellerName}
                    </Text>
                    <Text className="text-xs text-[#9CA3AF]" numberOfLines={1}>
                      Por {obs.authorName} em {new Date(obs.createdAt).toLocaleString('pt-BR')}
                    </Text>
                    <View className="mt-2 self-start rounded-full border border-[#FF6B35] px-2 py-1">
                      <Text className="text-[11px] text-[#FF6B35]">{obs.type === 'feedback' ? '💬 Feedback' : '📝 Observação'}</Text>
                    </View>
                    <Text className="mt-2 text-base leading-6 text-white">{obs.text}</Text>
                  </View>
                ))
              : null}
          </View>
        </Animated.View>

        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4" style={sectionFourStyle}>
          <View className="mb-3 flex-row items-center gap-2">
            <Text className="text-2xl text-white">📊</Text>
            <Text className="text-xl font-semibold text-white">Resumo do Mês</Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <SummaryCard title="Meta Batida" value={`${summary.metGoalDays}`} subtitle={`de ${consideredDays} dias`} tone="good" />
            <SummaryCard title="Rotina OK" value={`${summary.routineOkDays}`} subtitle={`de ${consideredDays} dias`} tone="neutral" />
            <SummaryCard title="Rotina NÃO OK" value={`${summary.routineNotOkDays}`} subtitle="Atenção!" tone="bad" />
            <SummaryCard title="Adesão" value={`${summary.adherence.toFixed(0)}%`} subtitle={summary.adherence >= 80 ? 'Excelente' : 'Crítico!'} tone="bad" />
            <SummaryCard
              title="Meta do mês"
              value={monthlyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle=""
              tone="neutral"
            />
            <SummaryCard
              title="Previsão"
              value={projection.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle=""
              tone="warn"
            />
          </View>

          <View className="mt-3 rounded-xl bg-[#3D2A10] p-3">
            <Text className="text-sm text-[#FACC15]">
              💡 Correlação: {summary.routineNotOkDays} dia(s) sem rotina completa. A rotina não cumprida impacta diretamente o resultado de vendas.
            </Text>
          </View>
        </Animated.View>

        <Button onPress={onRegisterNewDay} className="h-14 rounded-2xl">
          +  Registrar novo dia
        </Button>

        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable onPress={() => setMonthDate(new Date(year, monthIndex - 1, 1))}>
              <ChevronLeft color="#D1D5DB" size={20} />
            </Pressable>
            <Text className="text-xl font-medium text-white">{capitalize(monthTitle)}</Text>
            <Pressable onPress={() => setMonthDate(new Date(year, monthIndex + 1, 1))}>
              <ChevronRight color="#D1D5DB" size={20} />
            </Pressable>
          </View>

          <View className="mb-4 rounded-xl border border-[#2F4A75] bg-[#1A2942] p-3">
            <Text className="mb-2 text-sm text-white">Legenda do Calendário:</Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-2">
              <LegendItem color="#FF6B35" label="Total vendido" />
              <LegendItem color="#00E676" label="Bateu meta" />
              <LegendItem color="#F97316" label="Rotina OK" />
              <LegendItem color="#F43F5E" label="Não bateu meta" />
              <LegendItem color="#94A3B8" label="Nota sem vendas" />
              <LegendItem color="#FF6B35" label="Obs do gestor" />
            </View>
          </View>

          <View className="mb-2 flex-row justify-between px-1">
            {weekLabels.map((label) => (
              <Text key={label} className="w-[13%] text-center text-sm text-[#D1D5DB]">
                {label}
              </Text>
            ))}
          </View>

          <View className="flex-row flex-wrap gap-y-2">
            {leadingEmpty.map((_, idx) => (
              <View key={`empty-${idx}`} className="w-[14.285%] px-1">
                <View className="h-[104px] rounded-lg" />
              </View>
            ))}

            {days.map((day) => {
              const date = `${monthKey}-${String(day).padStart(2, '0')}`;
              const metric = dayMetricsMap[date] || {
                totalSales: 0,
                metGoal: false,
                routineOk: false,
                observationCount: 0,
                sellerObservationCount: 0,
                hasNoteWithoutSales: false,
              };
              const isSelected = selectedDay === day;
              const hasContent = metric.totalSales > 0 || metric.hasNoteWithoutSales;
              const dayCardClass = isSelected
                ? 'border-[#FF6B35] bg-[#1A2A44]'
                : hasContent
                  ? 'border-[#3A4452] bg-[#14181F]'
                  : 'border-[#243244] bg-[#1A2A44]';

              return (
                <View key={date} className="w-[14.285%] px-1">
                  <Pressable
                    onPress={() => onCalendarPressDay(day)}
                    className={`h-[104px] overflow-hidden rounded-lg border px-1.5 py-1.5 ${dayCardClass}`}
                  >
                    <Text className="text-base text-[#D1D5DB]">{day}</Text>

                    <View className="flex-1 items-center justify-center">
                      {metric.totalSales > 0 ? (
                        <>
                          <Text className="text-[12px] font-medium text-white" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {formatMoneyCard(metric.totalSales)}
                          </Text>
                          <View className="mt-1">
                            {metric.metGoal ? <CheckCircle2 size={14} color="#00E676" /> : <CircleX size={14} color="#F43F5E" />}
                          </View>
                        </>
                      ) : metric.hasNoteWithoutSales ? (
                        <Text className="text-[12px] text-[#CBD5E1]">📝</Text>
                      ) : null}
                    </View>

                    {metric.sellerObservationCount > 0 ? (
                      <View className="self-center rounded-full bg-[#5A2A12] px-1.5 py-0.5">
                        <Text className="text-[10px] text-[#FF6B35]">{metric.sellerObservationCount}v</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text className="mt-3 text-center text-sm text-[#6B7280]">ℹ️ Toque em um dia para ver os detalhes completos</Text>
        </View>

      </ScrollView>

      <RegisterDayModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        currentUserName={user?.name || 'Gestor'}
        date={registerDate}
        onChangeDate={setRegisterDate}
        monthKey={monthKey}
        daysInMonth={daysInMonth}
        soldValue={dayMetricsMap[registerDate]?.totalSales || 0}
        dailyGoal={dailyGoal}
        routineOk={!!routineByDate[registerDate]}
        mood={registerMood}
        onChangeMood={setRegisterMood}
        notes={registerNotes}
        onChangeNotes={setRegisterNotes}
        onSave={() => void saveRegisterModal()}
        saving={saving}
      />

      <DayRecordsListModal
        isOpen={isDayListModalOpen}
        onClose={() => setIsDayListModalOpen(false)}
        date={selectedDateISO}
        entries={selectedDateSellerEntries}
        dailyGoal={dailyGoal}
        salesTotalByDateSeller={salesTotalByDateSeller}
        onSelectSeller={openDetailFromList}
      />

      <DayRecordDetailModal
        isOpen={isDayDetailModalOpen}
        onClose={() => setIsDayDetailModalOpen(false)}
        date={selectedDateISO}
        sellerName={detailSellerName}
        sellerId={detailSellerId}
        sellerDaySales={detailSellerDaySales}
        dayTotal={dayMetricsMap[selectedDateISO]?.totalSales || 0}
        dailyGoal={dailyGoal}
        routineOk={!!dayMetricsMap[selectedDateISO]?.routineOk}
        observations={detailSellerRecords}
        noteText={detailNoteText}
        onChangeNoteText={setDetailNoteText}
        noteType={detailType}
        onChangeType={setDetailType}
        onAddObservation={() => void addDetailObservation()}
        sellerOptions={detailSellerOptions}
        onChangeSeller={setDetailSellerId}
        saving={saving}
      />
    </SafeAreaView>
  );
}

function RegisterDayModal({
  isOpen,
  onClose,
  currentUserName,
  date,
  onChangeDate,
  monthKey,
  daysInMonth,
  soldValue,
  dailyGoal,
  routineOk,
  mood,
  onChangeMood,
  notes,
  onChangeNotes,
  onSave,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  date: string;
  onChangeDate: (value: string) => void;
  monthKey: string;
  daysInMonth: number;
  soldValue: number;
  dailyGoal: number;
  routineOk: boolean;
  mood: DayMood;
  onChangeMood: (value: DayMood) => void;
  notes: string;
  onChangeNotes: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.sheet);
  const canSave = notes.trim().length > 0 && !saving;
  const dateObj = date ? new Date(`${date}T00:00:00`) : null;
  const dayOfWeek = dateObj
    ? dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (char) => char.toUpperCase())
    : '';

  const moveDay = (step: -1 | 1) => {
    if (!date) return;
    const [_, __, dayStr] = date.split('-');
    const current = Number(dayStr);
    const next = Math.min(daysInMonth, Math.max(1, current + step));
    onChangeDate(`${monthKey}-${String(next).padStart(2, '0')}`);
  };

  return shouldRender ? (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
        <Animated.View
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
          className="flex-1 rounded-t-2xl border border-[#3A3F47] bg-[#16181C]"
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Registrar informações comerciais do dia</Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            <Text className="text-sm text-[#9CA3AF]">Por {currentUserName} 👑</Text>

            <Text className="text-sm text-[#D1D5DB]">Data</Text>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => moveDay(-1)} className="rounded-lg bg-[#111827] p-2">
                <ChevronLeft size={18} color="#D1D5DB" />
              </Pressable>
              <View className="flex-1 rounded-xl bg-[#1D2B44] p-3">
                <Text className="text-xs text-[#9CA3AF]">{dayOfWeek}</Text>
                <Text className="text-xl text-white">{dayOfWeek}</Text>
              </View>
              <Pressable onPress={() => moveDay(1)} className="rounded-lg bg-[#111827] p-2">
                <ChevronRight size={18} color="#D1D5DB" />
              </Pressable>
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1 rounded-xl bg-[#3B4B64] p-3">
                <Text className="text-sm text-[#D1D5DB]">💰 Vendido (modulo Vendas)</Text>
                <Text className="mt-1 text-2xl text-white">R$ {soldValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View className="flex-1 rounded-xl bg-[#3B4B64] p-3">
                <Text className="text-sm text-[#D1D5DB]">🎯 Meta do Dia (calculado)</Text>
                <Text className="mt-1 text-2xl text-white">R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <View className={`flex-1 rounded-xl p-3 ${soldValue >= dailyGoal && dailyGoal > 0 ? 'bg-[#14532D]' : 'bg-[#EF233C]'}`}>
                <Text className="text-xs text-white/80">Bateu Meta?</Text>
                <Text className="mt-1 text-3xl text-white">{soldValue >= dailyGoal && dailyGoal > 0 ? '✅ Sim' : '❌ Não'}</Text>
              </View>
              <View className="flex-1 rounded-xl bg-[#1D2B44] p-3">
                <Text className="text-xs text-white/80">Rotina OK?</Text>
                <Text className="mt-1 text-3xl text-white">{routineOk ? '✅ Sim' : '☑️ Não'}</Text>
              </View>
            </View>

            <Text className="text-sm text-[#D1D5DB]">Como foi o dia?</Text>
            <View className="flex-row gap-2">
              {([
                { value: 'great', label: '😁\nOtimo' },
                { value: 'good', label: '🙂\nBom' },
                { value: 'regular', label: '😐\nRegular' },
                { value: 'bad', label: '😔\nRuim' },
              ] as Array<{ value: DayMood; label: string }>).map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => onChangeMood(item.value)}
                  className={`flex-1 rounded-xl border px-2 py-2 ${mood === item.value ? 'border-[#FF6B35] bg-[#3B4B64]' : 'border-[#3B4B64] bg-transparent'}`}
                >
                  <Text className="text-center text-sm leading-5 text-white">{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm text-[#D1D5DB]">📝 Anotações do Dia</Text>
            <TextInput
              value={notes}
              onChangeText={onChangeNotes}
              multiline
              maxLength={400}
              placeholder="O que influenciou o resultado de hoje?"
              placeholderTextColor="#6B7280"
              className="min-h-[120px] rounded-xl border border-[#3B4B64] bg-[#1D2B44] p-3 text-white"
            />
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#9CA3AF]">💡 Você pode registrar notas mesmo em dias sem vendas</Text>
              <Text className="text-xs text-[#9CA3AF]">{notes.length}/400</Text>
            </View>
          </ScrollView>

          <View className="flex-row gap-2 p-4">
            <View className="flex-1">
              <Button variant="outline" onPress={onClose} className="border-[#1D2B44] bg-[#1D2B44]" textClassName="text-white">
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={onSave}
                loading={saving}
                disabled={!canSave}
                className="border-[#FF6B35] bg-[#FF6B35]"
                textClassName="text-white"
              >
                Salvar
              </Button>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  ) : null;
}

function DayRecordsListModal({
  isOpen,
  onClose,
  date,
  entries,
  dailyGoal,
  salesTotalByDateSeller,
  onSelectSeller,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  entries: Array<{ sellerId: string; sellerName: string }>;
  dailyGoal: number;
  salesTotalByDateSeller: Map<string, number>;
  onSelectSeller: (sellerId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.dialog);
  const totalDay = entries.reduce((acc, entry) => acc + (salesTotalByDateSeller.get(`${date}|${entry.sellerId}`) || 0), 0);

  return shouldRender ? (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
        <View className="flex-1 items-center justify-center px-4">
          <Animated.View
            style={[
              {
                marginTop: Math.max(insets.top + 8, 24),
                marginBottom: Math.max(insets.bottom + 8, 24),
                maxWidth: 560,
                width: '100%',
              },
              animatedContentStyle,
            ]}
            className="rounded-2xl border border-[#3A4A61] bg-[#1D2B44] p-4"
          >
          <View className="mb-2 flex-row items-start justify-between">
            <View>
              <Text className="text-sm text-[#A3A3A3]">{new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <Text className="mt-1 text-3xl text-white">
                {entries.length} {entries.length === 1 ? 'registro' : 'registros'} neste dia
              </Text>
              <Text className="mt-1 text-sm text-[#D1D5DB]">
                Total do dia: <Text className="text-[#FF6B35]">R$ {totalDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
              </Text>
              <Text className={`text-sm ${totalDay >= dailyGoal && dailyGoal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalDay >= dailyGoal && dailyGoal > 0 ? 'Meta do dia atingida' : 'Meta do dia não atingida'}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          <View className="gap-2">
            {entries.length === 0 ? (
              <View className="rounded-xl border border-[#4B5563] bg-[#334155] p-3">
                <Text className="text-center text-sm text-[#D1D5DB]">Nenhum registro encontrado nesta data.</Text>
              </View>
            ) : null}
            {entries.map((record) => {
              const sellerTotal = salesTotalByDateSeller.get(`${date}|${record.sellerId}`) || 0;
              const hit = sellerTotal >= dailyGoal && dailyGoal > 0;
              return (
                <Pressable
                  key={record.sellerId}
                  onPress={() => onSelectSeller(record.sellerId)}
                  className="rounded-xl border border-[#55657D] bg-[#3B4B64] p-3"
                >
                  <Text className="text-base font-semibold text-white">🙂 {record.sellerName}</Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-sm text-[#E5E7EB]">💲 R$ {sellerTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                    <Text className={`text-sm ${hit ? 'text-green-400' : 'text-red-400'}`}>{hit ? '✅ Bateu' : '❌ Não bateu'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  ) : null;
}

function DayRecordDetailModal({
  isOpen,
  onClose,
  date,
  sellerName,
  sellerId,
  sellerDaySales,
  dayTotal,
  dailyGoal,
  routineOk,
  observations,
  noteText,
  onChangeNoteText,
  noteType,
  onChangeType,
  onAddObservation,
  sellerOptions,
  onChangeSeller,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  sellerName: string;
  sellerId: string;
  sellerDaySales: number;
  dayTotal: number;
  dailyGoal: number;
  routineOk: boolean;
  observations: DiaryObservation[];
  noteText: string;
  onChangeNoteText: (value: string) => void;
  noteType: ObservationType;
  onChangeType: (value: ObservationType) => void;
  onAddObservation: () => void;
  sellerOptions: Array<{ id: string; name: string }>;
  onChangeSeller: (sellerId: string) => void;
  saving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.sheet);
  const hitGoal = dayTotal >= dailyGoal && dailyGoal > 0;
  const performance = dailyGoal > 0 ? Math.min(100, (dayTotal / dailyGoal) * 100) : 0;

  return shouldRender ? (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
        <Animated.View
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
          className="flex-1 rounded-t-2xl border border-[#3A4A61] bg-[#1D2B44] p-4"
        >
          <View className="mb-3 flex-row items-start justify-between">
            <View>
              <Text className="text-sm text-[#A3A3A3]">
                {new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text className="mt-1 text-sm text-[#9CA3AF]">Por</Text>
              <Text className="text-xl font-semibold text-white">{sellerName}</Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
            <View className="gap-3">
              <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
                <Text className="text-sm uppercase tracking-[1.5px] text-[#A3A3A3]">Status da Lida</Text>
                <View className={`mt-2 self-start rounded-full px-3 py-1 ${hitGoal ? 'bg-[#14532D]' : 'bg-[#EF233C]'}`}>
                  <Text className="text-sm font-semibold text-white">{hitGoal ? 'Atingida' : 'Não Atingida'}</Text>
                </View>
              </View>

              <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
                <Text className="text-sm uppercase tracking-[1.5px] text-[#A3A3A3]">Aviso da Lida</Text>
                <Text className={`mt-2 text-2xl font-semibold ${routineOk ? 'text-[#86EFAC]' : 'text-[#FCD34D]'}`}>
                  {routineOk ? 'Completa' : 'Incompleta'}
                </Text>
              </View>

              <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
                <Text className="text-sm uppercase tracking-[1.5px] text-[#A3A3A3]">Total Vendido no Dia</Text>
                <Text className="mt-2 text-3xl font-semibold text-[#FF6B35]">R$ {dayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                <Text className="text-xs text-[#9CA3AF]">Consolidado de todos os registros do dia</Text>
              </View>
            </View>

            <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
              <View className="mb-1 flex-row items-center gap-2">
                <MessageCircle size={16} color="#E5E7EB" />
                <Text className="text-2xl text-white">Observações por Vendedor</Text>
              </View>
              <Text className="text-sm text-[#9CA3AF]">Delegue e registre observacoes diretamente neste dia.</Text>
              <Text className="mt-2 text-sm text-[#9CA3AF]">Observação para</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-xl font-semibold text-white">{sellerName}</Text>
                {sellerOptions.length > 1 ? (
                  <Pressable
                    onPress={() => {
                      const index = sellerOptions.findIndex((opt) => opt.id === sellerId);
                      const next = sellerOptions[(index + 1) % sellerOptions.length];
                      onChangeSeller(next.id);
                    }}
                    className="rounded-lg border border-[#4B5563] bg-[#3C4B63] px-3 py-1.5"
                  >
                    <Text className="text-sm text-[#D1D5DB]">Trocar</Text>
                  </Pressable>
                ) : null}
              </View>

              <TextInput
                value={noteText}
                onChangeText={onChangeNoteText}
                multiline
                placeholder="Adicione uma observação para este vendedor nesta data..."
                placeholderTextColor="#9CA3AF"
                className="mt-2 min-h-[96px] rounded-xl border border-[#55657D] bg-[#3C4B63] p-3 text-white"
              />

              <Text className="mb-2 mt-3 text-sm text-[#9CA3AF]">Tipo de registro</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => onChangeType('observation')}
                  className={`flex-1 rounded-xl border px-3 py-2 ${noteType === 'observation' ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-[#55657D] bg-[#32435C]'}`}
                >
                  <Text className={`text-center font-semibold ${noteType === 'observation' ? 'text-white' : 'text-[#D1D5DB]'}`}>📝 Observação</Text>
                </Pressable>
                <Pressable
                  onPress={() => onChangeType('feedback')}
                  className={`flex-1 rounded-xl border px-3 py-2 ${noteType === 'feedback' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#55657D] bg-[#32435C]'}`}
                >
                  <Text className={`text-center font-semibold ${noteType === 'feedback' ? 'text-white' : 'text-[#D1D5DB]'}`}>💬 Feedback</Text>
                </Pressable>
              </View>

              <View className="mt-3">
                <Button
                  onPress={onAddObservation}
                  loading={saving}
                  disabled={!noteText.trim() || !sellerId}
                  className="border-[#A65B45] bg-[#A65B45]"
                  textClassName="text-[#EDEDED]"
                >
                  Adicionar Observação
                </Button>
              </View>

              <View className="mt-3 gap-2">
                {observations.map((item) => (
                  <View key={item.id} className="rounded-xl border border-[#55657D] bg-[#3C4B63] p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs text-[#9CA3AF]">
                        {item.authorName} • {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </Text>
                      <View className={`rounded-full px-2 py-0.5 ${item.type === 'feedback' ? 'bg-[#1D4ED8]' : 'bg-[#5A2A12]'}`}>
                        <Text className="text-[10px] text-white">{item.type === 'feedback' ? 'Feedback' : 'Observação'}</Text>
                      </View>
                    </View>
                    <Text className="mt-2 text-base text-white">{item.text}</Text>
                  </View>
                ))}
                {observations.length === 0 ? <Text className="text-sm text-[#9CA3AF]">Nenhum registro para este vendedor nesta data.</Text> : null}
              </View>
            </View>

            <View className="rounded-xl bg-[#3C4B63] p-3">
              <Text className="text-sm text-[#A3A3A3]">📊 Performance</Text>
              <Text className="mt-1 text-base text-white">{performance.toFixed(1)}% da meta do dia</Text>
              <View className="mt-2 h-2 rounded-full bg-[#4B5563]">
                <View className="h-2 rounded-full bg-[#FF6B35]" style={{ width: `${Math.min(100, performance)}%` }} />
              </View>
              <Text className="mt-2 text-xs text-[#9CA3AF]">
                Vendedor: R$ {sellerDaySales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  ) : null;
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: 'good' | 'neutral' | 'bad' | 'warn';
}) {
  const className =
    tone === 'good'
      ? 'border-[#2D2D2D] bg-[#1A1A1A]'
      : tone === 'bad'
        ? 'border-[#F43F5E] bg-[#3A0F16]'
        : 'border-[#2D2D2D] bg-[#1A1A1A]';
  const valueColor = tone === 'warn' ? 'text-[#FACC15]' : 'text-white';
  const valueSizeClass = value.length > 12 ? 'text-xl' : value.length > 8 ? 'text-3xl' : 'text-4xl';

  return (
    <View className={`min-h-[108px] w-[48.8%] rounded-xl border p-3 ${className}`}>
      <Text className="text-sm text-[#A3A3A3]" numberOfLines={1}>
        {title}
      </Text>
      <Text className={`mt-1 font-semibold ${valueColor} ${valueSizeClass}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      {subtitle ? (
        <Text className="text-xs text-[#9CA3AF]" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-sm text-[#9CA3AF]">{label}</Text>
    </View>
  );
}

function formatMoneyCard(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function moodLabel(mood: DayMood) {
  switch (mood) {
    case 'great':
      return 'Otimo';
    case 'good':
      return 'Bom';
    case 'regular':
      return 'Regular';
    case 'bad':
      return 'Ruim';
    default:
      return 'Bom';
  }
}

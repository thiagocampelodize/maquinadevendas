import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  MessageCircle,
  StickyNote,
  X,
} from 'lucide-react-native';
import { ActivityIndicator, Animated, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
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
import { periodicGoalsService } from '@/services/periodicGoalsService';
import { salesService, type Sale } from '@/services/salesService';
import { usersService } from '@/services/usersService';
import { hasValidGoal } from '@/utils/goalUtils';
import { resolveSellerGoals } from '@/utils/periodicGoals';
import { formatMonthToYYYYMM, getDaysInMonthFor } from '@/utils/dateUtils';

type NoteType = 'observation' | 'feedback';

interface SellerDiaryNote {
  id: string;
  date: string;
  type: NoteType;
  text: string;
  createdAt: string;
}

interface DayMetric {
  totalSales: number;
  metGoal: boolean;
  routineOk: boolean;
  notesCount: number;
  hasNoteWithoutSales: boolean;
}

export default function VendedorDiaryPage() {
  const { user } = useAuth();
  const toast = useToastContext();

  const now = new Date();
  const [monthDate, setMonthDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [dailyGoalValue, setDailyGoalValue] = useState(0);
  const [monthSales, setMonthSales] = useState<Sale[]>([]);
  const [routineByDate, setRoutineByDate] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<SellerDiaryNote[]>([]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDayListModalOpen, setIsDayListModalOpen] = useState(false);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);

  const [registerDate, setRegisterDate] = useState('');
  const [registerType, setRegisterType] = useState<NoteType>('observation');
  const [registerText, setRegisterText] = useState('');

  const [detailType, setDetailType] = useState<NoteType>('observation');
  const [detailText, setDetailText] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

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
  const notesStorageKey = `vendedor-diary-notes:${userId}:${monthKey}`;

  const loadNotes = async () => {
    const raw = await AsyncStorage.getItem(notesStorageKey);
    if (!raw) {
      setNotes([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SellerDiaryNote[];
      const normalized: SellerDiaryNote[] = (Array.isArray(parsed) ? parsed : []).map((item) => ({
        ...item,
        type: item.type === 'feedback' ? 'feedback' : 'observation',
      }));
      setNotes(normalized);
    } catch {
      setNotes([]);
    }
  };

  const loadData = async () => {
    if (!companyId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profile, monthSalesAll, periodProgress] = await Promise.all([
        usersService.getUserById(userId),
        salesService.getMonthSales(companyId, monthKey),
        checklistService.getPeriodProgress(userId, companyId, monthStart, monthEnd, 'vendedor'),
      ]);

      const mine = monthSalesAll.filter((sale) => sale.seller_id === userId);
      setMonthSales(mine);

      const periodicGoal = await periodicGoalsService.getMetaPorPeriodo(userId, monthKey);
      const effectivePeriodicGoal =
        periodicGoal ||
        (hasValidGoal(profile?.individual_goal)
          ? await periodicGoalsService.upsertMeta(userId, monthKey, Number(profile?.individual_goal || 0))
          : null);

      const resolvedGoals = resolveSellerGoals({
        seller: profile || { id: userId },
        periodicGoal: effectivePeriodicGoal || undefined,
        daysInMonth,
      });

      setMonthlyGoal(resolvedGoals.individualGoal || 0);
      setDailyGoalValue(resolvedGoals.dailyGoal || 0);

      const byDate = new Map<string, { completed: number; total: number }>();
      periodProgress.forEach((row) => {
        const current = byDate.get(row.date) || { completed: 0, total: 0 };
        current.completed += row.completed;
        current.total += row.total;
        byDate.set(row.date, current);
      });

      const map: Record<string, boolean> = {};
      byDate.forEach((value, date) => {
        map[date] = value.total > 0 && value.completed >= value.total;
      });
      setRoutineByDate(map);

      await loadNotes();
    } catch {
      toast.error('Não foi possível carregar seu diário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [companyId, monthKey, monthStart, monthEnd, userId]);

  useEffect(() => {
    void loadNotes();
  }, [notesStorageKey]);

  useEffect(() => {
    if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
  }, [daysInMonth, selectedDay]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, SellerDiaryNote[]>();
    notes.forEach((note) => {
      map.set(note.date, [...(map.get(note.date) || []), note]);
    });
    return map;
  }, [notes]);

  const dailyGoal = dailyGoalValue;

  const dayMetricMap = useMemo(() => {
    const map: Record<string, DayMetric> = {};

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${monthKey}-${String(day).padStart(2, '0')}`;
      const daySales = monthSales.filter((sale) => sale.sale_date === date);
      const totalSales = daySales.reduce((acc, sale) => acc + sale.value, 0);
      const dayNotes = notesByDate.get(date) || [];

      map[date] = {
        totalSales,
        metGoal: dailyGoal > 0 && totalSales >= dailyGoal,
        routineOk: !!routineByDate[date],
        notesCount: dayNotes.length,
        hasNoteWithoutSales: dayNotes.length > 0 && totalSales <= 0,
      };
    }

    return map;
  }, [dailyGoal, daysInMonth, monthKey, monthSales, notesByDate, routineByDate]);

  const consideredDays = useMemo(() => {
    const currentMonth = formatMonthToYYYYMM(new Date());
    return monthKey === currentMonth ? now.getDate() : daysInMonth;
  }, [daysInMonth, monthKey, now]);

  const monthTotal = monthSales.reduce((acc, sale) => acc + sale.value, 0);
  const projection = calculateLinearProjection(monthTotal, Math.max(1, consideredDays), daysInMonth).projection;

  const summary = useMemo(() => {
    let metGoalDays = 0;
    let routineOkDays = 0;

    for (let day = 1; day <= consideredDays; day += 1) {
      const date = `${monthKey}-${String(day).padStart(2, '0')}`;
      const metric = dayMetricMap[date];
      if (!metric) continue;
      if (metric.metGoal) metGoalDays += 1;
      if (metric.routineOk) routineOkDays += 1;
    }

    const routineNotOkDays = Math.max(0, consideredDays - routineOkDays);
    const adherence = consideredDays > 0 ? (routineOkDays / consideredDays) * 100 : 0;

    return { metGoalDays, routineOkDays, routineNotOkDays, adherence };
  }, [consideredDays, dayMetricMap, monthKey]);

  const selectedDayNotes = notesByDate.get(selectedDateISO) || [];
  const selectedNote = selectedDayNotes.find((note) => note.id === selectedNoteId) || selectedDayNotes[0] || null;

  const persistNotes = async (next: SellerDiaryNote[]) => {
    await AsyncStorage.setItem(notesStorageKey, JSON.stringify(next));
    setNotes(next);
  };

  const openRegisterForDate = (date: string) => {
    setRegisterDate(date);
    setRegisterType('observation');
    setRegisterText('');
    setIsRegisterModalOpen(true);
  };

  const onCalendarPressDay = (day: number) => {
    setSelectedDay(day);
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    const dayNotes = notesByDate.get(date) || [];

    if (dayNotes.length === 0) {
      openRegisterForDate(date);
      return;
    }

    if (dayNotes.length === 1) {
      setSelectedNoteId(dayNotes[0].id);
      setDetailText('');
      setDetailType('observation');
      setIsDayDetailModalOpen(true);
      return;
    }

    setIsDayListModalOpen(true);
  };

  const saveRegister = async () => {
    if (!registerText.trim()) {
      toast.error('Preencha seu registro para salvar.');
      return;
    }

    setSaving(true);
    try {
      const next: SellerDiaryNote[] = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: registerDate,
          type: registerType,
          text: registerText.trim(),
          createdAt: new Date().toISOString(),
        },
        ...notes,
      ];
      await persistNotes(next);
      setIsRegisterModalOpen(false);
      toast.success('Registro salvo com sucesso!');
    } catch {
      toast.error('Não foi possível salvar o registro.');
    } finally {
      setSaving(false);
    }
  };

  const addDetailNote = async () => {
    if (!detailText.trim()) {
      toast.error('Digite sua observação antes de adicionar.');
      return;
    }

    setSaving(true);
    try {
      const next: SellerDiaryNote[] = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: selectedDateISO,
          type: detailType,
          text: detailText.trim(),
          createdAt: new Date().toISOString(),
        },
        ...notes,
      ];
      await persistNotes(next);
      setDetailText('');
      toast.success('Observação adicionada!');
    } catch {
      toast.error('Não foi possível adicionar observação.');
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
  const monthTitle = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-lg font-semibold text-white">Diário indisponível</Text>
        <Text className="mt-2 text-center text-[#9CA3AF]">Sua conta não tem empresa vinculada.</Text>
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
            <Text className="flex-1 text-[28px] font-semibold text-white">Meu diário comercial</Text>
          </View>
          <Text className="mt-2 text-sm text-[#9CA3AF]">Registre seu dia e acompanhe seu desempenho no mês.</Text>
        </Animated.View>

        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4" style={sectionTwoStyle}>
          <Text className="text-base font-semibold text-white">Resumo do mês</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <SummaryCard title="Meta batida" value={`${summary.metGoalDays}`} subtitle={`de ${consideredDays} dias`} tone="good" />
            <SummaryCard title="Rotina OK" value={`${summary.routineOkDays}`} subtitle={`de ${consideredDays} dias`} tone="neutral" />
            <SummaryCard title="Rotina NÃO OK" value={`${summary.routineNotOkDays}`} subtitle="Atenção" tone="bad" />
            <SummaryCard title="Adesão" value={`${summary.adherence.toFixed(0)}%`} subtitle={summary.adherence >= 80 ? 'Excelente' : 'A melhorar'} tone="warn" />
            <SummaryCard title="Meta do mês" value={toBRL(monthlyGoal)} subtitle="" tone="neutral" />
            <SummaryCard title="Previsão" value={toBRL(projection)} subtitle="" tone="warn" />
          </View>
        </Animated.View>

        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4" style={sectionThreeStyle}>
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
            <Text className="mb-2 text-sm text-white">Legenda do calendário:</Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-2">
              <LegendItem color="#FF6B35" label="Total vendido" />
              <LegendItem color="#00E676" label="Bateu meta" />
              <LegendItem color="#F43F5E" label="Não bateu meta" />
              <LegendItem color="#F97316" label="Rotina OK" />
              <LegendItem color="#94A3B8" label="Nota sem vendas" />
              <LegendItem color="#FF6B35" label="Registros" />
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
              const metric = dayMetricMap[date] || {
                totalSales: 0,
                metGoal: false,
                routineOk: false,
                notesCount: 0,
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
                            {metric.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <View className="mt-1">
                            {metric.metGoal ? <CheckCircle2 size={14} color="#00E676" /> : <CircleX size={14} color="#F43F5E" />}
                          </View>
                        </>
                      ) : metric.hasNoteWithoutSales ? (
                        <Text className="text-[12px] text-[#CBD5E1]">📝</Text>
                      ) : null}
                    </View>

                    {metric.notesCount > 0 ? (
                      <View className="self-center rounded-full bg-[#5A2A12] px-1.5 py-0.5">
                        <Text className="text-[10px] text-[#FF6B35]">{metric.notesCount}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text className="mt-3 text-center text-sm text-[#6B7280]">ℹ️ Toque em um dia para ver os detalhes.</Text>
        </Animated.View>

        <Animated.View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4" style={sectionFourStyle}>
          <Text className="mb-3 text-base font-semibold text-white">Histórico de registros</Text>
          <View className="mb-3">
            <Select
              value={selectedDateISO}
              options={buildDateOptions(monthKey, daysInMonth)}
              onValueChange={(value) => {
                const day = Number(value.split('-')[2]);
                setSelectedDay(day);
              }}
            />
          </View>
          <Button className="h-12 rounded-xl" onPress={() => openRegisterForDate(selectedDateISO)}>
            + Registrar novo dia
          </Button>
        </Animated.View>
      </ScrollView>

      <RegisterNoteModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        date={registerDate}
        noteType={registerType}
        onChangeType={setRegisterType}
        text={registerText}
        onChangeText={setRegisterText}
        onSave={() => void saveRegister()}
        saving={saving}
      />

      <DayNotesListModal
        isOpen={isDayListModalOpen}
        onClose={() => setIsDayListModalOpen(false)}
        date={selectedDateISO}
        notes={selectedDayNotes}
        onSelect={(noteId) => {
          setSelectedNoteId(noteId);
          setDetailText('');
          setDetailType('observation');
          setIsDayListModalOpen(false);
          setIsDayDetailModalOpen(true);
        }}
      />

      <DayNoteDetailModal
        isOpen={isDayDetailModalOpen}
        onClose={() => setIsDayDetailModalOpen(false)}
        date={selectedDateISO}
        note={selectedNote}
        dayMetric={dayMetricMap[selectedDateISO]}
        dailyGoal={dailyGoal}
        notes={selectedDayNotes}
        detailType={detailType}
        onChangeType={setDetailType}
        detailText={detailText}
        onChangeText={setDetailText}
        onAddNote={() => void addDetailNote()}
        saving={saving}
      />
    </SafeAreaView>
  );
}

function RegisterNoteModal({
  isOpen,
  onClose,
  date,
  noteType,
  onChangeType,
  text,
  onChangeText,
  onSave,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  noteType: NoteType;
  onChangeType: (value: NoteType) => void;
  text: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.sheet);

  return shouldRender ? (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
        <Animated.View
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111] p-4"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-white">Registrar novo dia</Text>
            <Pressable onPress={onClose}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <Text className="text-sm text-[#9CA3AF]">Data: {formatDateLabel(date)}</Text>

          <Text className="mb-2 mt-4 text-sm text-[#D1D5DB]">Tipo de registro</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => onChangeType('observation')}
              className={`flex-1 rounded-xl border px-3 py-2 ${noteType === 'observation' ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
            >
              <Text className="text-center font-semibold text-white">📝 Observação</Text>
            </Pressable>
            <Pressable
              onPress={() => onChangeType('feedback')}
              className={`flex-1 rounded-xl border px-3 py-2 ${noteType === 'feedback' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
            >
              <Text className="text-center font-semibold text-white">💬 Feedback</Text>
            </Pressable>
          </View>

          <Text className="mb-2 mt-4 text-sm text-[#D1D5DB]">Anotações</Text>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            multiline
            placeholder="Descreva como foi seu dia e os aprendizados..."
            placeholderTextColor="#6B7280"
            className="min-h-[130px] rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3 text-white"
          />

          <View className="mt-4 gap-2">
            <Button className="h-12 rounded-xl" onPress={onSave} loading={saving} disabled={!text.trim()}>
              Salvar registro
            </Button>
            <Button variant="outline" className="h-12 rounded-xl" onPress={onClose}>
              Cancelar
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  ) : null;
}

function DayNotesListModal({
  isOpen,
  onClose,
  date,
  notes,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  notes: SellerDiaryNote[];
  onSelect: (noteId: string) => void;
}) {
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.dialog);

  return shouldRender ? (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 items-center justify-center bg-black/75 px-4">
        <Animated.View style={animatedContentStyle} className="w-full rounded-2xl border border-[#3A4A61] bg-[#1D2B44] p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-[#9CA3AF]">{formatDateLabel(date)}</Text>
              <Text className="mt-1 text-xl text-white">{notes.length} registros nesta data</Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <View className="gap-2">
            {notes.map((note) => (
              <Pressable key={note.id} onPress={() => onSelect(note.id)} className="rounded-xl border border-[#55657D] bg-[#3B4B64] p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-white">{note.type === 'feedback' ? '💬 Feedback' : '📝 Observação'}</Text>
                  <Text className="text-xs text-[#D1D5DB]">{new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text className="mt-2 text-sm text-[#E5E7EB]" numberOfLines={2}>
                  {note.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  ) : null;
}

function DayNoteDetailModal({
  isOpen,
  onClose,
  date,
  note,
  dayMetric,
  dailyGoal,
  notes,
  detailType,
  onChangeType,
  detailText,
  onChangeText,
  onAddNote,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  note: SellerDiaryNote | null;
  dayMetric?: DayMetric;
  dailyGoal: number;
  notes: SellerDiaryNote[];
  detailType: NoteType;
  onChangeType: (value: NoteType) => void;
  detailText: string;
  onChangeText: (value: string) => void;
  onAddNote: () => void;
  saving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.sheet);

  const totalSales = dayMetric?.totalSales || 0;
  const hitGoal = dailyGoal > 0 && totalSales >= dailyGoal;
  const performance = dailyGoal > 0 ? Math.min(100, (totalSales / dailyGoal) * 100) : 0;

  return shouldRender ? (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
        <Animated.View
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
          className="flex-1 rounded-t-2xl border border-[#3A4A61] bg-[#1D2B44] p-4"
        >
          <View className="mb-3 flex-row items-start justify-between">
            <View>
              <Text className="text-sm text-[#A3A3A3]">{formatDateLabel(date)}</Text>
              <Text className="mt-1 text-base font-semibold text-white">Detalhes do dia</Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
            <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
              <Text className="text-sm text-[#A3A3A3]">Total vendido no dia</Text>
              <Text className="mt-1 text-2xl font-semibold text-[#FF6B35]">{toBRL(totalSales)}</Text>
              <Text className="text-xs text-[#9CA3AF]">Meta do dia: {toBRL(dailyGoal)}</Text>
            </View>

            <View className={`rounded-xl p-3 ${hitGoal ? 'bg-[#14532D]' : 'bg-[#EF233C]'}`}>
              <Text className="text-sm text-white/80">Status meta</Text>
              <Text className="text-2xl font-semibold text-white">{hitGoal ? 'Atingida' : 'Não atingida'}</Text>
            </View>

            <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
              <Text className="text-sm text-[#A3A3A3]">Rotina do dia</Text>
              <Text className="text-2xl font-semibold text-white">{dayMetric?.routineOk ? 'Completa' : 'Incompleta'}</Text>
            </View>

            <View className="rounded-xl border border-[#55657D] bg-[#32435C] p-3">
              <View className="mb-1 flex-row items-center gap-2">
                <MessageCircle size={16} color="#E5E7EB" />
                <Text className="text-lg text-white">Registros do dia</Text>
              </View>

              {note ? (
                <View className="mt-2 rounded-xl border border-[#55657D] bg-[#3C4B63] p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-[#9CA3AF]">{new Date(note.createdAt).toLocaleString('pt-BR')}</Text>
                    <View className={`rounded-full px-2 py-0.5 ${note.type === 'feedback' ? 'bg-[#1D4ED8]' : 'bg-[#5A2A12]'}`}>
                      <Text className="text-[10px] text-white">{note.type === 'feedback' ? 'Feedback' : 'Observação'}</Text>
                    </View>
                  </View>
                  <Text className="mt-2 text-base text-white">{note.text}</Text>
                </View>
              ) : (
                <Text className="mt-2 text-sm text-[#9CA3AF]">Sem registro principal nesta data.</Text>
              )}

              <Text className="mb-2 mt-3 text-sm text-[#9CA3AF]">Adicionar novo registro</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => onChangeType('observation')}
                  className={`flex-1 rounded-xl border px-3 py-2 ${detailType === 'observation' ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-[#55657D] bg-[#32435C]'}`}
                >
                  <Text className="text-center font-semibold text-white">📝 Observação</Text>
                </Pressable>
                <Pressable
                  onPress={() => onChangeType('feedback')}
                  className={`flex-1 rounded-xl border px-3 py-2 ${detailType === 'feedback' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#55657D] bg-[#32435C]'}`}
                >
                  <Text className="text-center font-semibold text-white">💬 Feedback</Text>
                </Pressable>
              </View>

              <TextInput
                value={detailText}
                onChangeText={onChangeText}
                multiline
                placeholder="Escreva seu registro complementar para este dia..."
                placeholderTextColor="#9CA3AF"
                className="mt-2 min-h-[100px] rounded-xl border border-[#55657D] bg-[#3C4B63] p-3 text-white"
              />

              <View className="mt-3">
                <Button className="h-12 rounded-xl" onPress={onAddNote} loading={saving} disabled={!detailText.trim()}>
                  Adicionar registro
                </Button>
              </View>

              {notes.length > 1 ? (
                <View className="mt-3 gap-2">
                  {notes.slice(1).map((item) => (
                    <View key={item.id} className="rounded-xl border border-[#55657D] bg-[#3C4B63] p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-[#9CA3AF]">{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
                        <View className={`rounded-full px-2 py-0.5 ${item.type === 'feedback' ? 'bg-[#1D4ED8]' : 'bg-[#5A2A12]'}`}>
                          <Text className="text-[10px] text-white">{item.type === 'feedback' ? 'Feedback' : 'Observação'}</Text>
                        </View>
                      </View>
                      <Text className="mt-1 text-sm text-white">{item.text}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View className="rounded-xl bg-[#3C4B63] p-3">
              <Text className="text-sm text-[#A3A3A3]">📊 Performance</Text>
              <Text className="mt-1 text-base text-white">{performance.toFixed(1)}% da meta do dia</Text>
              <View className="mt-2 h-2 rounded-full bg-[#4B5563]">
                <View className="h-2 rounded-full bg-[#FF6B35]" style={{ width: `${Math.min(100, performance)}%` }} />
              </View>
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

function buildDateOptions(monthKey: string, daysInMonth: number) {
  const options: Array<{ label: string; value: string }> = [];
  for (let day = daysInMonth; day >= 1; day -= 1) {
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    options.push({ label: formatDateLabel(date), value: date });
  }
  return options;
}

function formatDateLabel(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

import * as Clipboard from 'expo-clipboard';
import { Check, Copy, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import type { SellerRanking } from '@/types';

interface MessagesProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyGoal: number;
  currentSales: number;
  currentDay: number;
  daysInMonth: number;
  salesTeam: SellerRanking[];
}

export function Messages({
  isOpen,
  onClose,
  monthlyGoal,
  currentSales,
  currentDay,
  daysInMonth,
  salesTeam,
}: MessagesProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'noon' | 'evening' | 'individual'>('all');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const { safeMonthlyGoal, safeCurrentSales, safeDaysInMonth, percentageComplete, dailyGoal, totalSoldToday, dailySales, dailyPercentage, rankingTodayByValue, sellersWhoHitGoal } = useMemo(() => {
    const safeMonthlyGoal = Math.max(0, monthlyGoal || 0);
    const safeCurrentSales = Math.max(0, currentSales || 0);
    const safeDaysInMonth = Math.max(1, daysInMonth || 1);
    const percentageComplete = safeMonthlyGoal > 0 ? (safeCurrentSales / safeMonthlyGoal) * 100 : 0;
    const dailyGoal = safeMonthlyGoal / safeDaysInMonth;
    const totalSoldToday = salesTeam.reduce((sum, seller) => sum + (seller.salesToday || 0), 0);
    const dailySales = totalSoldToday;
    const dailyPercentage = dailyGoal > 0 ? (dailySales / dailyGoal) * 100 : 0;
    const rankingTodayByValue = [...salesTeam].sort((a, b) => (b.salesToday || 0) - (a.salesToday || 0));
    const sellersWhoHitGoal = salesTeam.filter((seller) => {
      if (!seller.hasValidGoal) return false;
      const sellerDailyGoal = seller.goal > 0 ? seller.goal / safeDaysInMonth : 0;
      return sellerDailyGoal > 0 && (seller.salesToday || 0) >= sellerDailyGoal;
    });
    return { safeMonthlyGoal, safeCurrentSales, safeDaysInMonth, percentageComplete, dailyGoal, totalSoldToday, dailySales, dailyPercentage, rankingTodayByValue, sellersWhoHitGoal };
  }, [monthlyGoal, currentSales, daysInMonth, salesTeam]);

  const { teamMessage, noonMessage1, noonMessage2, noonMessage3, eveningMessage1, eveningMessage2, eveningMessage3 } = useMemo(() => {
    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const top = rankingTodayByValue;
    const hitNames = sellersWhoHitGoal.map((s) => s.name).join(', ');

    return {
      teamMessage: `⚠️ Time, precisamos acelerar!\n\nEstamos em ${percentageComplete.toFixed(1)}% da meta do mes (${brl(safeCurrentSales)} de ${brl(safeMonthlyGoal)}) no dia ${currentDay}/${safeDaysInMonth}.\n\nVamos focar e dar a volta por cima! 💪 Conto com cada um de voces!`,
      noonMessage1: `⚠️ Time, precisamos acelerar!\n\nEstamos em:\n${percentageComplete.toFixed(0)}% da meta do mes atingida (${brl(safeCurrentSales)} de ${brl(safeMonthlyGoal)}).\n${dailyPercentage.toFixed(0)}% da meta do dia atingida (${brl(dailySales)} de ${brl(dailyGoal)}).\n\nVamos focar e dar a volta por cima! 🚀 Conto com cada um de voces!`,
      noonMessage2: `🎯 Foco no alvo, time!\n\nStatus do meio-dia:\nMeta do Mes: Faltam ${brl(safeMonthlyGoal - safeCurrentSales)} para o objetivo.\nMeta do Dia: Faltam ${brl(dailyGoal - dailySales)} para a meta de hoje.\n\nTemos a tarde inteira para buscar esse resultado. Vamos pra cima! 💪`,
      noonMessage3: `⏳ Atencao, time! O tempo esta passando!\n\nRelatorio do meio-dia:\nMeta do Dia: Atingimos apenas ${dailyPercentage.toFixed(0)}% do esperado (${brl(dailySales)} de ${brl(dailyGoal)}).\nMeta do Mes: Estamos em ${percentageComplete.toFixed(0)}% (${brl(safeCurrentSales)} de ${brl(safeMonthlyGoal)}).\n\nNao podemos deixar para amanha. A meta do dia e a prioridade #1. Vamos acelerar AGORA!`,
      eveningMessage1: `🏆 Time, e hora de celebrar:\n\nBateram meta hoje: ${sellersWhoHitGoal.length > 0 ? hitNames : 'Nenhum vendedor bateu a meta hoje'}. ${sellersWhoHitGoal.length > 0 ? 'Parabens pelos resultados 👏👏👏' : 'Vamos melhorar amanha!'}\nRanking atualizado dos campeoes de vendas do dia:\n1o lugar em vendas: ${top[0]?.name || 'N/A'}\n2o lugar em vendas: ${top[1]?.name || 'N/A'}\n3o lugar em vendas: ${top[2]?.name || 'N/A'}`,
      eveningMessage2: `🥇 Podio dos Campeoes do Dia! 🥇\n\nHoje o dia foi incrivel para alguns! Parabens aos que se destacaram:\n\n🏆 Podio:\n🥇 1o Lugar: ${top[0]?.name || 'N/A'} com ${brl(top[0]?.salesToday || 0)}\n🥈 2o Lugar: ${top[1]?.name || 'N/A'} com ${brl(top[1]?.salesToday || 0)}\n🥉 3o Lugar: ${top[2]?.name || 'N/A'} com ${brl(top[2]?.salesToday || 0)}\n\n${sellersWhoHitGoal.length > 0 ? `🔥 E um parabens especial para ${hitNames} que tambem ${sellersWhoHitGoal.length === 1 ? 'bateu' : 'bateram'} a meta hoje! Amanha tem mais!` : ''}`,
      eveningMessage3: `📋 Relatorio Final do Dia!\n\nMissao dada, missao cumprida para alguns! Vamos aos numeros:\n\nTotal Vendido Hoje: ${brl(totalSoldToday)}\nBateram a Meta Diaria: ${sellersWhoHitGoal.length} ${sellersWhoHitGoal.length === 1 ? 'vendedor' : 'vendedores'}. ${sellersWhoHitGoal.length > 0 ? `Parabens, ${hitNames}! 👏👏` : 'Vamos melhorar amanha!'}\n\nTop 3 de Hoje:\n${top[0]?.name || 'N/A'}\n${top[1]?.name || 'N/A'}\n${top[2]?.name || 'N/A'}\n\nQue sirva de inspiracao para amanha!`,
    };
  }, [percentageComplete, safeCurrentSales, safeMonthlyGoal, currentDay, safeDaysInMonth, dailyPercentage, dailySales, dailyGoal, rankingTodayByValue, sellersWhoHitGoal, totalSoldToday]);

  const copy = useCallback(async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 1800);
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Mensagens Prontas</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
              <Text className="text-sm text-[#9CA3AF]">
                Copie e envie mensagens motivacionais para seu time
              </Text>
            </View>

            <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-2">
              <View className="flex-row gap-2">
                <Tab label="Todas" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} />
                <Tab label="Meio-Dia" active={activeFilter === 'noon'} onPress={() => setActiveFilter('noon')} />
                <Tab label="17:45" active={activeFilter === 'evening'} onPress={() => setActiveFilter('evening')} />
                <Tab label="Individual" active={activeFilter === 'individual'} onPress={() => setActiveFilter('individual')} />
              </View>
            </View>

            <MessageCard
              title="Mensagem para o Time"
              text={teamMessage}
              copied={copiedId === 'team'}
              onCopy={() => copy(teamMessage, 'team')}
            />

            {(activeFilter === 'all' || activeFilter === 'noon') ? (
              <View className="gap-3 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-base font-semibold text-white">📈 Mensagens Rotina do Meio-Dia</Text>
                <Text className="text-xs text-[#9CA3AF]">Escolha uma das 3 variacoes para envio no meio do dia.</Text>

                <MessageCard title="Modelo Base" text={noonMessage1} copied={copiedId === 'noon1'} onCopy={() => copy(noonMessage1, 'noon1')} />
                <MessageCard title="Variacao 1 - Foco no que Falta" text={noonMessage2} copied={copiedId === 'noon2'} onCopy={() => copy(noonMessage2, 'noon2')} />
                <MessageCard title="Variacao 2 - Tom de Urgencia" text={noonMessage3} copied={copiedId === 'noon3'} onCopy={() => copy(noonMessage3, 'noon3')} />
              </View>
            ) : null}

            {(activeFilter === 'all' || activeFilter === 'evening') ? (
              <View className="gap-3 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-base font-semibold text-white">🏆 Mensagens Rotina das 17:45</Text>
                <Text className="text-xs text-[#9CA3AF]">Escolha uma das 3 variacoes para envio no final do dia.</Text>

                <MessageCard title="Modelo Base" text={eveningMessage1} copied={copiedId === 'evening1'} onCopy={() => copy(eveningMessage1, 'evening1')} />
                <MessageCard title="Variacao 1 - Podio dos Campeoes" text={eveningMessage2} copied={copiedId === 'evening2'} onCopy={() => copy(eveningMessage2, 'evening2')} />
                <MessageCard title="Variacao 2 - Relatorio Final" text={eveningMessage3} copied={copiedId === 'evening3'} onCopy={() => copy(eveningMessage3, 'evening3')} />
              </View>
            ) : null}

            {(activeFilter === 'all' || activeFilter === 'individual') ? (
              <View className="gap-3 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-base font-semibold text-white">Mensagens Individuais</Text>
                {salesTeam.map((seller) => {
                  const text = `💪 ${seller.name}, vamos la!\n\nVoce esta em ${seller.percentageOfGoal.toFixed(1)}% da sua meta mensal (${seller.sales.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })} de ${seller.goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).\n\nSei que voce consegue! Foco e persistencia!`;

                  return (
                    <MessageCard
                      key={seller.id}
                      title={seller.name}
                      text={text}
                      copied={copiedId === seller.id}
                      onCopy={() => copy(text, seller.id)}
                    />
                  );
                })}
              </View>
            ) : null}

            <View className="rounded-xl border border-blue-500/40 bg-blue-900/10 p-3">
              <Text className="text-xs text-blue-200">
                💡 Dica: apos copiar, abra o WhatsApp e cole a mensagem no grupo ou conversa individual.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-lg px-2 py-2 ${active ? 'bg-[#FF6B35]' : 'bg-[#262626]'}`}
    >
      <Text className={`text-center text-xs ${active ? 'text-white' : 'text-[#9CA3AF]'}`}>{label}</Text>
    </Pressable>
  );
}

function MessageCard({
  title,
  text,
  copied,
  onCopy,
}: {
  title: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <View className="rounded-xl border border-[#2D2D2D] bg-[#111111] p-3">
      <Text className="mb-2 text-sm font-medium text-white">{title}</Text>
      <View className="mb-3 rounded-lg bg-[#1A1A1A] p-3">
        <Text className="text-sm leading-6 text-[#D1D5DB]">{text}</Text>
      </View>
      <Button variant="outline" onPress={onCopy}>
        {copied ? 'Copiado!' : 'Copiar Mensagem'}
      </Button>
    </View>
  );
}

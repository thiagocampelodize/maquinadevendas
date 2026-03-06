import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Trophy,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateLinearProjection } from "@/domain/forecast/forecastCalculator";
import type { SellerRanking } from "@/types";

interface PerformanceRankingProps {
  salesTeam: SellerRanking[];
  currentDay: number;
  daysInMonth: number;
  onOpenModal: () => void;
  onOpenMessage?: (seller: SellerRanking) => void;
  showMessageAction?: boolean;
}

const money = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export function PerformanceRanking({
  salesTeam,
  currentDay,
  daysInMonth,
  onOpenModal,
  onOpenMessage,
  showMessageAction = true,
}: PerformanceRankingProps) {
  const [isTopExpanded, setIsTopExpanded] = useState(true);
  const [isBottomExpanded, setIsBottomExpanded] = useState(true);

  if (salesTeam.length === 0) return null;

  const rankingByValue = [...salesTeam].sort((a, b) => b.sales - a.sales);
  const topThree = rankingByValue.slice(0, 3);
  const bottomThree = rankingByValue.slice(-3).reverse();

  const renderRow = (seller: SellerRanking, index: number, isTop: boolean) => {
    const forecast = calculateLinearProjection(
      seller.sales,
      currentDay,
      daysInMonth,
    ).projection;
    const goalIsValid = !!seller.hasValidGoal;
    const willHitGoal = goalIsValid && forecast >= seller.goal;
    const missing = goalIsValid ? seller.goal - seller.sales : 0;

    return (
      <View
        key={seller.id}
        className={`rounded-lg border p-3 ${isTop ? "border-green-600/50 bg-[#1a1a1a]" : "border-red-600/50 bg-[#1a1a1a]"}`}
      >
        <View className="mb-3 flex-row items-center gap-3">
          <Text className="text-lg text-[#9CA3AF]">
            {isTop
              ? ["🥇", "🥈", "🥉"][index]
              : `#${salesTeam.length - bottomThree.length + index + 1}`}
          </Text>
          <Text className="flex-1 text-base text-white">{seller.name}</Text>
          {showMessageAction ? (
            <Pressable
              onPress={() => onOpenMessage?.(seller)}
              className="rounded-md bg-[#262626] p-2"
            >
              <MessageSquare stroke="#9CA3AF" size={14} />
            </Pressable>
          ) : null}
        </View>

        <View className="mb-3 flex-row flex-wrap gap-2">
          <MetricMini label="Acumulado" value={money(seller.sales)} />
          <MetricMini
            label="Meta"
            value={goalIsValid ? money(seller.goal) : "Sem meta"}
          />
          <MetricMini
            label="Falta"
            value={goalIsValid ? money(missing) : "-"}
            valueColor={
              goalIsValid ? (missing <= 0 ? "#16A34A" : "#DC2626") : "#9CA3AF"
            }
          />
          <MetricMini
            label="Previsao"
            value={money(forecast)}
            valueColor={willHitGoal ? "#16A34A" : "#FF6B35"}
          />
          <MetricMini
            label="Bate?"
            value={goalIsValid ? (willHitGoal ? "SIM" : "NAO") : "N/A"}
            valueColor={
              goalIsValid ? (willHitGoal ? "#16A34A" : "#DC2626") : "#9CA3AF"
            }
          />
        </View>

        <View className="h-2 w-full rounded-full bg-[#404040]">
          <View
            className={`h-2 rounded-full ${isTop ? (willHitGoal ? "bg-green-600" : "bg-[#FF6B35]") : "bg-red-600"}`}
            style={{ width: `${Math.min(seller.percentageOfGoal, 100)}%` }}
          />
        </View>
      </View>
    );
  };

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <View className="border-b border-[#404040] bg-[#262626] p-4">
        <Text className="text-lg font-semibold text-white">
          Ranking de Performance
        </Text>
      </View>

      <View className="border-b-2 border-green-600/30 bg-green-900/10">
        <Pressable
          className="flex-row items-center justify-between p-4"
          onPress={() => setIsTopExpanded((v) => !v)}
        >
          <View className="flex-row items-center gap-2">
            <Trophy stroke="#22C55E" size={16} />
            <Text className="text-xs font-bold uppercase tracking-wide text-green-400">
              Top 3 - Melhores
            </Text>
          </View>
          {isTopExpanded ? (
            <ChevronUp stroke="#22C55E" size={18} />
          ) : (
            <ChevronDown stroke="#22C55E" size={18} />
          )}
        </Pressable>
        {isTopExpanded ? (
          <View className="gap-3 px-4 pb-4">
            {topThree.map((s, i) => renderRow(s, i, true))}
          </View>
        ) : null}
      </View>

      <View className="bg-red-900/10">
        <Pressable
          className="flex-row items-center justify-between p-4"
          onPress={() => setIsBottomExpanded((v) => !v)}
        >
          <Text className="text-xs font-bold uppercase tracking-wide text-red-400">
            Ultimos 3 - Atencao
          </Text>
          {isBottomExpanded ? (
            <ChevronUp stroke="#F87171" size={18} />
          ) : (
            <ChevronDown stroke="#F87171" size={18} />
          )}
        </Pressable>
        {isBottomExpanded ? (
          <View className="gap-3 px-4 pb-4">
            {bottomThree.map((s, i) => renderRow(s, i, false))}
          </View>
        ) : null}
      </View>

      <View className="bg-[#FF6B35] p-4">
        <Button
          className="bg-white"
          textStyle={{ color: "#FF6B35" }}
          onPress={onOpenModal}
        >
          Ver lista completa de vendedores ({salesTeam.length})
        </Button>
      </View>
    </Card>
  );
}

function MetricMini({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className="min-w-[95px] rounded-md bg-[#262626] p-2">
      <Text className="text-xs text-[#9CA3AF]">{label}</Text>
      <Text
        className="text-sm font-semibold"
        style={{ color: valueColor || "#FFFFFF" }}
      >
        {value}
      </Text>
    </View>
  );
}

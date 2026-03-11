import * as Clipboard from "expo-clipboard";
import { Check, Copy, Search, Send, Users, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  MODAL_ANIMATION_PRESETS,
  useModalAnimation,
} from "@/components/ui/useModalAnimation";
import { useToastContext } from "@/contexts/ToastContext";
import {
  calculateDailyGoalFromMonthly,
  getBrazilMonthProgress,
} from "@/domain/forecast/forecastCalculator";
import { getBrazilDateString } from "@/utils/dateUtils";
import {
  messageTemplatesService,
  type MessageTemplate,
} from "@/services/messageTemplatesService";
import { notificationsService } from "@/services/notificationsService";
import { salesService } from "@/services/salesService";
import type { SellerRanking } from "@/types";

interface GlobalMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: SellerRanking[];
  companyId?: string;
}

interface MessageContextData {
  dailyRanking: Array<{ name: string; value: number }>;
  monthlyRanking: Array<{ name: string; value: number }>;
  totalDailySales: number;
  totalMonthlySales: number;
  monthlyGoal: number;
  dailyGoal: number;
  sellersMetDailyGoal: string[];
  sellersBelowThreshold: number;
}

export function GlobalMessageModal({
  isOpen,
  onClose,
  sellers,
  companyId,
}: GlobalMessageModalProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } =
    useModalAnimation(isOpen, MODAL_ANIMATION_PRESETS.sheet);
  const toast = useToastContext();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextData, setContextData] = useState<MessageContextData | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await messageTemplatesService.getTemplates(companyId);
        if (cancelled) return;
        const normalizedTemplates = Array.isArray(data) ? data : [];
        setTemplates(normalizedTemplates);
        if (normalizedTemplates[0]) setSelectedTemplateId(normalizedTemplates[0].id);

        if (companyId) {
          const todayDate = getBrazilDateString();
          const dailySalesRaw = await salesService.getSalesByDateRange(
            companyId,
            todayDate,
            todayDate,
          );
          if (cancelled) return;

          const normalizedDailySales = Array.isArray(dailySalesRaw) ? dailySalesRaw : [];
          const dailyMap = new Map<string, number>();
          let totalDailySales = 0;
          normalizedDailySales.forEach((sale) => {
            const current = dailyMap.get(sale.seller_id) || 0;
            dailyMap.set(sale.seller_id, current + sale.value);
            totalDailySales += sale.value;
          });

        const dailyRanking = Array.from(dailyMap.entries())
          .map(([id, value]) => {
            const seller = sellers.find((s) => s.id === id);
            return { name: seller?.name || "Vendedor", value };
          })
          .sort((a, b) => b.value - a.value);

        const monthlyRanking = [...sellers]
          .sort((a, b) => b.sales - a.sales)
          .map((s) => ({ name: s.name, value: s.sales }));

        const totalMonthlySales = sellers.reduce((acc, s) => acc + s.sales, 0);
        const totalMonthlyGoal = sellers.reduce(
          (acc, s) => acc + (s.hasValidGoal ? s.goal : 0),
          0,
        );
        const { daysInMonth } = getBrazilMonthProgress();
        const teamDailyGoal = calculateDailyGoalFromMonthly(
          totalMonthlyGoal,
          daysInMonth,
        );

        const sellersMetDailyGoal = sellers
          .filter((s) => {
            if (!s.hasValidGoal) return false;
            const sellerDailySales = dailyMap.get(s.id) || 0;
            const sellerDailyGoal = calculateDailyGoalFromMonthly(
              s.goal,
              daysInMonth,
            );
            return sellerDailyGoal > 0 && sellerDailySales >= sellerDailyGoal;
          })
          .map((s) => s.name);

        const sellersBelowThreshold = sellers.filter(
          (s) => s.hasValidGoal && s.goal > 0 && (s.sales / s.goal) * 100 < 40,
        ).length;

          setContextData({
            dailyRanking,
            monthlyRanking,
            totalDailySales,
            totalMonthlySales,
            monthlyGoal: totalMonthlyGoal,
            dailyGoal: teamDailyGoal,
            sellersMetDailyGoal,
            sellersBelowThreshold,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    setSelectedSellerId("");
    setSearchTerm("");
    void load();

    return () => {
      cancelled = true;
    };
  }, [companyId, isOpen, sellers]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const categories = [
    { value: "all", label: "Todas" },
    { value: "cobranca", label: "Cobranca" },
    { value: "parabens", label: "Parabens" },
    { value: "fechamento", label: "Fechamento" },
    { value: "lembrete", label: "Lembrete" },
    { value: "feedback_quinzena", label: "Feedback Quinzenal" },
    { value: "abertura_fechamento_mes", label: "Abertura/Fechamento de Mes" },
    { value: "rotina_diaria", label: "Rotina Diaria" },
    { value: "custom", label: "Personalizado" },
  ];

  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const filteredSellers = sellers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const selectedSeller = sellers.find((s) => s.id === selectedSellerId) || null;
  const selectedTemplate =
    filteredTemplates.find((t) => t.id === selectedTemplateId) || null;

  const variables = selectedSeller
    ? messageTemplatesService.generateVariablesForSeller(
        {
          name: selectedSeller.name,
          sales: selectedSeller.sales,
          goal: selectedSeller.goal,
          salesToday: selectedSeller.salesToday,
        },
        contextData ?? undefined,
      )
    : {};

  const renderedMessage =
    selectedTemplate && selectedSeller
      ? messageTemplatesService.renderMessage(
          selectedTemplate.content,
          variables,
        )
      : "";

  const handleCopy = async () => {
    if (!renderedMessage) return;
    try {
      await Clipboard.setStringAsync(renderedMessage);
      setCopied(true);
      toast.success("Mensagem copiada!");
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleSendAsNotification = async () => {
    if (!selectedSeller || !renderedMessage.trim()) {
      toast.error("Selecione um vendedor e uma mensagem");
      return;
    }
    if (!companyId) {
      toast.error("Empresa nao identificada para envio de notificacao.");
      return;
    }

    setIsSending(true);
    try {
      const notification =
        await notificationsService.createNotificationForCompany(companyId, {
          user_id: selectedSeller.id,
          type: "general",
          title: "Mensagem do Gestor",
          message: renderedMessage,
        });

      if (!notification) {
        toast.error("Envio bloqueado: destinatario fora da empresa.");
        return;
      }

      toast.success("Mensagem enviada!");
      onClose();
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={shouldRender}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">
              Enviar Mensagem
            </Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 p-4"
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          >
            {isLoading ? (
              <Text className="text-[#9CA3AF]">Carregando...</Text>
            ) : null}

            {!isLoading ? (
              <>
                <View>
                  <Text className="mb-2 text-sm text-[#D1D5DB]">
                    <Users size={14} color="#9CA3AF" /> Vendedor
                  </Text>
                  <View className="mb-2 flex-row items-center gap-2 rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3">
                    <Search size={14} color="#9CA3AF" />
                    <TextInput
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      placeholder="Buscar vendedor..."
                      placeholderTextColor="#6B7280"
                      className="flex-1 py-2 text-white"
                    />
                  </View>
                  <Select
                    value={selectedSellerId}
                    placeholder="Selecione um vendedor..."
                    options={[
                      { label: "Selecione um vendedor...", value: "" },
                      ...filteredSellers.map((seller) => ({
                        label: `${seller.name}${seller.phone ? " 📱" : ""}`,
                        value: seller.id,
                      })),
                    ]}
                    onValueChange={setSelectedSellerId}
                  />
                </View>

                <View>
                  <Select
                    label="Categoria"
                    value={selectedCategory}
                    options={categories}
                    onValueChange={(value) => {
                      setSelectedCategory(value);
                      setSelectedTemplateId("");
                    }}
                  />
                </View>

                <View>
                  <Select
                    label="Template"
                    value={selectedTemplateId}
                    options={[
                      { label: "Selecione...", value: "" },
                      ...filteredTemplates.map((template) => ({ label: template.name, value: template.id })),
                    ]}
                    onValueChange={setSelectedTemplateId}
                  />
                </View>

                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm text-[#D1D5DB]">Preview</Text>
                    <Pressable
                      className="flex-row items-center gap-1"
                      onPress={handleCopy}
                      disabled={!renderedMessage}
                    >
                      {copied ? (
                        <Check stroke="#22C55E" size={14} />
                      ) : (
                        <Copy stroke="#9CA3AF" size={14} />
                      )}
                      <Text className="text-xs text-[#9CA3AF]">
                        {copied ? "Copiado!" : "Copiar"}
                      </Text>
                    </Pressable>
                  </View>
                  <View className="min-h-[140px] rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] p-3">
                    <Text className="text-sm leading-6 text-white">
                      {renderedMessage ||
                        (!selectedSeller
                          ? "Selecione um vendedor para ver o preview"
                          : "Selecione um template para ver o preview")}
                    </Text>
                  </View>
                </View>

                {selectedSeller ? (
                  <View className="rounded-lg bg-[#1A1A1A] p-2">
                    <Text className="text-xs text-[#9CA3AF]">
                      <Text className="font-semibold">Dados:</Text>{" "}
                      {selectedSeller.name} • Meta: R${" "}
                      {selectedSeller.goal.toLocaleString("pt-BR")} • Vendido:
                      R$ {selectedSeller.sales.toLocaleString("pt-BR")}
                    </Text>
                  </View>
                ) : null}

                <Button loading={isSending} onPress={handleSendAsNotification}>
                  {isSending ? "Enviando..." : "Notificacao"}
                </Button>
              </>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

import { useRouter } from "expo-router";
import { BookOpen, TrendingUp, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChecklistHeader } from "@/components/checklist/ChecklistHeader";
import { ChecklistProgress } from "@/components/checklist/ChecklistProgress";
import { ChecklistTabs } from "@/components/checklist/ChecklistTabs";
import { ChecklistTasks } from "@/components/checklist/ChecklistTasks";
import { SpecificTasksModal } from "@/components/modals/SpecificTasksModal";
import { Button } from "@/components/ui/Button";
import { useEntranceAnimation } from "@/components/ui/useEntranceAnimation";
import {
  MODAL_ANIMATION_PRESETS,
  useModalAnimation,
} from "@/components/ui/useModalAnimation";
import { ENTRANCE_ANIMATION_TOKENS } from "@/constants/animationTokens";
import { useAuth } from "@/contexts/AuthContext";
import { useToastContext } from "@/contexts/ToastContext";
import { useChecklistData } from "@/hooks/useChecklistData";
import { CHECKLIST_CONTENT } from "@/data/checklistContent";
import { usersService } from "@/services/usersService";
import type { ChecklistItem, Period } from "@/types";

export default function GestorChecklistPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToastContext();
  const [activePeriod, setActivePeriod] = useState<Period>("morning");
  const [selectedTask, setSelectedTask] = useState<ChecklistItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSpecificTasksModal, setShowSpecificTasksModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [hasDismissedCompletion, setHasDismissedCompletion] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const headerEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.routine,
    index: 0,
  });
  const tabsEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.routine,
    index: 1,
  });
  const progressEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.routine,
    index: 2,
  });
  const tasksEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.routine,
    index: 3,
  });
  const {
    shouldRender: shouldRenderCompletionModal,
    animatedBackdropStyle: completionBackdropStyle,
    animatedContentStyle: completionContentStyle,
  } = useModalAnimation(showCompletionModal, MODAL_ANIMATION_PRESETS.dialog);
  const {
    shouldRender: shouldRenderTaskDetailsModal,
    animatedBackdropStyle: taskDetailsBackdropStyle,
    animatedContentStyle: taskDetailsContentStyle,
  } = useModalAnimation(showTaskDetailsModal, MODAL_ANIMATION_PRESETS.dialog);

  const {
    isLoading,
    error,
    omcTasks,
    specificTasks,
    toggleOmcTask,
    toggleSpecificTask,
    createSpecificTask,
    updateSpecificTask,
    deleteSpecificTask,
    reload,
  } = useChecklistData();

  const getTasksForPeriod = (period: Period) => {
    const tasks = omcTasks.filter((t) => t.period === period);
    return tasks.map((task) => {
      const content = CHECKLIST_CONTENT[task.task.toLowerCase().trim()] || {
        description: "",
        detailedExplanation: "",
        lessonLink: undefined,
      };
      return {
        ...task,
        description: content.description,
        detailedExplanation: content.detailedExplanation,
        lessonLink: content.lessonLink,
      };
    });
  };

  const morningTasks = useMemo(() => getTasksForPeriod("morning"), [omcTasks]);
  const middayTasks = useMemo(() => getTasksForPeriod("midday"), [omcTasks]);
  const afternoonTasks = useMemo(
    () => getTasksForPeriod("afternoon"),
    [omcTasks],
  );
  const eveningTasks = useMemo(() => getTasksForPeriod("evening"), [omcTasks]);

  const currentTasks =
    activePeriod === "morning"
      ? morningTasks
      : activePeriod === "midday"
        ? middayTasks
        : activePeriod === "afternoon"
          ? afternoonTasks
          : eveningTasks;

  const visibleSpecificTasks = specificTasks.filter(
    (t) => t.period === activePeriod,
  );

  const completedCount = currentTasks.filter((t) => t.completed).length;
  const totalCount = currentTasks.length;

  const allPeriodsComplete =
    morningTasks.length > 0 &&
    middayTasks.length > 0 &&
    afternoonTasks.length > 0 &&
    eveningTasks.length > 0 &&
    morningTasks.every((t) => t.completed) &&
    middayTasks.every((t) => t.completed) &&
    afternoonTasks.every((t) => t.completed) &&
    eveningTasks.every((t) => t.completed);

  const handleToggleTask = async (id: string, type: "omc" | "specific") => {
    if (type === "omc") {
      await toggleOmcTask(id);
      toast.success("Tarefa OMC atualizada!");
    } else {
      await toggleSpecificTask(id);
      toast.success("Tarefa especifica atualizada!");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadSellers = async () => {
      if (!user?.company_id) return;
      const data = await usersService.getSellersByCompany(user.company_id);
      setSellers(data || []);
    };

    if (showSpecificTasksModal) {
      void loadSellers();
    }
  }, [showSpecificTasksModal, user?.company_id]);

  useEffect(() => {
    if (isLoading) return;

    if (!allPeriodsComplete) {
      setHasDismissedCompletion(false);
      return;
    }

    if (!showCompletionModal && !hasDismissedCompletion) {
      setShowCompletionModal(true);
      toast.success("Rotina completa!");
    }
  }, [
    allPeriodsComplete,
    hasDismissedCompletion,
    isLoading,
    showCompletionModal,
    toast,
  ]);

  if (!user?.company_id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-8">
        <Text className="mb-2 text-xl font-bold text-white">
          Rotina Indisponivel
        </Text>
        <Text className="text-center text-[#9CA3AF]">
          Sua conta nao tem uma empresa vinculada. E necessario ter uma empresa
          para gerar a rotina diaria.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
          />
        }
      >
        <Animated.View style={headerEntranceStyle}>
          <ChecklistHeader userRole={user?.role} />
        </Animated.View>
        <Animated.View style={tabsEntranceStyle}>
          <ChecklistTabs
            activePeriod={activePeriod}
            setActivePeriod={setActivePeriod}
          />
        </Animated.View>
        <Animated.View style={progressEntranceStyle}>
          <ChecklistProgress
            completedCount={completedCount}
            totalCount={totalCount}
            activePeriod={activePeriod}
          />
        </Animated.View>

        {isLoading ? (
          <Text className="text-center text-[#9CA3AF]">
            Carregando tarefas...
          </Text>
        ) : null}
        {error ? (
          <Text className="text-center text-red-500">{error}</Text>
        ) : null}

        {!isLoading ? (
          <Animated.View style={tasksEntranceStyle}>
          <ChecklistTasks
            userRole={user?.role}
            tasks={currentTasks}
            specificTasks={visibleSpecificTasks}
            onToggleTask={handleToggleTask}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setShowTaskDetailsModal(true);
            }}
            onShowSpecificTasksModal={() => setShowSpecificTasksModal(true)}
          />
          </Animated.View>
        ) : null}

        {completedCount === totalCount && totalCount > 0 ? (
          <View className="rounded-xl bg-green-600 p-6 text-center">
            <Text className="mb-1 text-center text-3xl">🎉</Text>
            <Text className="text-center text-lg font-semibold text-white">
              Parabens!
            </Text>
            <Text className="text-center text-sm text-white/90">
              Voce completou todas as tarefas do turno.
            </Text>
          </View>
        ) : null}

        {allPeriodsComplete ? (
          <View className="rounded-xl border border-green-500 bg-green-900/20 p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <TrendingUp stroke="#22C55E" size={18} />
              <Text className="text-base font-semibold text-green-300">
                Rotina Completa
              </Text>
            </View>
            <Text className="text-sm text-green-200">
              Voce concluiu os 4 turnos do dia com sucesso.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {showSpecificTasksModal ? (
        <SpecificTasksModal
          isOpen={showSpecificTasksModal}
          onClose={() => setShowSpecificTasksModal(false)}
          existingTasks={specificTasks}
          sellers={sellers}
          createTask={async (task) => {
            const ok = await createSpecificTask(task);
            if (ok) toast.success("Tarefa especifica criada!");
            else toast.error("Erro ao criar tarefa especifica");
            return ok;
          }}
          updateTask={async (taskId, updates) => {
            const ok = await updateSpecificTask(taskId, updates);
            if (ok) toast.success("Tarefa atualizada!");
            else toast.error("Erro ao atualizar tarefa");
            return ok;
          }}
          deleteTask={async (taskId) => {
            const ok = await deleteSpecificTask(taskId);
            if (ok) toast.success("Tarefa removida!");
            else toast.error("Erro ao remover tarefa");
            return ok;
          }}
          onTasksUpdated={reload}
        />
      ) : null}

      {shouldRenderCompletionModal ? (
        <Modal
          visible={shouldRenderCompletionModal}
          animationType="none"
          transparent
          onRequestClose={() => setShowCompletionModal(false)}
        >
          <Animated.View
            className="flex-1 items-center justify-center bg-black/80 px-5"
            style={completionBackdropStyle}
          >
            <Animated.View
              className="w-full rounded-2xl border border-[#2D2D2D] bg-[#111111] p-5"
              style={completionContentStyle}
            >
              <View className="mb-4 flex-row items-center gap-2">
                <TrendingUp stroke="#22C55E" size={20} />
                <Text className="text-base font-semibold text-green-300">
                  Parabens! Rotina Completa
                </Text>
              </View>

              <Text className="mb-5 text-sm leading-6 text-[#a3a3a3]">
                Voce finalizou todas as tarefas de todos os turnos. O que deseja
                fazer agora?
              </Text>

              <View className="gap-2">
                <Button onPress={() => router.push("/(gestor)/diario")}>
                  Ir para o Diario (Finalizar)
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    setHasDismissedCompletion(true);
                    setShowCompletionModal(false);
                  }}
                >
                  Permanecer na Tela
                </Button>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      ) : null}

      {shouldRenderTaskDetailsModal && selectedTask ? (
        <Modal
          visible={shouldRenderTaskDetailsModal}
          animationType="none"
          transparent
          onRequestClose={() => setShowTaskDetailsModal(false)}
        >
          <Animated.View
            className="flex-1 items-center justify-center bg-black/80 px-5"
            style={taskDetailsBackdropStyle}
          >
            <Animated.View
              className="w-full rounded-2xl border border-[#2D2D2D] bg-[#111111] p-5"
              style={taskDetailsContentStyle}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <BookOpen stroke="#FF6B35" size={20} />
                  <Text className="text-base font-semibold text-white">
                    Detalhes da Tarefa
                  </Text>
                </View>
                <Pressable onPress={() => setShowTaskDetailsModal(false)}>
                  <X stroke="#FFFFFF" size={18} />
                </Pressable>
              </View>

              <Text className="mb-2 text-base text-white">
                {selectedTask.task}
              </Text>
              <Text className="mb-5 text-sm leading-6 text-[#a3a3a3]">
                {selectedTask.detailedExplanation ||
                  selectedTask.description ||
                  "Sem detalhes para esta tarefa."}
              </Text>

              {selectedTask.task
                .toLowerCase()
                .includes("analise seu painel de metas") ? (
                <View className="gap-2">
                  <Button
                    onPress={() => {
                      setShowTaskDetailsModal(false);
                      router.push("/(gestor)/perfil/metas");
                    }}
                  >
                    Abrir Painel de Metas
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => setShowTaskDetailsModal(false)}
                  >
                    Fechar
                  </Button>
                </View>
              ) : (
                <Button onPress={() => setShowTaskDetailsModal(false)}>
                  Entendi
                </Button>
              )}
            </Animated.View>
          </Animated.View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

import { Plus, Save, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import type { ChecklistItem, Period } from '@/types';

interface SellerOption {
  id: string;
  full_name: string;
}

interface SpecificTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTasks: ChecklistItem[];
  sellers: SellerOption[];
  createTask: (task: {
    task: string;
    period: 'morning' | 'noon' | 'afternoon' | 'night';
    assigned_to: string;
  }) => Promise<boolean>;
  updateTask: (taskId: string, updates: Partial<ChecklistItem>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  onTasksUpdated: () => Promise<void>;
}

const periodOptions = [
  { label: 'Manha (08:45)', value: 'morning' },
  { label: 'Meio-dia (12:00)', value: 'midday' },
  { label: 'Tarde (17:45)', value: 'afternoon' },
  { label: 'Noite (18:00)', value: 'evening' },
];

export function SpecificTasksModal({
  isOpen,
  onClose,
  existingTasks,
  sellers,
  createTask,
  updateTask,
  deleteTask,
  onTasksUpdated,
}: SpecificTasksModalProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPeriod, setNewTaskPeriod] = useState<Period>('morning');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [editingTaskPeriod, setEditingTaskPeriod] = useState<Period>('morning');
  const [editingTaskAssignedTo, setEditingTaskAssignedTo] = useState<string>('all');

  const sellerOptions = useMemo(
    () => [
      { label: 'Toda equipe', value: 'all' },
      ...sellers.map((seller) => ({ label: seller.full_name, value: seller.id })),
    ],
    [sellers]
  );

  const saveNewTask = async () => {
    if (!newTaskName.trim()) return;

    setLoading(true);
    const periodDb = newTaskPeriod === 'midday' ? 'noon' : newTaskPeriod === 'evening' ? 'night' : newTaskPeriod;
    const ok = await createTask({
      task: newTaskName.trim(),
      period: periodDb,
      assigned_to: newTaskAssignedTo,
    });
    setLoading(false);

    if (ok) {
      setNewTaskName('');
      setNewTaskPeriod('morning');
      setNewTaskAssignedTo('all');
      await onTasksUpdated();
    }
  };

  const saveEditTask = async (taskId: string) => {
    if (!editingTaskName.trim()) return;
    setLoading(true);
    const ok = await updateTask(taskId, {
      task: editingTaskName.trim(),
      period: editingTaskPeriod,
      assignedTo: editingTaskAssignedTo,
    });
    setLoading(false);
    if (ok) {
      setEditingTaskId(null);
      setEditingTaskName('');
      await onTasksUpdated();
    }
  };

  const removeTask = async (taskId: string) => {
    setLoading(true);
    const ok = await deleteTask(taskId);
    setLoading(false);
    if (ok) {
      await onTasksUpdated();
    }
  };

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Tarefas Especificas</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
              <Text className="mb-3 text-sm font-semibold text-white">Nova tarefa</Text>
              <TextInput
                value={newTaskName}
                onChangeText={setNewTaskName}
                placeholder="Nome da tarefa"
                placeholderTextColor="#6B7280"
                className="mb-3 rounded-lg border border-[#2D2D2D] bg-[#111111] px-3 py-2 text-white"
              />

              <View className="mb-3">
                <Select
                  label="Periodo"
                  value={newTaskPeriod}
                  options={periodOptions}
                  onValueChange={(value) => setNewTaskPeriod(value as Period)}
                />
              </View>

              <Select
                label="Atribuir para"
                value={newTaskAssignedTo}
                options={sellerOptions}
                onValueChange={setNewTaskAssignedTo}
              />

              <View className="mt-3">
                <Button onPress={() => void saveNewTask()} loading={loading}>
                  <Plus size={14} /> Adicionar tarefa
                </Button>
              </View>
            </View>

            <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
              <Text className="mb-3 text-sm font-semibold text-white">Tarefas do dia</Text>

              {existingTasks.length === 0 ? (
                <Text className="text-sm text-[#9CA3AF]">Nenhuma tarefa especifica cadastrada hoje.</Text>
              ) : null}

              {existingTasks.map((task) => (
                <View key={task.id} className="mb-2 rounded-lg border border-[#2D2D2D] bg-[#111111] p-3">
                  {editingTaskId === task.id ? (
                    <View className="gap-2">
                      <TextInput
                        value={editingTaskName}
                        onChangeText={setEditingTaskName}
                        className="rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-2 text-white"
                        placeholder="Nome da tarefa"
                        placeholderTextColor="#6B7280"
                      />
                      <Select
                        label="Periodo"
                        value={editingTaskPeriod}
                        options={periodOptions}
                        onValueChange={(value) => setEditingTaskPeriod(value as Period)}
                      />
                      <Select
                        label="Atribuir para"
                        value={editingTaskAssignedTo}
                        options={sellerOptions}
                        onValueChange={setEditingTaskAssignedTo}
                      />
                      <Button variant="outline" onPress={() => void saveEditTask(task.id)} loading={loading}>
                        <Save size={14} /> Salvar
                      </Button>
                    </View>
                  ) : (
                    <>
                      <Text className="text-sm text-white">{task.task}</Text>
                      <Text className="mt-1 text-xs text-[#9CA3AF]">
                        {periodOptions.find((p) => p.value === task.period)?.label || task.period} •{' '}
                        {task.assignedTo === 'all'
                          ? 'Toda equipe'
                          : sellers.find((s) => s.id === task.assignedTo)?.full_name || 'Vendedor especifico'}
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskName(task.task);
                            setEditingTaskPeriod(task.period || 'morning');
                            setEditingTaskAssignedTo(task.assignedTo || 'all');
                          }}
                        >
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onPress={() => void removeTask(task.id)} loading={loading}>
                          <Trash2 size={14} /> Excluir
                        </Button>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

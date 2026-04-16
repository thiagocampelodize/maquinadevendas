import { Check, ExternalLink, Info, Plus } from 'lucide-react-native';
import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

import type { ChecklistItem } from '@/types';

interface ChecklistTasksProps {
  userRole?: 'ADMIN' | 'GESTOR' | 'VENDEDOR';
  tasks: ChecklistItem[];
  specificTasks: ChecklistItem[];
  onToggleTask: (id: string, type: 'omc' | 'specific') => void;
  onSelectTask: (task: ChecklistItem) => void;
  onShowSpecificTasksModal?: () => void;
}

export function ChecklistTasks({
  userRole,
  tasks,
  specificTasks,
  onToggleTask,
  onSelectTask,
  onShowSpecificTasksModal,
}: ChecklistTasksProps) {
  const isManager = userRole === 'GESTOR' || userRole === 'ADMIN';

  return (
    <View className="gap-4">
      <View className="rounded-xl border border-[#404040] bg-card p-4">
        <SectionBadge
          title={userRole === 'VENDEDOR' ? '📋 TAREFAS FIXAS' : '📘 METODO OMC'}
          subtitle="Tarefas fixas da metodologia"
        />

        <View className="mt-4 gap-3">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                showLesson={index === 0}
                onToggleTask={onToggleTask}
                onSelectTask={onSelectTask}
              />
            ))
          ) : (
            <EmptyState text="Nenhuma tarefa para este periodo." />
          )}
        </View>
      </View>

      {specificTasks.length > 0 ? (
        <View className="rounded-xl border border-[#404040] bg-card p-4">
          <View className="flex-row items-center justify-between">
            <SectionBadge title="🎯 TAREFAS ESPECIFICAS" subtitle="Atribuidas para equipe" />
            {isManager && onShowSpecificTasksModal ? (
              <Button size="sm" variant="outline" onPress={onShowSpecificTasksModal}>
                Gerenciar
              </Button>
            ) : null}
          </View>

          <View className="mt-4 gap-3">
            {specificTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggleTask={onToggleTask} onSelectTask={onSelectTask} />
            ))}
          </View>
        </View>
      ) : null}

      {isManager && onShowSpecificTasksModal && specificTasks.length === 0 ? (
        <Pressable
          onPress={onShowSpecificTasksModal}
          className="items-center rounded-xl border-2 border-dashed border-[#404040] bg-card p-5"
        >
          <View className="mb-2 flex-row items-center gap-2">
            <Plus stroke="#a3a3a3" size={16} />
            <Text className="text-sm text-[#a3a3a3]">Adicionar Tarefa Especifica</Text>
          </View>
          <Text className="text-xs text-[#737373]">Complementa o Metodo OMC com tarefas do seu negocio</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionBadge({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="rounded-full bg-[#2563EB] px-3 py-1">
        <Text className="text-[10px] font-semibold text-white">{title}</Text>
      </View>
      <Text className="text-xs text-[#737373]">{subtitle}</Text>
    </View>
  );
}

function TaskCard({
  task,
  showLesson,
  onToggleTask,
  onSelectTask,
}: {
  task: ChecklistItem;
  showLesson?: boolean;
  onToggleTask: (id: string, type: 'omc' | 'specific') => void;
  onSelectTask: (task: ChecklistItem) => void;
}) {
  return (
    <View
      className={`rounded-xl border p-4 ${
        task.completed ? 'border-green-500 bg-green-900/10' : 'border-[#404040] bg-card'
      }`}
    >
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => onToggleTask(task.id, task.taskType)}
          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-full border-2 ${
            task.completed ? 'border-green-500 bg-green-500' : 'border-[#404040]'
          }`}
        >
          {task.completed ? <Check stroke="#FFFFFF" size={14} /> : null}
        </Pressable>

        <View className="flex-1">
          <Text className={`mb-1 text-sm ${task.completed ? 'text-[#737373] line-through' : 'text-white'}`}>
            {task.task}
          </Text>
          {task.description ? <Text className="mb-2 text-xs text-[#a3a3a3]">{task.description}</Text> : null}

          <View className="flex-row items-center gap-3">
            <Pressable className="flex-row items-center gap-1" onPress={() => onSelectTask(task)}>
              <Info stroke="#FF6B35" size={14} />
              <Text className="text-xs text-[#FF6B35]">Ver detalhes</Text>
            </Pressable>
            {showLesson && task.lessonLink ? (
                <Pressable
                  className="flex-row items-center gap-1"
                  onPress={() => {
                    if (!task.lessonLink) return;
                    void Linking.openURL(task.lessonLink);
                  }}
                >
                <ExternalLink stroke="#FF6B35" size={14} />
                <Text className="text-xs text-[#FF6B35]">Aula explicativa</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="rounded-xl border border-[#404040] bg-card p-4">
      <Text className="text-sm text-[#a3a3a3]">{text}</Text>
    </View>
  );
}

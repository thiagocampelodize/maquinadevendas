import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { checklistService } from '@/services/checklistService';
import { specificTasksService, type SpecificTask } from '@/services/specificTasksService';
import type { ChecklistItem, Period } from '@/types';
import { getBrazilDateString } from '@/utils/dateUtils';

export interface UseChecklistDataResult {
  isLoading: boolean;
  error: string | null;
  omcTasks: ChecklistItem[];
  specificTasks: ChecklistItem[];
  toggleOmcTask: (taskId: string) => Promise<void>;
  toggleSpecificTask: (taskId: string) => Promise<void>;
  createSpecificTask: (task: Partial<SpecificTask>) => Promise<boolean>;
  updateSpecificTask: (taskId: string, updates: Partial<ChecklistItem>) => Promise<boolean>;
  deleteSpecificTask: (taskId: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useChecklistData(selectedDate?: string): UseChecklistDataResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [omcTasks, setOmcTasks] = useState<ChecklistItem[]>([]);
  const [specificTasks, setSpecificTasks] = useState<ChecklistItem[]>([]);

  const today = selectedDate || getBrazilDateString();

  const loadData = useCallback(async () => {
    if (!user?.id || !user?.company_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const checklistData = await checklistService.getChecklistWithProgress(
        user.id,
        user.company_id,
        today,
        user.role as 'ADMIN' | 'GESTOR' | 'VENDEDOR'
      );

      const omcItems: ChecklistItem[] = checklistData.map((item) => ({
        id: item.id,
        task: item.task,
        description: '',
        detailedExplanation: '',
        completed: item.completed,
        taskType: 'omc',
        period: mapPeriodFromDbPeriod(item.period),
      }));

      setOmcTasks(omcItems);

      const specificData = await specificTasksService.getTasksByDate(user.company_id, today);
      const visibleSpecificTasks = specificData.filter((task) => {
        if (user.role === 'GESTOR' || user.role === 'ADMIN') return true;
        return task.assigned_to === user.id || task.assigned_to === 'all';
      });

      const specificItems: ChecklistItem[] = visibleSpecificTasks.map((task) => ({
        id: task.id,
        task: task.task,
        description: '',
        detailedExplanation: '',
        completed: task.completed,
        taskType: 'specific',
        period: mapPeriodFromDbPeriod(task.period),
        assignedTo: task.assigned_to || 'all',
        createdBy: task.created_by,
        createdAt: task.created_at,
        completedBy: task.completed_by || undefined,
        completedAt: task.completed_at || undefined,
      }));

      setSpecificTasks(specificItems);
    } catch {
      setError('Erro ao carregar tarefas');
    } finally {
      setIsLoading(false);
    }
  }, [today, user?.company_id, user?.id, user?.role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleOmcTask = async (taskId: string) => {
    if (!user?.id || !user?.company_id) return;

    const task = omcTasks.find((t) => t.id === taskId);
    if (!task) return;

    setOmcTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)));

    const success = await checklistService.toggleChecklistItem(
      taskId,
      user.id,
      user.company_id,
      today,
      !task.completed
    );

    if (!success) {
      setOmcTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: task.completed } : t)));
    }
  };

  const toggleSpecificTask = async (taskId: string) => {
    if (!user?.id) return;
    const task = specificTasks.find((t) => t.id === taskId);
    if (!task) return;

    setSpecificTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedBy: !t.completed ? user.id : undefined,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );

    const success = await specificTasksService.toggleTask(taskId, !task.completed, user.id);
    if (!success) {
      setSpecificTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: task.completed } : t)));
    }
  };

  const createSpecificTask = async (taskData: Partial<SpecificTask>): Promise<boolean> => {
    if (!user?.id || !user?.company_id) return false;

    const result = await specificTasksService.createTask({
      company_id: user.company_id,
      task: taskData.task || '',
      period: taskData.period || 'morning',
      assigned_to: taskData.assigned_to || 'all',
      created_by: user.id,
      date: today,
    });

    if (result) {
      await loadData();
      return true;
    }

    return false;
  };

  const updateSpecificTask = async (taskId: string, updates: Partial<ChecklistItem>): Promise<boolean> => {
    const serviceUpdates: any = {};
    if (updates.task) serviceUpdates.task = updates.task;
    if (updates.assignedTo) serviceUpdates.assigned_to = updates.assignedTo;
    if (updates.period) {
      switch (updates.period) {
        case 'morning':
          serviceUpdates.period = 'morning';
          break;
        case 'midday':
          serviceUpdates.period = 'noon';
          break;
        case 'afternoon':
          serviceUpdates.period = 'afternoon';
          break;
        case 'evening':
          serviceUpdates.period = 'night';
          break;
      }
    }

    const success = await specificTasksService.updateTaskDetails(taskId, serviceUpdates);
    if (success) {
      setSpecificTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
      return true;
    }
    return false;
  };

  const deleteSpecificTask = async (taskId: string): Promise<boolean> => {
    const success = await specificTasksService.deleteTask(taskId);
    if (success) {
      setSpecificTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
    return success;
  };

  return {
    isLoading,
    error,
    omcTasks,
    specificTasks,
    toggleOmcTask,
    toggleSpecificTask,
    createSpecificTask,
    updateSpecificTask,
    deleteSpecificTask,
    reload: loadData,
  };
}

function mapPeriodFromDbPeriod(period: string): Period {
  switch (period.toLowerCase()) {
    case 'morning':
    case 'manha':
      return 'morning';
    case 'noon':
    case 'midday':
      return 'midday';
    case 'afternoon':
    case 'tarde':
      return 'afternoon';
    case 'night':
    case 'evening':
    case 'noite':
      return 'evening';
    default:
      return 'morning';
  }
}

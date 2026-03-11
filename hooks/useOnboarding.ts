import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { companiesService } from '@/services/companiesService';
import { goalsService } from '@/services/goalsService';
import { periodicGoalsService } from '@/services/periodicGoalsService';
import { usersService } from '@/services/usersService';
import { getDaysInMonthFor } from '@/utils/dateUtils';
import { parseCurrency } from '@/utils/masks';

export interface OnboardingSeller {
  id: string;
  name: string;
  individualGoal: number;
  workingDays: string[];
  dailyGoal?: number;
  dailyGoalCustom?: boolean;
  isActive?: boolean;
  avatar?: string;
  isNew?: boolean;
}

interface OnboardingDraft {
  version: 1;
  step: number;
  companyName: string;
  ownerName: string;
  monthlyGoal: string;
  initialSales: string;
  sellers: OnboardingSeller[];
  newSellerName: string;
  newSellerGoal: string;
  newSellerWorkingDays: string[];
  newSellerDailyGoal?: number;
  newSellerDailyGoalCustom: boolean;
  editingSellerId: string | null;
  updatedAt: number;
}

export function useOnboarding(onComplete: () => void) {
  const { user, refreshUser } = useAuth();
  const toast = useToastContext();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [initialSales, setInitialSales] = useState('0');

  const [sellers, setSellers] = useState<OnboardingSeller[]>([]);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerGoal, setNewSellerGoal] = useState('');
  const [newSellerWorkingDays, setNewSellerWorkingDays] = useState<string[]>([
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
  ]);
  const [newSellerDailyGoal, setNewSellerDailyGoal] = useState<number | undefined>(undefined);
  const [newSellerDailyGoalCustom, setNewSellerDailyGoalCustom] = useState(false);
  const [editingSellerId, setEditingSellerId] = useState<string | null>(null);

  const getDraftKey = (userId?: string) => (userId ? `onboardingDraft:${userId}` : 'onboardingDraft');

  const readDraft = async (userId?: string): Promise<OnboardingDraft | null> => {
    try {
      const raw = await AsyncStorage.getItem(getDraftKey(userId));
      if (!raw) return null;
      return JSON.parse(raw) as OnboardingDraft;
    } catch {
      return null;
    }
  };

  const writeDraft = async (userId: string, draft: OnboardingDraft) => {
    try {
      await AsyncStorage.setItem(getDraftKey(userId), JSON.stringify(draft));
    } catch {
      // ignore
    }
  };

  const clearDraft = async (userId?: string) => {
    try {
      await AsyncStorage.removeItem(getDraftKey(userId));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user?.id || draftLoaded) return;

    const load = async () => {
      const draft = await readDraft(user.id);
      if (draft) {
        const safeStep = Math.min(3, Math.max(1, Number(draft.step) || 1));
        setStep(safeStep);
        setCompanyName(draft.companyName || '');
        setOwnerName(draft.ownerName || '');
        setMonthlyGoal(draft.monthlyGoal || '');
        setInitialSales(draft.initialSales || '0');
        setSellers(Array.isArray(draft.sellers) ? draft.sellers : []);
        setNewSellerName(draft.newSellerName || '');
        setNewSellerGoal(draft.newSellerGoal || '');
        setNewSellerWorkingDays(
          Array.isArray(draft.newSellerWorkingDays)
            ? draft.newSellerWorkingDays
            : ['mon', 'tue', 'wed', 'thu', 'fri']
        );
        setNewSellerDailyGoal(draft.newSellerDailyGoal ?? undefined);
        setNewSellerDailyGoalCustom(Boolean(draft.newSellerDailyGoalCustom));
        setEditingSellerId(draft.editingSellerId || null);
        setDraftRestored(true);
      }
      setDraftLoaded(true);
    };

    void load();
  }, [draftLoaded, user?.id]);

  useEffect(() => {
    if (!user?.id || !draftLoaded) return;
    const draft: OnboardingDraft = {
      version: 1,
      step,
      companyName,
      ownerName,
      monthlyGoal,
      initialSales,
      sellers,
      newSellerName,
      newSellerGoal,
      newSellerWorkingDays,
      newSellerDailyGoal,
      newSellerDailyGoalCustom,
      editingSellerId,
      updatedAt: Date.now(),
    };
    void writeDraft(user.id, draft);
  }, [
    companyName,
    draftLoaded,
    editingSellerId,
    initialSales,
    monthlyGoal,
    newSellerDailyGoal,
    newSellerDailyGoalCustom,
    newSellerGoal,
    newSellerName,
    newSellerWorkingDays,
    ownerName,
    sellers,
    step,
    user?.id,
  ]);

  const handleCompleteOnboarding = async () => {
    if (!user?.id) {
      toast.error('Erro de identificacao do usuario');
      return;
    }

    setIsSaving(true);
    try {
      let companyId = user.company_id;

      if (!companyId) {
        const createdCompany = await companiesService.createCompany({
          name: companyName,
          status: 'active',
        });

        if (!createdCompany) {
          throw new Error('Erro ao criar empresa');
        }

        companyId = createdCompany.id;
        await usersService.updateUser(user.id, { company_id: companyId });
      } else {
        await companiesService.updateCompany(companyId, { name: companyName });
      }

      if (!companyId) {
        throw new Error('Empresa nao definida');
      }

      await usersService.updateUser(user.id, {
        full_name: ownerName,
        company_id: companyId,
      });

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const daysInMonth = getDaysInMonthFor(currentYear, currentMonth);

      await goalsService.upsertGoal({
        company_id: companyId,
        month: monthStr,
        meta1: parseCurrency(monthlyGoal),
        meta2: parseCurrency(monthlyGoal) * 1.2,
        supermeta: parseCurrency(monthlyGoal) * 1.5,
        realizado_anterior: parseCurrency(initialSales),
      });

      for (const seller of sellers) {
        if (seller.isNew) {
          const sanitizedName = seller.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const email = `${sanitizedName}.${Date.now()}@temp.com`;

          const createdSeller = await usersService.createUser({
            email,
            full_name: seller.name,
            role: 'VENDEDOR',
            company_id: companyId,
            individual_goal: seller.individualGoal,
            goal_2: Math.round(seller.individualGoal * 1.15),
            super_goal: Math.round(seller.individualGoal * 1.3),
            daily_goal: seller.dailyGoal,
            daily_goal_custom: seller.dailyGoalCustom,
            working_days: seller.workingDays,
            password_hash: '123456',
          });

          if (createdSeller) {
            const goal2 = Math.round(seller.individualGoal * 1.15);
            const superGoal = Math.round(seller.individualGoal * 1.3);
            const dailyGoal = seller.dailyGoal ?? Math.round((seller.individualGoal / daysInMonth) * 100) / 100;
            await periodicGoalsService.upsertMeta({
              user_id: createdSeller.id,
              mes_ref: monthStr,
              meta1: seller.individualGoal,
              meta2: goal2,
              supermeta: superGoal,
              daily_meta1: dailyGoal,
              daily_meta2: Math.round((goal2 / daysInMonth) * 100) / 100,
              daily_supermeta: Math.round((superGoal / daysInMonth) * 100) / 100,
            });
          }
        }
      }

      await refreshUser();
      await clearDraft(user.id);
      setDraftRestored(false);
      toast.success('Onboarding concluido com sucesso!');
      onComplete();
    } catch {
      toast.error('Erro ao salvar dados do onboarding');
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = useMemo(
    () =>
      Boolean(
        companyName.trim() ||
          ownerName.trim() ||
          monthlyGoal.trim() ||
          parseCurrency(initialSales) > 0 ||
          sellers.length > 0 ||
          newSellerName.trim() ||
          newSellerGoal.trim() ||
          step > 1
      ),
    [companyName, initialSales, monthlyGoal, newSellerGoal, newSellerName, ownerName, sellers.length, step]
  );

  return {
    step,
    setStep,
    companyName,
    setCompanyName,
    ownerName,
    setOwnerName,
    monthlyGoal,
    setMonthlyGoal,
    initialSales,
    setInitialSales,
    handleCompleteOnboarding,
    isSaving,
    hasUnsavedChanges,
    draftRestored,
  };
}

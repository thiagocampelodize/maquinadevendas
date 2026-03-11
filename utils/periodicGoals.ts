import { periodicGoalsService, type PeriodicGoal } from '@/services/periodicGoalsService';
import { hasValidGoal } from '@/utils/goalUtils';

interface SellerGoalSource {
  id: string;
  individual_goal?: number | null;
  goal_2?: number | null;
  super_goal?: number | null;
  daily_goal?: number | null;
  daily_goal_custom?: boolean | null;
}

interface ResolveSellerGoalsInput {
  seller: SellerGoalSource;
  periodicGoal?: PeriodicGoal;
  companyGoal?: number;
  sellersCount?: number;
  daysInMonth: number;
}

export interface ResolvedSellerGoals {
  individualGoal: number;
  goal2: number;
  superGoal: number;
  dailyGoal: number;
  dailyGoal2: number;
  dailySuperGoal: number;
}

export const getPeriodicGoalsMapWithBackfill = async <T extends SellerGoalSource>(
  sellers: T[],
  monthKey: string
): Promise<Map<string, PeriodicGoal>> => {
  const sellerIds = sellers.map((seller) => seller.id);
  const periodicGoalsMap = await periodicGoalsService.getGoalsBySellerIds(sellerIds, monthKey);

  const missingSellers = sellers.filter(
    (seller) => !periodicGoalsMap.has(seller.id) && hasValidGoal(seller.individual_goal)
  );

  if (missingSellers.length === 0) return periodicGoalsMap;

  const backfilledGoals = await Promise.all(
    missingSellers.map((seller) =>
      periodicGoalsService.upsertMeta(seller.id, monthKey, Number(seller.individual_goal || 0))
    )
  );

  backfilledGoals.forEach((goal) => {
    if (goal) periodicGoalsMap.set(goal.user_id, goal);
  });

  return periodicGoalsMap;
};

export const resolveSellerGoals = ({
  seller,
  periodicGoal,
  companyGoal = 0,
  sellersCount = 1,
  daysInMonth,
}: ResolveSellerGoalsInput): ResolvedSellerGoals => {
  const safeDaysInMonth = daysInMonth > 0 ? daysInMonth : 30;
  const safeSellersCount = sellersCount > 0 ? sellersCount : 1;
  const fallbackIndividualGoal =
    seller.individual_goal && seller.individual_goal > 0
      ? seller.individual_goal
      : companyGoal > 0
        ? Math.round(companyGoal / safeSellersCount)
        : 20000;
  const fallbackGoal2 = seller.goal_2 || Math.round(fallbackIndividualGoal * 1.15);
  const fallbackSuperGoal = seller.super_goal || Math.round(fallbackIndividualGoal * 1.3);
  const fallbackDailyGoal =
    seller.daily_goal && seller.daily_goal_custom
      ? seller.daily_goal
      : Math.round((fallbackIndividualGoal / safeDaysInMonth) * 100) / 100;

  if (periodicGoal) {
    const individualGoal = periodicGoal.meta1 || fallbackIndividualGoal;
    const goal2 = periodicGoal.meta2 || fallbackGoal2;
    const superGoal = periodicGoal.supermeta || fallbackSuperGoal;
    const dailyGoal = periodicGoal.daily_meta1 || Math.round((individualGoal / safeDaysInMonth) * 100) / 100 || fallbackDailyGoal;
    const dailyGoal2 = periodicGoal.daily_meta2 || Math.round((goal2 / safeDaysInMonth) * 100) / 100;
    const dailySuperGoal = periodicGoal.daily_supermeta || Math.round((superGoal / safeDaysInMonth) * 100) / 100;

    return {
      individualGoal,
      goal2,
      superGoal,
      dailyGoal,
      dailyGoal2,
      dailySuperGoal,
    };
  }

  const individualGoal = fallbackIndividualGoal;
  const goal2 = fallbackGoal2;
  const superGoal = fallbackSuperGoal;
  const dailyGoal = fallbackDailyGoal;
  const dailyGoal2 = Math.round((goal2 / safeDaysInMonth) * 100) / 100;
  const dailySuperGoal = Math.round((superGoal / safeDaysInMonth) * 100) / 100;

  return {
    individualGoal,
    goal2,
    superGoal,
    dailyGoal,
    dailyGoal2,
    dailySuperGoal,
  };
};

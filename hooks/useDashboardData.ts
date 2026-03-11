import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { calculateLinearProjection } from '@/domain/forecast/forecastCalculator';
import { goalsService } from '@/services/goalsService';
import { salesService } from '@/services/salesService';
import { usersService } from '@/services/usersService';
import { getPeriodicGoalsMapWithBackfill, resolveSellerGoals } from '@/utils/periodicGoals';
import {
  formatDateToISO,
  getBrazilDate,
  getBrazilMonthString,
  getCurrentDayBrazil,
  getDaysInMonthBrazil,
  getStartOfMonthBrazil,
  isSameDayBrazil,
} from '@/utils/dateUtils';
import { hasValidGoal } from '@/utils/goalUtils';

import type { SellerRanking } from '@/types';

type SellerRow = {
  id: string;
  full_name: string | null;
  phone?: string | null;
  individual_goal?: number | null;
};

export interface DashboardData {
  isLoading: boolean;
  error: string | null;
  monthlyGoal: number;
  currentSales: number;
  projection: number;
  percentageComplete: number;
  salesTeam: SellerRanking[];
  metGoalReachedCount: number;
  metGoalReachedRevenue: number;
  metGoalReachedRevenueShare: number;
  metGoalProjectedCount: number;
  metGoalProjectedRevenue: number;
  metGoalProjectedRevenueShare: number;
  totalReturns: number;
  returnsShare: number;
  totalSellers: number;
  currentDay: number;
  daysInMonth: number;
  reload: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [currentSales, setCurrentSales] = useState(0);
  const [salesTeam, setSalesTeam] = useState<SellerRanking[]>([]);
  const [totalReturns, setTotalReturns] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(getBrazilDate());

  const currentDay = useMemo(() => getCurrentDayBrazil(), []);
  const daysInMonth = useMemo(() => getDaysInMonthBrazil(), []);

  const projection = useMemo(
    () => calculateLinearProjection(currentSales, currentDay, daysInMonth).projection,
    [currentSales, currentDay, daysInMonth],
  );
  const percentageComplete = useMemo(
    () => (monthlyGoal > 0 ? (currentSales / monthlyGoal) * 100 : 0),
    [currentSales, monthlyGoal],
  );

  const {
    metGoalReachedCount,
    metGoalReachedRevenue,
    metGoalReachedRevenueShare,
    metGoalProjectedCount,
    metGoalProjectedRevenue,
    metGoalProjectedRevenueShare,
  } = useMemo(() => {
    const reached = salesTeam.filter((s) => s.hasValidGoal && s.sales >= s.goal);
    const reachedRevenue = reached.reduce((sum, s) => sum + s.sales, 0);

    const projected = salesTeam.filter((s) => {
      if (!s.hasValidGoal) return false;
      return calculateLinearProjection(s.sales, currentDay, daysInMonth).projection >= s.goal;
    });
    const projectedRevenue = projected.reduce((sum, s) => sum + s.sales, 0);

    return {
      metGoalReachedCount: reached.length,
      metGoalReachedRevenue: reachedRevenue,
      metGoalReachedRevenueShare: currentSales > 0 ? (reachedRevenue / currentSales) * 100 : 0,
      metGoalProjectedCount: projected.length,
      metGoalProjectedRevenue: projectedRevenue,
      metGoalProjectedRevenueShare: currentSales > 0 ? (projectedRevenue / currentSales) * 100 : 0,
    };
  }, [salesTeam, currentDay, daysInMonth, currentSales]);

  const loadData = useCallback(async () => {
    if (!user?.company_id) {
      setMonthlyGoal(0);
      setCurrentSales(0);
      setSalesTeam([]);
      setTotalReturns(0);
      setGrossRevenue(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startOfMonth = getStartOfMonthBrazil();
      const todayBrazil = getBrazilDate();

      const monthKey = getBrazilMonthString();

      const [goalData, allMonthSales, companyUsers] = await Promise.all([
        goalsService.getGoalByMonth(user.company_id, monthKey),
        salesService.getSalesByDateRange(
          user.company_id,
          formatDateToISO(startOfMonth),
          formatDateToISO(todayBrazil),
        ),
        usersService.getSellersByCompany(user.company_id),
      ]);

      const periodicGoalsMap = await getPeriodicGoalsMapWithBackfill(companyUsers, monthKey);

      setMonthlyGoal(goalData?.meta1 || 0);
      setCurrentSales(allMonthSales.reduce((sum, s) => sum + (s.value || 0), 0));
      setTotalReturns(
        allMonthSales.reduce((sum, sale) => {
          const value = sale.value || 0;
          return value < 0 ? sum + Math.abs(value) : sum;
        }, 0),
      );
      setGrossRevenue(
        allMonthSales.reduce((sum, sale) => {
          const value = sale.value || 0;
          return value > 0 ? sum + value : sum;
        }, 0),
      );

      const salesMap = new Map<string, number>();
      const salesTodayMap = new Map<string, number>();
      const currentDayString = formatDateToISO(todayBrazil);

      allMonthSales.forEach((sale) => {
        const val = sale.value || 0;
        salesMap.set(sale.seller_id, (salesMap.get(sale.seller_id) || 0) + val);
        if (sale.sale_date === currentDayString) {
          salesTodayMap.set(sale.seller_id, (salesTodayMap.get(sale.seller_id) || 0) + val);
        }
      });

      const ranking: SellerRanking[] = companyUsers
        .map((seller) => {
          const normalizedSeller = seller as SellerRow;
          const total = salesMap.get(seller.id) || 0;
          const totalToday = salesTodayMap.get(seller.id) || 0;
          const resolvedGoals = resolveSellerGoals({
            seller: normalizedSeller,
            periodicGoal: periodicGoalsMap.get(seller.id),
            companyGoal: goalData?.meta1 || 0,
            sellersCount: companyUsers.length,
            daysInMonth,
          });
          const goal = resolvedGoals.individualGoal;
          const validGoal = hasValidGoal(goal);

          return {
            id: seller.id,
            name: normalizedSeller.full_name || 'Vendedor',
            sales: total,
            salesToday: totalToday,
            goal,
            hasValidGoal: validGoal,
            percentageOfGoal: validGoal ? (total / goal) * 100 : 0,
            avatar: '👤',
            phone: normalizedSeller.phone || undefined,
          };
        })
        .sort((a, b) => b.sales - a.sales);

      setSalesTeam(ranking);
      setLastUpdated(getBrazilDate());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = getBrazilDate();
      if (!isSameDayBrazil(lastUpdated, now)) {
        void loadData();
      }
    }, 300000);

    return () => clearInterval(intervalId);
  }, [lastUpdated, loadData]);

  return {
    isLoading,
    error,
    monthlyGoal,
    currentSales,
    projection,
    percentageComplete,
    salesTeam,
    metGoalReachedCount,
    metGoalReachedRevenue,
    metGoalReachedRevenueShare,
    metGoalProjectedCount,
    metGoalProjectedRevenue,
    metGoalProjectedRevenueShare,
    totalReturns,
    returnsShare: grossRevenue > 0 ? (totalReturns / grossRevenue) * 100 : 0,
    totalSellers: salesTeam.length,
    currentDay,
    daysInMonth,
    reload: loadData,
  };
}

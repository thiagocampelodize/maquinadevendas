import { getBrazilDate, getDaysInMonthFor } from '@/utils/dateUtils';

export interface ForecastInput {
  currentSales: number;
  monthlyGoal: number;
  referenceDate?: Date;
  daysElapsed?: number;
  daysInMonth?: number;
}

export interface ForecastMetrics {
  currentSales: number;
  monthlyGoal: number;
  daysElapsed: number;
  daysInMonth: number;
  dailyAverage: number;
  projection: number;
  percentageComplete: number;
  remainingToGoal: number;
  remainingToProjection: number;
  willHitGoal: boolean;
}

export const getBrazilMonthProgress = (
  referenceDate?: Date
): { daysElapsed: number; daysInMonth: number } => {
  const date = referenceDate || getBrazilDate();
  const daysInMonth = getDaysInMonthFor(date.getFullYear(), date.getMonth());
  const daysElapsed = Math.min(Math.max(date.getDate(), 1), daysInMonth);
  return { daysElapsed, daysInMonth };
};

export const calculateLinearProjection = (
  currentSales: number,
  daysElapsed: number,
  daysInMonth: number
): { dailyAverage: number; projection: number } => {
  const safeSales = Number.isFinite(currentSales) ? currentSales : 0;
  const safeDaysElapsed = Number.isFinite(daysElapsed) ? Math.max(0, daysElapsed) : 0;
  const safeDaysInMonth = Number.isFinite(daysInMonth) ? Math.max(0, daysInMonth) : 0;

  if (safeDaysElapsed <= 0 || safeDaysInMonth <= 0) {
    return { dailyAverage: 0, projection: safeSales };
  }

  const dailyAverage = safeSales / safeDaysElapsed;
  const projection = dailyAverage * safeDaysInMonth;

  return { dailyAverage, projection };
};

export const calculateForecastMetrics = (input: ForecastInput): ForecastMetrics => {
  const safeSales = Number.isFinite(input.currentSales) ? input.currentSales : 0;
  const safeGoal = Number.isFinite(input.monthlyGoal) ? input.monthlyGoal : 0;

  const progress = getBrazilMonthProgress(input.referenceDate);
  const daysElapsed = input.daysElapsed ?? progress.daysElapsed;
  const daysInMonth = input.daysInMonth ?? progress.daysInMonth;

  const projectionCalc = calculateLinearProjection(safeSales, daysElapsed, daysInMonth);
  const percentageComplete = safeGoal > 0 ? (safeSales / safeGoal) * 100 : 0;
  const remainingToGoal = Math.max(0, safeGoal - safeSales);
  const remainingToProjection = Math.max(0, safeGoal - projectionCalc.projection);

  return {
    currentSales: safeSales,
    monthlyGoal: safeGoal,
    daysElapsed,
    daysInMonth,
    dailyAverage: projectionCalc.dailyAverage,
    projection: projectionCalc.projection,
    percentageComplete,
    remainingToGoal,
    remainingToProjection,
    willHitGoal: projectionCalc.projection >= safeGoal,
  };
};

export const calculateDailyGoalFromMonthly = (monthlyGoal: number, daysInMonth: number): number => {
  if (!Number.isFinite(monthlyGoal) || !Number.isFinite(daysInMonth) || daysInMonth <= 0) {
    return 0;
  }
  return monthlyGoal / daysInMonth;
};

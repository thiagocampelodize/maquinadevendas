interface SellerLike {
  workingDays?: string[];
  individualGoal?: number;
}

export const calculateWorkingDaysInMonth = (
  workingDays: string[],
  month?: number,
  year?: number
): number => {
  const today = new Date();
  const targetYear = year ?? today.getFullYear();
  const targetMonth = month ?? today.getMonth();
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  const dayMap: Record<string, number> = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6,
  };

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(targetYear, targetMonth, day);
    const dayOfWeek = date.getDay();
    const dayKey = Object.keys(dayMap).find((k) => dayMap[k] === dayOfWeek);
    if (dayKey && workingDays.includes(dayKey)) {
      count++;
    }
  }

  return count;
};

export const calculateDailyGoal = (seller: Partial<SellerLike>): number => {
  if (!seller.workingDays || seller.workingDays.length === 0) {
    return Math.round((seller.individualGoal || 0) / 22);
  }

  const workingDaysCount = calculateWorkingDaysInMonth(seller.workingDays);
  return workingDaysCount > 0 ? Math.round((seller.individualGoal || 0) / workingDaysCount) : 0;
};

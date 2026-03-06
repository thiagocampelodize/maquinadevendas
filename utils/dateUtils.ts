import { format, isSameDay as isSameDayFns, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getBrazilDate = (): Date => {
  const now = new Date();

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const valueByType = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const year = valueByType('year');
    const month = valueByType('month');
    const day = valueByType('day');
    const hour = valueByType('hour');
    const minute = valueByType('minute');
    const second = valueByType('second');

    const isoLike = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const parsed = new Date(isoLike);

    if (Number.isNaN(parsed.getTime())) {
      return now;
    }

    return parsed;
  } catch {
    return now;
  }
};

export const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatMonthToYYYYMM = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const getBrazilDateString = (): string => formatDateToISO(getBrazilDate());

export const getBrazilMonthString = (): string => formatMonthToYYYYMM(getBrazilDate());

export const getDaysInMonthFor = (year: number, monthIndex: number): number => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

export const getMonthRangeFromYYYYMM = (month: string): { startDate: string; endDate: string } => {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNumber = Number(monthStr);
  const monthIndex = Math.max(0, monthNumber - 1);
  const daysInMonth = getDaysInMonthFor(year, monthIndex);
  const paddedMonth = String(monthNumber).padStart(2, '0');

  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${String(daysInMonth).padStart(2, '0')}`,
  };
};

export const getTodayInBrazil = (): Date => startOfDay(getBrazilDate());

export const formatBrazilDate = (date: Date, formatStr: string): string => {
  return format(date, formatStr, { locale: ptBR });
};

export const getStartOfMonthBrazil = (): Date => {
  const today = getBrazilDate();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

export const getDaysInMonthBrazil = (): number => {
  const today = getBrazilDate();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
};

export const getCurrentDayBrazil = (): number => getBrazilDate().getDate();

export const isSameDayBrazil = (dateLeft: Date | number, dateRight: Date | number): boolean => {
  return isSameDayFns(dateLeft, dateRight);
};

export const getRetroactiveStartDate = (daysBack: number, referenceDate: Date = getBrazilDate()): string => {
  const safeDaysBack = Number.isFinite(daysBack) ? Math.max(0, Math.floor(daysBack)) : 0;
  const minDate = new Date(referenceDate);
  minDate.setDate(minDate.getDate() - safeDaysBack);
  return formatDateToISO(minDate);
};

export const isDateInRange = (date: string, minDate: string, maxDate: string): boolean => {
  return date >= minDate && date <= maxDate;
};

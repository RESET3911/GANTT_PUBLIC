import { addMonths, differenceInDays, eachDayOfInterval, addDays, parseISO } from 'date-fns';

export const DAY_WIDTHS: Record<number, number> = {
  1: 40,
  2: 30,
  3: 22,
  6: 14,
};

export function getTotalDays(viewStartDate: string, viewRange: number): number {
  const start = parseISO(viewStartDate);
  const end = addMonths(start, viewRange);
  return differenceInDays(end, start);
}

export function getDaysInView(viewStartDate: string, viewRange: number): Date[] {
  const start = parseISO(viewStartDate);
  const totalDays = getTotalDays(viewStartDate, viewRange);
  return eachDayOfInterval({ start, end: addDays(start, totalDays - 1) });
}

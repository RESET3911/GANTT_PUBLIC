import { addMonths, differenceInDays, eachDayOfInterval, addDays, parseISO } from 'date-fns';

export const DAY_WIDTHS: Record<number, number> = {
  1: 40,
  2: 30,
  3: 22,
  6: 14,
};

const RIGHT_EDGE_PADDING_DAYS = 5;

// extendToDate: 既存スケジュールの最終終了日（YYYY-MM-DD）。
// 表示範囲（viewRange）より先に予定がある場合、右端をその終了日まで伸ばす。
export function getTotalDays(viewStartDate: string, viewRange: number, extendToDate?: string): number {
  const start = parseISO(viewStartDate);
  const end = addMonths(start, viewRange);
  let totalDays = differenceInDays(end, start);
  if (extendToDate) {
    const extended = differenceInDays(parseISO(extendToDate), start) + 1 + RIGHT_EDGE_PADDING_DAYS;
    if (extended > totalDays) totalDays = extended;
  }
  return totalDays;
}

export function getDaysInView(viewStartDate: string, viewRange: number, extendToDate?: string): Date[] {
  const start = parseISO(viewStartDate);
  const totalDays = getTotalDays(viewStartDate, viewRange, extendToDate);
  return eachDayOfInterval({ start, end: addDays(start, totalDays - 1) });
}

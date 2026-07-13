import { Task, GroupBy } from '@/types/task';
import { STATUS_COLOR } from './status';

const COLOR_PALETTE = [
  '#60a5fa',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function paletteColor(key: string): string {
  return COLOR_PALETTE[hashString(key) % COLOR_PALETTE.length];
}

export function getTaskColor(task: Task, groupBy: GroupBy): string {
  if (task.color) return task.color;
  if (groupBy === 'category' && task.category) return paletteColor(task.category);
  if (groupBy === 'assignee' && task.assignee) return paletteColor(task.assignee);
  // メンバー・グループやグループなしは状態カラーで色分け（進行中/未開始/相談段階）
  return STATUS_COLOR[task.status] ?? '#9ca3af';
}

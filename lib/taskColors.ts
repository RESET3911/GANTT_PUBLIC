import { Task, GroupBy } from '@/types/task';

const COLOR_PALETTE = [
  '#60a5fa',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
];

const STATUS_COLORS: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#60a5fa',
  done: '#34d399',
  closed: '#d1d5db',
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

function paletteColor(key: string): string {
  return COLOR_PALETTE[hashString(key) % COLOR_PALETTE.length];
}

export function getTaskColor(task: Task, groupBy: GroupBy): string {
  if (task.color) return task.color;
  if (groupBy === 'category' && task.category) return paletteColor(task.category);
  if (groupBy === 'assignee' && task.assignee) return paletteColor(task.assignee);
  return STATUS_COLORS[task.status] ?? '#9ca3af';
}

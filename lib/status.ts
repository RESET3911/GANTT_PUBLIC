import { Task, TaskStatus } from '@/types/task';

// 表示する「進行中」系のステータス（上→下の並び順）
export const ACTIVE_STATUSES: TaskStatus[] = ['in_progress', 'todo', 'consulting'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  in_progress: '進行中',
  todo:        '未開始',
  consulting:  '相談段階',
  done:        '完了',
  closed:      '完了',
};

// 並び順: 進行中(上) → 未開始 → 相談段階(下) → 完了(最下)
export const STATUS_ORDER: Record<TaskStatus, number> = {
  in_progress: 0,
  todo:        1,
  consulting:  2,
  done:        3,
  closed:      3,
};

// バー / ドットの色
export const STATUS_COLOR: Record<TaskStatus, string> = {
  in_progress: '#6366F1', // インディゴ
  todo:        '#9CA3AF', // グレー
  consulting:  '#14B8A6', // ティール
  done:        '#34D399',
  closed:      '#D1D5DB',
};

// チップ（バッジ）配色
export const STATUS_CHIP: Record<TaskStatus, { bg: string; fg: string; border: string }> = {
  in_progress: { bg: '#EEF2FF', fg: '#4F46E5', border: '#C7D2FE' },
  todo:        { bg: '#F4F4F5', fg: '#71717A', border: '#E4E4E7' },
  consulting:  { bg: '#F0FDFA', fg: '#0D9488', border: '#99F6E4' },
  done:        { bg: '#F0FDF4', fg: '#16A34A', border: '#BBF7D0' },
  closed:      { bg: '#F4F4F5', fg: '#A1A1AA', border: '#E4E4E7' },
};

export const isFinished = (s: TaskStatus): boolean => s === 'done' || s === 'closed';

// 状態→終了日順の比較（進行中が上、相談段階が下）
export const compareByStatus = (a: Task, b: Task): number =>
  (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.endDate.localeCompare(b.endDate);

// メンバー・グルーピング用: 主担当D + メンバーを重複なしで返す
export const peopleOf = (t: Task): string[] => {
  const set = new Set<string>();
  if (t.assignee) set.add(t.assignee);
  (t.members ?? []).forEach(m => { if (m) set.add(m); });
  return set.size > 0 ? Array.from(set) : ['未割り当て'];
};

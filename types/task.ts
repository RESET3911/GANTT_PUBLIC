export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'closed';

export interface Checkpoint {
  id: string;
  date: string;    // YYYY-MM-DD（タスクの開始〜終了日の範囲内）
  label?: string;  // 表示ラベル（例: 「中間レビュー」）
  color?: string;  // カスタム色（デフォルト: アンバー）
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  startDate: string;
  endDate: string;
  status: TaskStatus;
  color?: string;
  category?: string;
  parentId?: string;
  milestoneFlag: boolean;
  checkpoints?: Checkpoint[];
  notes?: string;
  gcalEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export type GroupBy = 'none' | 'assignee' | 'category' | 'parent';
export type FilterStatus = TaskStatus | 'all' | 'not_closed';

export interface ViewState {
  viewStartDate: string;
  viewRange: 1 | 2 | 3 | 6;
  groupBy: GroupBy;
  filterStatus: FilterStatus;
}

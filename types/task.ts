// consulting=相談段階, todo=未開始, in_progress=進行中, done/closed=完了(終了)
export type TaskStatus = 'consulting' | 'todo' | 'in_progress' | 'done' | 'closed';

export interface Checkpoint {
  id: string;
  date: string;      // YYYY-MM-DD（タスクの開始〜終了日の範囲内）
  label?: string;    // 表示ラベル（例: 「中間レビュー」）
  color?: string;    // カスタム色（デフォルト: アンバー）
  assignee?: string; // 担当アーティスト
}

export interface Task {
  id: string;
  title: string;
  assignee: string;       // 主担当（D）
  members?: string[];     // プロジェクトメンバー（Dを除く追加メンバー）
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

export type GroupBy = 'none' | 'assignee' | 'member' | 'category' | 'parent';

export interface ViewState {
  viewStartDate: string;
  viewRange: 1 | 2 | 3 | 6;
  groupBy: GroupBy;
  showDone: boolean;   // 完了（終了）を表示するか
}

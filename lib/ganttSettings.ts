import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'gantt_public_config', 'settings');

export interface MemberInOut {
  inDate?: string;   // 参加日（YYYY-MM-DD、任意）
  outDate?: string;  // 離脱日（YYYY-MM-DD、任意）
}

export interface GanttSettings {
  assignees: string[];                    // メンバー名簿（D・メンバー選択用）
  memberDepts?: Record<string, string>;   // メンバー名 → Dept（所属）
  memberInOut?: Record<string, MemberInOut>; // メンバー名 → IN/OUT日（任意）
  gcalCalendarId?: string;
}

// メンバー名から Dept を引く
export const deptOf = (settings: GanttSettings, name: string): string | undefined =>
  name ? settings.memberDepts?.[name] : undefined;

export interface InOutConflict { name: string; reason: string; }

// タスクの担当(D)・メンバーが、そのタスクの日程中に IN/OUT 範囲外になっていないかチェック
export function inOutConflicts(
  task: { assignee: string; members?: string[]; startDate: string; endDate: string },
  memberInOut: Record<string, MemberInOut>
): InOutConflict[] {
  const people = new Set<string>();
  if (task.assignee) people.add(task.assignee);
  (task.members ?? []).forEach(m => { if (m) people.add(m); });

  const conflicts: InOutConflict[] = [];
  people.forEach(name => {
    const io = memberInOut[name];
    if (!io) return;
    if (io.inDate && task.startDate < io.inDate) {
      conflicts.push({ name, reason: `${name}: IN日（${io.inDate.replace(/-/g, '/')}）より前に開始` });
    }
    if (io.outDate && task.endDate > io.outDate) {
      conflicts.push({ name, reason: `${name}: OUT日（${io.outDate.replace(/-/g, '/')}）より後まで継続` });
    }
  });
  return conflicts;
}

export function subscribeGanttSettings(
  onData: (settings: GanttSettings) => void
): () => void {
  return onSnapshot(SETTINGS_DOC, snap => {
    if (snap.exists()) {
      onData(snap.data() as GanttSettings);
    } else {
      onData({ assignees: [] });
    }
  });
}

export async function saveGanttSettings(settings: GanttSettings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings, { merge: true });
}

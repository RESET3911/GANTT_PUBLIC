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

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'gantt_public_config', 'settings');

export interface GanttSettings {
  assignees: string[];                    // メンバー名簿（D・メンバー選択用）
  memberDepts?: Record<string, string>;   // メンバー名 → Dept（所属）
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

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'gantt_config', 'settings');

export interface GanttSettings {
  assignees: string[];
  gcalCalendarId?: string;
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

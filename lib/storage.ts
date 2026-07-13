import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Task } from '@/types/task';

const COLLECTION = 'gantt_public_tasks';

// Firestore は undefined を含むデータを保存できないため、ネストも含めて再帰的に除去する
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as object)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as T;
  }
  return value;
}

export function subscribeTasks(
  callback: (tasks: Task[]) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    snap => {
      const tasks = snap.docs.map(d => d.data() as Task);
      // Sort by startDate client-side
      tasks.sort((a, b) => a.startDate.localeCompare(b.startDate));
      callback(tasks);
    },
    () => onError?.()
  );
}

export async function saveTask(task: Task): Promise<void> {
  await setDoc(doc(db, COLLECTION, task.id), stripUndefined(task));
}

export async function updateTaskFields(
  id: string,
  data: Partial<Task>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), stripUndefined(data));
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

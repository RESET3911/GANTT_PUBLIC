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

const COLLECTION = 'gantt_tasks';

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
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

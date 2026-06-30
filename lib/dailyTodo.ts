import { db } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export interface DailyTodo {
  id: string;
  date: string;
  text: string;
  done: boolean;
  createdAt: string;
}

const COLLECTION = 'gantt_daily_todos';

export function subscribeDailyTodos(cb: (todos: DailyTodo[]) => void): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    snap => cb(snap.docs.map(d => d.data() as DailyTodo).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
  );
}

export async function addDailyTodo(todo: DailyTodo): Promise<void> {
  await setDoc(doc(db, COLLECTION, todo.id), todo);
}

export async function toggleDailyTodo(id: string, done: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { done });
}

export async function deleteDailyTodo(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

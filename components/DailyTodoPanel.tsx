'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { DailyTodo, addDailyTodo, toggleDailyTodo, deleteDailyTodo } from '@/lib/dailyTodo';

interface Props { todos: DailyTodo[]; readOnly?: boolean; }

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function DailyTodoPanel({ todos, readOnly = false }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [inputMap,   setInputMap]   = useState<Record<string, string>>({});

  const today     = new Date();
  const todayStr  = format(today, 'yyyy-MM-dd');
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const dates     = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDate = useMemo(() => {
    const m: Record<string, DailyTodo[]> = {};
    for (const t of todos) { if (!m[t.date]) m[t.date] = []; m[t.date].push(t); }
    return m;
  }, [todos]);

  const handleAdd = async (ds: string) => {
    const text = (inputMap[ds] ?? '').trim();
    if (!text) return;
    await addDailyTodo({ id: uuidv4(), date: ds, text, done: false, createdAt: new Date().toISOString() });
    setInputMap(p => ({ ...p, [ds]: '' }));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' }}>

      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '5px 14px', borderBottom: '1px solid var(--bd)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 2, height: 11, borderRadius: 1, background: 'var(--accent)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>日次 ToDo</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={() => setWeekOffset(0)} style={{ fontSize: 10.5, color: 'var(--accent)', padding: '2px 9px', borderRadius: 6, background: 'var(--accent-soft)', border: '1px solid rgba(196,98,26,0.25)', cursor: 'pointer', fontWeight: 700 }}>
            今週
          </button>
          {[-1, 1].map(d => (
            <button key={d} onClick={() => setWeekOffset(w => w + d)} style={{ fontSize: 15, color: 'var(--t3)', padding: '1px 6px', borderRadius: 6, background: 'transparent', border: '1px solid var(--bd)', cursor: 'pointer', lineHeight: 1.2 }}>
              {d === -1 ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', height: '100%', minWidth: dates.length * 150 }}>
          {dates.map(date => {
            const ds      = format(date, 'yyyy-MM-dd');
            const isTd    = ds === todayStr;
            const all     = byDate[ds] ?? [];
            const done    = all.filter(t => t.done);
            const open    = all.filter(t => !t.done);
            const day     = DAY_NAMES[date.getDay()];
            const isSat   = date.getDay() === 6;
            const isSun   = date.getDay() === 0;
            const dayColor = isTd ? 'var(--accent)' : isSat ? '#3B82F6' : isSun ? '#EF4444' : 'var(--t2)';

            return (
              <div key={ds} style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--bd-light)', flex: 1, minWidth: 150, background: isTd ? 'rgba(196,98,26,0.03)' : 'transparent' }}>

                {/* Day header */}
                <div style={{ padding: '5px 11px', borderBottom: '1px solid var(--bd-light)', flexShrink: 0, background: isTd ? 'rgba(196,98,26,0.06)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: dayColor }}>{format(date, 'M/d')}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: dayColor, opacity: 0.75 }}>{day}</span>
                  {isTd && <span style={{ fontSize: 8.5, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '1px 5px', borderRadius: 10, letterSpacing: '0.04em' }}>TODAY</span>}
                  {all.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: done.length === all.length ? '#16A34A' : 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {done.length}/{all.length}
                    </span>
                  )}
                </div>

                {/* Todo list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '5px 9px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {open.map(todo => (
                    <div key={todo.id} className="group" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <div onClick={() => !readOnly && toggleDailyTodo(todo.id, true)} style={{ marginTop: 3, flexShrink: 0, width: 13, height: 13, borderRadius: 3, border: '1.5px solid var(--bd)', background: 'var(--surface)', cursor: readOnly ? 'default' : 'pointer', transition: 'all .15s' }} />
                      <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.5, color: 'var(--t1)', wordBreak: 'break-word' }}>{todo.text}</span>
                      {!readOnly && (
                        <button onClick={() => deleteDailyTodo(todo.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--t3)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  ))}
                  {done.map(todo => (
                    <div key={todo.id} className="group" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, opacity: 0.5 }}>
                      <div onClick={() => !readOnly && toggleDailyTodo(todo.id, false)} style={{ marginTop: 3, flexShrink: 0, width: 13, height: 13, borderRadius: 3, border: '1.5px solid #86EFAC', background: '#F0FDF4', cursor: readOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                        <svg width="7" height="6" viewBox="0 0 8 7" fill="none"><path d="M1 3.5l2 2 4-4" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.5, textDecoration: 'line-through', color: 'var(--t3)', wordBreak: 'break-word' }}>{todo.text}</span>
                      {!readOnly && (
                        <button onClick={() => deleteDailyTodo(todo.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--t3)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input */}
                {!readOnly && (
                  <div style={{ padding: '4px 9px', borderTop: '1px solid var(--bd-light)', flexShrink: 0 }}>
                    <input type="text" value={inputMap[ds] ?? ''} onChange={e => setInputMap(p => ({ ...p, [ds]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(ds); } }} placeholder="+ 追加"
                      style={{ width: '100%', fontSize: 11, color: 'var(--t2)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

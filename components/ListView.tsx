'use client';

import { useState, useMemo } from 'react';
import { differenceInDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task, ViewState, TaskStatus } from '@/types/task';

type Props = {
  tasks: Task[];
  viewState: ViewState;
  onTaskClick: (task: Task) => void;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未着手', in_progress: '進行中', done: '完了', closed: 'クローズ',
};

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  todo:        { background: '#F4F4F5', color: '#71717A',  border: '1px solid #E4E4E7' },
  in_progress: { background: '#EEF2FF', color: '#4F46E5',  border: '1px solid #C7D2FE' },
  done:        { background: '#F0FDF4', color: '#16A34A',  border: '1px solid #BBF7D0' },
  closed:      { background: '#F4F4F5', color: '#A1A1AA',  border: '1px solid #E4E4E7' },
};

function daysRemaining(endDate: string): { label: string; color: string } {
  const d = differenceInDays(parseISO(endDate), startOfDay(new Date()));
  if (d < 0)  return { label: `${Math.abs(d)}日超過`, color: '#EF4444' };
  if (d === 0) return { label: '今日まで', color: '#F97316' };
  if (d <= 3)  return { label: `残り${d}日`,  color: '#F59E0B' };
  return            { label: `残り${d}日`,  color: 'var(--t3)' };
}

function TaskRow({ task, onTaskClick }: { task: Task; onTaskClick: (t: Task) => void }) {
  const rem      = daysRemaining(task.endDate);
  const today    = startOfDay(new Date());
  const overdue  = isBefore(parseISO(task.endDate), today) && task.status !== 'done' && task.status !== 'closed';
  const isDone   = task.status === 'done' || task.status === 'closed';

  return (
    <tr onClick={() => onTaskClick(task)} className="row-hover group"
      style={{ borderBottom: '1px solid var(--bd-light)', cursor: 'pointer', background: overdue ? 'rgba(239,68,68,0.025)' : 'transparent', opacity: isDone ? 0.55 : 1, transition: 'background .1s' }}>

      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, display: 'inline-block', ...STATUS_STYLE[task.status] }}>
          {STATUS_LABELS[task.status]}
        </span>
      </td>

      <td style={{ padding: '9px 14px', maxWidth: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.milestoneFlag && <span style={{ color: '#D97706', fontSize: 10, flexShrink: 0 }}>◆</span>}
          <span className="group-hover:underline" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </span>
        </div>
        {task.notes && <span style={{ fontSize: 10.5, color: 'var(--t3)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.notes}</span>}
      </td>

      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{task.assignee || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{task.category || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
      <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--t2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{task.startDate.replace(/-/g, '/')}</td>
      <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--t2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{task.endDate.replace(/-/g, '/')}</td>
      <td style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: rem.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
        {isDone ? <span style={{ color: 'var(--t3)' }}>—</span> : rem.label}
      </td>
      <td style={{ padding: '9px 14px', textAlign: 'center', fontSize: 11 }}>
        {task.gcalEventId ? <span style={{ color: '#4F46E5' }}>●</span> : <span style={{ color: 'var(--bd)' }}>—</span>}
      </td>
    </tr>
  );
}

function SectionHeader({ label, count, accent, collapsed, onToggle }: { label: string; count: number; accent: string; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <tr style={{ background: 'var(--surface-2)', cursor: onToggle ? 'pointer' : 'default', userSelect: 'none', borderBottom: '1px solid var(--bd)' }} onClick={onToggle}>
      <td colSpan={8} style={{ padding: '7px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 2, height: 12, borderRadius: 1, background: accent, flexShrink: 0 }} />
          {onToggle && <span style={{ fontSize: 9, color: 'var(--t3)', lineHeight: 1 }}>{collapsed ? '▶' : '▼'}</span>}
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.03em' }}>{label}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, padding: '1px 8px', borderRadius: 20, fontFamily: 'var(--font-mono)', border: `1px solid ${accent}30` }}>{count}</span>
        </div>
      </td>
    </tr>
  );
}

export default function ListView({ tasks, viewState, onTaskClick }: Props) {
  const [doneExpanded, setDoneExpanded] = useState(false);

  const filtered   = useMemo(() => tasks.filter(t => {
    if (viewState.filterStatus === 'all')        return true;
    if (viewState.filterStatus === 'not_closed') return t.status !== 'closed';
    return t.status === viewState.filterStatus;
  }), [tasks, viewState.filterStatus]);

  const inProgress = useMemo(() => filtered.filter(t => t.status === 'in_progress').sort((a, b) => a.endDate.localeCompare(b.endDate)), [filtered]);
  const todo       = useMemo(() => filtered.filter(t => t.status === 'todo')        .sort((a, b) => a.endDate.localeCompare(b.endDate)), [filtered]);
  const done       = useMemo(() => filtered.filter(t => t.status === 'done' || t.status === 'closed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [filtered]);

  const th: React.CSSProperties = {
    textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'var(--t3)',
    padding: '9px 14px', whiteSpace: 'nowrap', background: 'var(--surface-2)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: '2px solid var(--bd)',
    position: 'sticky', top: 0, zIndex: 10,
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--canvas)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>状態</th>
            <th style={th}>件名</th>
            <th style={th}>担当者</th>
            <th style={th}>カテゴリー</th>
            <th style={th}>開始日</th>
            <th style={th}>終了日</th>
            <th style={th}>残り</th>
            <th style={th}>GCal</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '64px 0', color: 'var(--t3)', fontSize: 13 }}>タスクがありません</td></tr>
          )}
          {inProgress.length > 0 && (<><SectionHeader label="進行中" count={inProgress.length} accent="var(--accent)" />{inProgress.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}</>)}
          {todo.length > 0       && (<><SectionHeader label="未着手" count={todo.length}       accent="var(--t3)"    />{todo.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}</>)}
          {done.length > 0       && (<><SectionHeader label="完了済み" count={done.length} accent="#16A34A" collapsed={!doneExpanded} onToggle={() => setDoneExpanded(v => !v)} />{doneExpanded && done.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}</>)}
        </tbody>
      </table>
    </div>
  );
}

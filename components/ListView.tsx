'use client';

import { useMemo } from 'react';
import { differenceInDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task, ViewState } from '@/types/task';
import { STATUS_LABEL, STATUS_CHIP, STATUS_COLOR, isFinished } from '@/lib/status';

type Props = {
  tasks: Task[];
  viewState: ViewState;
  memberDepts?: Record<string, string>;
  onTaskClick: (task: Task) => void;
};

const COL_COUNT = 8;

const DeptTag = ({ dept }: { dept?: string }) =>
  dept ? (
    <span style={{ fontSize: 9.5, fontWeight: 600, color: '#0D9488', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 4, padding: '0px 5px', whiteSpace: 'nowrap', marginLeft: 5 }}>{dept}</span>
  ) : null;

function daysRemaining(endDate: string): { label: string; color: string } {
  const d = differenceInDays(parseISO(endDate), startOfDay(new Date()));
  if (d < 0)  return { label: `${Math.abs(d)}日超過`, color: '#EF4444' };
  if (d === 0) return { label: '今日まで', color: '#F97316' };
  if (d <= 3)  return { label: `残り${d}日`,  color: '#F59E0B' };
  return            { label: `残り${d}日`,  color: 'var(--t3)' };
}

function TaskRow({ task, memberDepts, onTaskClick }: { task: Task; memberDepts: Record<string, string>; onTaskClick: (t: Task) => void }) {
  const rem      = daysRemaining(task.endDate);
  const today    = startOfDay(new Date());
  const overdue  = isBefore(parseISO(task.endDate), today) && !isFinished(task.status);
  const done     = isFinished(task.status);

  return (
    <tr onClick={() => onTaskClick(task)} className="row-hover group"
      style={{ borderBottom: '1px solid var(--bd-light)', cursor: 'pointer', background: overdue ? 'rgba(239,68,68,0.025)' : 'transparent', opacity: done ? 0.55 : 1, transition: 'background .1s' }}>

      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, display: 'inline-block', background: STATUS_CHIP[task.status].bg, color: STATUS_CHIP[task.status].fg, border: `1px solid ${STATUS_CHIP[task.status].border}` }}>
          {STATUS_LABEL[task.status]}
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

      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap', fontWeight: 500 }}>
        {task.assignee ? <span style={{ display: 'inline-flex', alignItems: 'center' }}>{task.assignee}<DeptTag dept={memberDepts[task.assignee]} /></span> : <span style={{ color: 'var(--t3)' }}>—</span>}
      </td>
      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--t2)', maxWidth: 220 }}>
        {task.members && task.members.length > 0
          ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'center' }}>{task.members.map(m => <span key={m} style={{ display: 'inline-flex', alignItems: 'center' }}>{m}<DeptTag dept={memberDepts[m]} /></span>)}</span>
          : <span style={{ color: 'var(--t3)' }}>—</span>}
      </td>
      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{task.category || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
      <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--t2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{task.startDate.replace(/-/g, '/')}</td>
      <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--t2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{task.endDate.replace(/-/g, '/')}</td>
      <td style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: rem.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
        {done ? <span style={{ color: 'var(--t3)' }}>—</span> : rem.label}
      </td>
    </tr>
  );
}

function SectionHeader({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--bd)' }}>
      <td colSpan={COL_COUNT} style={{ padding: '7px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 2, height: 12, borderRadius: 1, background: accent, flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.03em' }}>{label}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, padding: '1px 8px', borderRadius: 20, fontFamily: 'var(--font-mono)', border: `1px solid ${accent}30` }}>{count}</span>
        </div>
      </td>
    </tr>
  );
}

export default function ListView({ tasks, viewState, memberDepts = {}, onTaskClick }: Props) {
  // 進行中(上) → 未開始 → 相談段階(下)。完了はトグルONのときだけ最下部に。
  const byEnd = (a: Task, b: Task) => a.endDate.localeCompare(b.endDate);
  const inProgress = useMemo(() => tasks.filter(t => t.status === 'in_progress').sort(byEnd), [tasks]);
  const todo       = useMemo(() => tasks.filter(t => t.status === 'todo').sort(byEnd), [tasks]);
  const consulting = useMemo(() => tasks.filter(t => t.status === 'consulting').sort(byEnd), [tasks]);
  const done       = useMemo(() => tasks.filter(t => isFinished(t.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [tasks]);

  const totalVisible = inProgress.length + todo.length + consulting.length + (viewState.showDone ? done.length : 0);

  const th: React.CSSProperties = {
    textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'var(--t3)',
    padding: '9px 14px', whiteSpace: 'nowrap', background: 'var(--surface-2)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: '2px solid var(--bd)',
    position: 'sticky', top: 0, zIndex: 10,
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--canvas)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>状態</th>
            <th style={th}>件名</th>
            <th style={th}>D</th>
            <th style={th}>メンバー</th>
            <th style={th}>カテゴリー</th>
            <th style={th}>開始日</th>
            <th style={th}>終了日</th>
            <th style={th}>残り</th>
          </tr>
        </thead>
        <tbody>
          {totalVisible === 0 && (
            <tr><td colSpan={COL_COUNT} style={{ textAlign: 'center', padding: '64px 0', color: 'var(--t3)', fontSize: 13 }}>タスクがありません</td></tr>
          )}
          {inProgress.length > 0 && (<><SectionHeader label="進行中" count={inProgress.length} accent={STATUS_COLOR.in_progress} />{inProgress.map(t => <TaskRow key={t.id} task={t} memberDepts={memberDepts} onTaskClick={onTaskClick} />)}</>)}
          {todo.length > 0       && (<><SectionHeader label="未開始" count={todo.length}       accent={STATUS_COLOR.todo}        />{todo.map(t => <TaskRow key={t.id} task={t} memberDepts={memberDepts} onTaskClick={onTaskClick} />)}</>)}
          {consulting.length > 0 && (<><SectionHeader label="相談段階" count={consulting.length} accent={STATUS_COLOR.consulting}  />{consulting.map(t => <TaskRow key={t.id} task={t} memberDepts={memberDepts} onTaskClick={onTaskClick} />)}</>)}
          {viewState.showDone && done.length > 0 && (<><SectionHeader label="完了" count={done.length} accent="#16A34A" />{done.map(t => <TaskRow key={t.id} task={t} memberDepts={memberDepts} onTaskClick={onTaskClick} />)}</>)}
        </tbody>
      </table>
    </div>
  );
}

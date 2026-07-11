'use client';

import { useMemo } from 'react';
import { parseISO, differenceInDays, addDays } from 'date-fns';
import { Task, ViewState } from '@/types/task';
import { MemberInOut, inOutConflicts } from '@/lib/ganttSettings';
import { getTotalDays } from '@/lib/dateUtils';
import { isFinished, peopleOf } from '@/lib/status';

type Props = {
  tasks: Task[];
  viewState: ViewState;
  memberDepts?: Record<string, string>;
  memberInOut?: Record<string, MemberInOut>;
};

type Row = { name: string; count: number; days: number; conflict: boolean };

export default function WorkloadView({ tasks, viewState, memberDepts = {}, memberInOut = {} }: Props) {
  const viewStart  = parseISO(viewState.viewStartDate);
  const windowDays = getTotalDays(viewState.viewStartDate, viewState.viewRange);
  const viewEndExclusive = addDays(viewStart, windowDays);

  const rows: Row[] = useMemo(() => {
    const map = new Map<string, Row>();
    tasks.forEach(task => {
      if (isFinished(task.status)) return;
      const ts = parseISO(task.startDate);
      const teExclusive = addDays(parseISO(task.endDate), 1);
      const overlapStart = ts > viewStart ? ts : viewStart;
      const overlapEnd   = teExclusive < viewEndExclusive ? teExclusive : viewEndExclusive;
      const overlapDays  = Math.max(0, differenceInDays(overlapEnd, overlapStart));
      const conflicts = inOutConflicts(task, memberInOut);
      peopleOf(task).forEach(name => {
        const row = map.get(name) ?? { name, count: 0, days: 0, conflict: false };
        row.count += 1;
        row.days  += overlapDays;
        if (conflicts.some(c => c.name === name)) row.conflict = true;
        map.set(name, row);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.days - a.days || b.count - a.count);
  }, [tasks, viewStart, viewEndExclusive, memberInOut]);

  const withDept = (n: string) => (memberDepts[n] ? `${n}（${memberDepts[n]}）` : n);

  return (
    <div className="flex-1 overflow-auto min-h-0" style={{ background: 'var(--canvas)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '22px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 6 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>メンバー別 稼働状況</h3>
          <span style={{ fontSize: 10.5, color: 'var(--t3)' }}>
            表示中の期間（{format_(viewState.viewStartDate)} 〜 {windowDays}日間）内の割り当て日数を基準に算出
          </span>
        </div>

        {rows.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--t3)', padding: '24px 0', textAlign: 'center' }}>進行中のタスクがありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(row => {
              const pct  = windowDays > 0 ? Math.round((row.days / windowDays) * 100) : 0;
              const over = pct > 100;
              return (
                <div key={row.name} style={{ background: 'var(--surface)', border: '1px solid var(--bd)', borderRadius: 10, padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)' }}>{withDept(row.name)}</span>
                    {row.conflict && (
                      <span title="IN/OUT期間外にまたがるタスクを含みます" style={{ width: 14, height: 14, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>!</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--t3)' }}>未完了 {row.count}件</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: over ? '#DC2626' : 'var(--accent)', fontFamily: 'var(--font-mono)', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bd-light)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 3, background: over ? '#DC2626' : 'var(--accent)', transition: 'width .3s ease' }} />
                  </div>
                  {over && (
                    <p style={{ fontSize: 10, color: '#DC2626', marginTop: 5 }}>この期間の稼働日数が表示範囲を超えています（タスクの重複割り当ての可能性）</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function format_(iso: string): string {
  return iso.replace(/-/g, '/');
}

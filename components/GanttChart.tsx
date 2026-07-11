'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { parseISO, differenceInDays, format, isWeekend, isToday, addDays } from 'date-fns';
import { Task, ViewState, GroupBy, Checkpoint } from '@/types/task';
import { MemberInOut } from '@/lib/ganttSettings';
import { getDaysInView, getTotalDays, DAY_WIDTHS } from '@/lib/dateUtils';
import { getTaskColor } from '@/lib/taskColors';
import { isFinished, compareByStatus, peopleOf } from '@/lib/status';

const LEFT_PANEL_WIDTH = 380;
const ROW_HEIGHT        = 42;
const HEADER_MONTH_H   = 24;
const HEADER_DAY_H     = 28;
const GROUP_ROW_H      = 30;
const DRAG_THRESHOLD   = 5;

type DragInfo = {
  taskId: string;
  type: 'move' | 'resize-right' | 'resize-left';
  startClientX: number;
  origStart: string;
  origEnd: string;
  curStart: string;
  curEnd: string;
};

type DisplayRow =
  | { type: 'group'; label: string; key: string }
  | { type: 'task'; task: Task };

function buildDisplayRows(tasks: Task[], vs: ViewState, memberDepts: Record<string, string>): DisplayRow[] {
  // 完了（終了）は既定で非表示。トグルONで表示。
  const visible = tasks.filter(t => vs.showDone || !isFinished(t.status));

  // グループなし: 状態順（進行中→未開始→相談段階）に並べる
  if (vs.groupBy === 'none') {
    return visible.slice().sort(compareByStatus).map(t => ({ type: 'task', task: t }));
  }

  const groups = new Map<string, Task[]>();
  const push = (k: string, t: Task) => { if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(t); };

  visible.forEach(t => {
    if (vs.groupBy === 'assignee') push(t.assignee || '未割り当て', t);
    else if (vs.groupBy === 'category') push(t.category || 'カテゴリなし', t);
    else if (vs.groupBy === 'parent') push(t.parentId ? (tasks.find(p => p.id === t.parentId)?.title || t.parentId) : 'トップレベル', t);
    else if (vs.groupBy === 'member') peopleOf(t).forEach(m => push(m, t)); // メンバーごとにラインを複製
  });

  // D/メンバーのグループは Dept を見出しに添える
  const showDept = vs.groupBy === 'member' || vs.groupBy === 'assignee';
  const rows: DisplayRow[] = [];
  Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'ja')).forEach(key => {
    const dept = showDept ? memberDepts[key] : undefined;
    rows.push({ type: 'group', label: dept ? `${key} · ${dept}` : key, key });
    groups.get(key)!.slice().sort(compareByStatus).forEach(t => rows.push({ type: 'task', task: t }));
  });
  return rows;
}

type Props = {
  tasks: Task[];
  viewState: ViewState;
  memberDepts?: Record<string, string>;
  memberInOut?: Record<string, MemberInOut>;
  readOnly?: boolean;
  onTaskClick: (task: Task) => void;
  onDateClick?: (date: string) => void;
  onTaskDragEnd?: (task: Task, newStart: string, newEnd: string) => void;
  onViewStateChange?: (vs: ViewState) => void;
  onGoToToday?: () => void;
};

export default function GanttChart({ tasks, viewState, memberDepts = {}, memberInOut = {}, readOnly = false, onTaskClick, onDateClick, onTaskDragEnd, onViewStateChange, onGoToToday }: Props) {
  const [panelVisible,   setPanelVisible]   = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [dragPreview,    setDragPreview]    = useState<{ taskId: string; start: string; end: string } | null>(null);
  const [isDragging,     setIsDragging]     = useState(false);
  const [showFloatToday, setShowFloatToday] = useState(false);

  const withDept = (n: string) => (memberDepts[n] ? `${n}（${memberDepts[n]}）` : n);

  const dragInfo   = useRef<DragInfo | null>(null);
  const didDrag    = useRef(false);
  const tasksRef   = useRef(tasks);
  const scrollRef  = useRef<HTMLDivElement>(null);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const dayWidth        = DAY_WIDTHS[viewState.viewRange];
  const viewStart       = parseISO(viewState.viewStartDate);
  // 既存スケジュールの最終終了日: 表示範囲(viewRange)を超えて先の予定があれば、
  // 右にスライドして見られるよう表示幅をそこまで拡張する（それより先へは伸ばさない）
  const latestTaskEnd = useMemo(() => tasks.reduce<string | undefined>(
    (mx, t) => (!mx || t.endDate > mx) ? t.endDate : mx, undefined
  ), [tasks]);
  const totalDays       = useMemo(() => getTotalDays(viewState.viewStartDate, viewState.viewRange, latestTaskEnd), [viewState.viewStartDate, viewState.viewRange, latestTaskEnd]);
  const days            = useMemo(() => getDaysInView(viewState.viewStartDate, viewState.viewRange, latestTaskEnd), [viewState.viewStartDate, viewState.viewRange, latestTaskEnd]);
  const totalGanttWidth = totalDays * dayWidth;
  const leftW           = panelVisible ? LEFT_PANEL_WIDTH : 40;

  const displayRows = useMemo(() => buildDisplayRows(tasks, viewState, memberDepts), [tasks, viewState, memberDepts]);
  const { rowYs, totalHeight } = useMemo(() => {
    const ys: number[] = []; let y = 0;
    displayRows.forEach(row => { ys.push(y); y += row.type === 'group' ? GROUP_ROW_H : ROW_HEIGHT; });
    return { rowYs: ys, totalHeight: y };
  }, [displayRows]);

  // D/メンバーでグルーピングしている時、各グループ（＝1人分）の行範囲。IN/OUT目印の描画に使う
  const groupSpans = useMemo(() => {
    const spans: { key: string; top: number; bottom: number }[] = [];
    displayRows.forEach((row, i) => {
      if (row.type !== 'group') return;
      let bottom = totalHeight;
      for (let j = i + 1; j < displayRows.length; j++) {
        if (displayRows[j].type === 'group') { bottom = rowYs[j]; break; }
      }
      spans.push({ key: row.key, top: rowYs[i] + GROUP_ROW_H, bottom });
    });
    return spans;
  }, [displayRows, rowYs, totalHeight]);

  const monthGroups = useMemo(() => {
    const gs: { label: string; dayCount: number }[] = [];
    days.forEach(d => {
      const lbl = format(d, 'yyyy/MM');
      if (!gs.length || gs[gs.length - 1].label !== lbl) gs.push({ label: lbl, dayCount: 1 });
      else gs[gs.length - 1].dayCount++;
    });
    return gs;
  }, [days]);

  const todayOffset   = differenceInDays(new Date(), viewStart);
  const showTodayLine = todayOffset >= 0 && todayOffset < totalDays;
  const groupBy: GroupBy = viewState.groupBy;

  /* ── ドラッグ: グローバルマウスイベント ── */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragInfo.current) return;
      const dx = e.clientX - dragInfo.current.startClientX;
      if (Math.abs(dx) >= DRAG_THRESHOLD && !didDrag.current) { didDrag.current = true; setIsDragging(true); }
      if (!didDrag.current) return;
      const delta = Math.round(dx / dayWidth);
      const { type, origStart, origEnd } = dragInfo.current;
      let ns = origStart, ne = origEnd;
      if (type === 'move') {
        ns = format(addDays(parseISO(origStart), delta), 'yyyy-MM-dd');
        ne = format(addDays(parseISO(origEnd),   delta), 'yyyy-MM-dd');
      } else if (type === 'resize-right') {
        ne = format(addDays(parseISO(origEnd), delta), 'yyyy-MM-dd');
        if (ne < origStart) ne = origStart;
      } else {
        ns = format(addDays(parseISO(origStart), delta), 'yyyy-MM-dd');
        if (ns > origEnd) ns = origEnd;
      }
      dragInfo.current.curStart = ns; dragInfo.current.curEnd = ne;
      setDragPreview({ taskId: dragInfo.current.taskId, start: ns, end: ne });
    };
    const onUp = () => {
      if (!dragInfo.current) return;
      if (didDrag.current && onTaskDragEnd) {
        const task = tasksRef.current.find(t => t.id === dragInfo.current!.taskId);
        if (task) onTaskDragEnd(task, dragInfo.current.curStart, dragInfo.current.curEnd);
      }
      dragInfo.current = null; didDrag.current = false;
      setIsDragging(false); setDragPreview(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dayWidth, onTaskDragEnd]);

  const handleBarMouseDown = useCallback((e: React.MouseEvent, task: Task, type: DragInfo['type']) => {
    if (readOnly || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    didDrag.current = false;
    dragInfo.current = { taskId: task.id, type, startClientX: e.clientX, origStart: task.startDate, origEnd: task.endDate, curStart: task.startDate, curEnd: task.endDate };
  }, [readOnly]);

  /* ── Ctrl+ホイール ズーム ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onViewStateChange) return;
    const RANGES: ViewState['viewRange'][] = [1, 2, 3, 6];
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const idx = RANGES.indexOf(viewState.viewRange);
      if (e.deltaY < 0 && idx > 0)                  onViewStateChange({ ...viewState, viewRange: RANGES[idx - 1] });
      else if (e.deltaY > 0 && idx < RANGES.length - 1) onViewStateChange({ ...viewState, viewRange: RANGES[idx + 1] });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [viewState, onViewStateChange]);

  /* ── 今日ボタン 表示判定 ── */
  const checkTodayVis = useCallback(() => {
    if (!showTodayLine) { setShowFloatToday(true); return; }
    const el = scrollRef.current;
    if (!el) return;
    const todayX = leftW + todayOffset * dayWidth;
    setShowFloatToday(todayX < el.scrollLeft || todayX > el.scrollLeft + el.clientWidth);
  }, [showTodayLine, leftW, todayOffset, dayWidth]);

  useEffect(() => {
    checkTodayVis();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkTodayVis, { passive: true });
    return () => el?.removeEventListener('scroll', checkTodayVis);
  }, [checkTodayVis]);

  const scrollToToday = () => {
    if (!showTodayLine) { onGoToToday?.(); return; }
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, leftW + todayOffset * dayWidth - el.clientWidth / 2);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ position: 'relative', cursor: isDragging ? 'grabbing' : undefined, userSelect: isDragging ? 'none' : undefined }}>

      {/* ── Scroll container ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        <div style={{ minWidth: leftW + totalGanttWidth, position: 'relative' }}>

          {/* Sticky header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--bd)' }}>
            {/* Left panel header */}
            <div style={{ position: 'sticky', left: 0, zIndex: 30, width: leftW, minWidth: leftW, flexShrink: 0, background: 'var(--surface-2)', borderRight: '1px solid var(--bd)' }}>
              {panelVisible ? (
                <div style={{ height: HEADER_MONTH_H + HEADER_DAY_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: HEADER_DAY_H, padding: '0 14px', gap: 8 }}>
                    <span style={{ fontSize: 9.5, color: 'var(--t3)', fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>件名</span>
                    <span style={{ fontSize: 9.5, color: 'var(--t3)', fontWeight: 700, width: 84, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.08em' }}>D</span>
                    <button onClick={() => setPanelVisible(false)} style={{ fontSize: 12, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>‹</button>
                  </div>
                </div>
              ) : (
                <div style={{ height: HEADER_MONTH_H + HEADER_DAY_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={() => setPanelVisible(true)} style={{ fontSize: 12, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}>›</button>
                </div>
              )}
            </div>

            {/* Date header */}
            <div style={{ width: totalGanttWidth, flexShrink: 0 }}>
              <div style={{ display: 'flex', height: HEADER_MONTH_H, borderBottom: '1px solid var(--bd-light)', background: 'var(--surface-2)' }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{ width: g.dayCount * dayWidth, flexShrink: 0, borderRight: '1px solid var(--bd-light)', display: 'flex', alignItems: 'center', padding: '0 9px', overflow: 'hidden' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{g.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: HEADER_DAY_H }}>
                {days.map((day, i) => {
                  const td = isToday(day), we = isWeekend(day);
                  return (
                    <div key={i} onClick={() => onDateClick?.(format(day, 'yyyy-MM-dd'))}
                      title={onDateClick ? `${format(day, 'yyyy/MM/dd')} にタスクを追加` : undefined}
                      style={{ width: dayWidth, flexShrink: 0, borderRight: '1px solid var(--bd-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: td ? 'rgba(196,98,26,0.08)' : we ? 'var(--weekend)' : 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: td ? 700 : 400, color: td ? 'var(--today)' : we ? 'var(--t3)' : 'var(--t2)', cursor: onDateClick ? 'pointer' : 'default', transition: 'background .1s' }}
                    >{format(day, 'd')}</div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ display: 'flex' }}>
            {/* Left panel */}
            <div style={{ position: 'sticky', left: 0, zIndex: 10, width: leftW, minWidth: leftW, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--bd)' }}>
              {displayRows.map((row, i) => {
                if (row.type === 'group') return (
                  <div key={row.key} style={{ height: GROUP_ROW_H, background: 'var(--surface-2)', borderBottom: '1px solid var(--bd)', borderTop: i > 0 ? '1px solid var(--bd)' : undefined, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 7 }}>
                    <div style={{ width: 2, height: 11, borderRadius: 1, background: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t1)' }}>{row.label}</span>
                  </div>
                );
                return panelVisible ? (
                  <div key={i} onClick={() => { if (!didDrag.current) onTaskClick(row.task); }} className="row-hover group"
                    style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--bd-light)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, cursor: 'pointer', transition: 'background .1s' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} className="group-hover:underline">
                      {row.task.milestoneFlag && <span style={{ marginRight: 4, color: '#D97706', fontSize: 10 }}>◆</span>}
                      {row.task.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', width: 84, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={[row.task.assignee && `D: ${withDept(row.task.assignee)}`, row.task.members?.length ? `メンバー: ${row.task.members.map(withDept).join(', ')}` : ''].filter(Boolean).join('\n')}>
                      {row.task.assignee || '—'}
                      {row.task.members && row.task.members.length > 0 && (
                        <span style={{ marginLeft: 4, color: 'var(--accent)', fontWeight: 600 }}>+{row.task.members.length}</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div key={i} style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--bd-light)' }} />
                );
              })}
            </div>

            {/* Chart area */}
            <div style={{ position: 'relative', width: totalGanttWidth, height: Math.max(totalHeight, 200), flexShrink: 0 }}>

              {/* Weekend shading */}
              {days.map((day, i) => isWeekend(day) && (
                <div key={i} style={{ position: 'absolute', top: 0, height: '100%', left: i * dayWidth, width: dayWidth, background: 'var(--weekend)', pointerEvents: 'none' }} />
              ))}

              {/* Group row backgrounds */}
              {displayRows.map((row, i) => row.type === 'group' && (
                <div key={row.key} style={{ position: 'absolute', left: 0, width: '100%', top: rowYs[i], height: GROUP_ROW_H, background: 'var(--surface-2)', borderBottom: '1px solid var(--bd)', pointerEvents: 'none' }} />
              ))}

              {/* Row dividers */}
              {displayRows.map((row, i) => (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: rowYs[i] + (row.type === 'group' ? GROUP_ROW_H : ROW_HEIGHT) - 1, height: 1, background: row.type === 'group' ? 'var(--bd)' : 'var(--bd-light)', pointerEvents: 'none' }} />
              ))}

              {/* Today tint column */}
              {showTodayLine && (
                <div style={{ position: 'absolute', top: 0, height: '100%', left: todayOffset * dayWidth, width: dayWidth, background: 'var(--today-tint)', pointerEvents: 'none', zIndex: 1 }} />
              )}

              {/* Today vertical line */}
              {showTodayLine && (
                <div style={{ position: 'absolute', top: 0, height: '100%', left: todayOffset * dayWidth + dayWidth / 2 - 1, width: 2, background: 'linear-gradient(to bottom, var(--today), rgba(224,90,27,0.12))', boxShadow: '0 0 6px rgba(224,90,27,0.3)', pointerEvents: 'none', zIndex: 5 }} />
              )}

              {/* メンバー IN/OUT 目印（D・メンバーでグルーピング時、控えめな点線） */}
              {groupSpans.map(span => {
                const io = memberInOut[span.key];
                if (!io) return null;
                const marks: { key: string; date: string; label: string }[] = [];
                if (io.inDate)  marks.push({ key: 'in',  date: io.inDate,  label: 'IN' });
                if (io.outDate) marks.push({ key: 'out', date: io.outDate, label: 'OUT' });
                return marks.map(m => {
                  const off = differenceInDays(parseISO(m.date), viewStart);
                  if (off < 0 || off >= totalDays) return null;
                  return (
                    <div key={`${span.key}-${m.key}`} style={{ position: 'absolute', left: off * dayWidth, top: span.top, height: span.bottom - span.top, borderLeft: '1px dashed rgba(107,98,73,0.32)', pointerEvents: 'none', zIndex: 3 }}>
                      <span style={{ position: 'absolute', top: 2, left: 3, fontSize: 8, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{m.label}</span>
                    </div>
                  );
                });
              })}

              {/* Checkpoint cell tints */}
              {displayRows.map((row, i) => {
                if (row.type === 'group' || !row.task.checkpoints?.length) return null;
                const { task } = row;
                return (task.checkpoints as Checkpoint[]).map(cp => {
                  const off = differenceInDays(parseISO(cp.date), viewStart);
                  const ts  = differenceInDays(parseISO(task.startDate), viewStart);
                  const te  = differenceInDays(parseISO(task.endDate),   viewStart);
                  if (off < 0 || off >= totalDays || off < ts || off > te) return null;
                  const c = cp.color ?? '#f59e0b';
                  return <div key={`${i}-${cp.id}-bg`} style={{ position: 'absolute', left: off * dayWidth, top: rowYs[i], width: dayWidth, height: ROW_HEIGHT, background: `${c}18`, borderLeft: `2px solid ${c}66`, pointerEvents: 'none', zIndex: 9 }} />;
                });
              })}

              {/* ── Task bars ── */}
              {displayRows.map((row, i) => {
                if (row.type === 'group') return null;
                const { task } = row;
                const preview = dragPreview?.taskId === task.id ? dragPreview : null;
                const dispStart = preview?.start ?? task.startDate;
                const dispEnd   = preview?.end   ?? task.endDate;

                const barStart    = differenceInDays(parseISO(dispStart), viewStart);
                const barDays     = differenceInDays(parseISO(dispEnd), parseISO(dispStart)) + 1;
                const clampStart  = Math.max(barStart, 0);
                const clampEnd    = Math.min(barStart + barDays, totalDays);
                if (clampEnd <= 0 || clampStart >= totalDays) return null;
                const barLeft  = clampStart * dayWidth;
                const barWidth = Math.max((clampEnd - clampStart) * dayWidth, dayWidth / 2);
                const color    = getTaskColor(task, groupBy);
                const y        = rowYs[i];
                const barH     = 26;
                const isDraggedTask = !!preview;

                // 完了率 (時間ベース)
                const totalDaysTask = differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1;
                const elapsed       = Math.max(0, differenceInDays(new Date(), parseISO(task.startDate)) + 1);
                const isDone        = task.status === 'done' || task.status === 'closed';
                const progress      = isDone ? 1 : Math.min(elapsed / totalDaysTask, 1);
                const elapsedDays   = isDone ? totalDaysTask : Math.max(0, Math.min(elapsed, totalDaysTask));
                const showDaysText  = barWidth > 85 && totalDaysTask > 1;

                if (task.milestoneFlag) {
                  const cx = barStart * dayWidth + dayWidth / 2;
                  return (
                    <div key={i}
                      onMouseDown={e => handleBarMouseDown(e, task, 'move')}
                      onClick={() => { if (!didDrag.current) onTaskClick(task); }}
                      title={task.title}
                      style={{ position: 'absolute', zIndex: 10, left: cx - 10, top: y + ROW_HEIGHT / 2 - 10, width: 20, height: 20, transform: 'rotate(45deg)', background: 'linear-gradient(135deg,#F59E0B,#D97706)', borderRadius: 4, cursor: readOnly ? 'pointer' : 'grab', boxShadow: '0 2px 8px rgba(217,119,6,0.4)', opacity: isDraggedTask ? 0.7 : 1 }} />
                  );
                }

                return (
                  <div key={i}
                    onMouseDown={e => handleBarMouseDown(e, task, 'move')}
                    onClick={() => { if (!didDrag.current) onTaskClick(task); }}
                    title={`${task.title}　${elapsedDays}日/${totalDaysTask}日`}
                    style={{
                      position: 'absolute', zIndex: 10,
                      left: barLeft, top: y + (ROW_HEIGHT - barH) / 2,
                      width: barWidth, height: barH,
                      background: color,
                      borderRadius: 8,
                      cursor: readOnly ? 'pointer' : (isDragging ? 'grabbing' : 'grab'),
                      boxShadow: isDraggedTask
                        ? `0 4px 14px ${color}60, 0 2px 4px rgba(0,0,0,0.15)`
                        : `0 1px 4px ${color}50, 0 1px 1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)`,
                      opacity: isDraggedTask ? 0.82 : 1,
                      overflow: 'hidden',
                      transition: isDraggedTask ? 'none' : 'box-shadow .12s',
                    }}
                  >
                    {/* 左リサイズハンドル */}
                    {!readOnly && (
                      <div
                        onMouseDown={e => handleBarMouseDown(e, task, 'resize-left')}
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2 }}
                      />
                    )}

                    {/* 完了率オーバーレイ */}
                    {progress > 0 && (
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${progress * 100}%`,
                        background: isDone ? 'rgba(34,197,94,0.22)' : 'rgba(0,0,0,0.13)',
                        borderRadius: progress >= 0.99 ? 8 : '8px 0 0 8px',
                        pointerEvents: 'none',
                      }} />
                    )}

                    {/* テキスト: タイトル + 日数 */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%', padding: '0 10px', gap: 5, overflow: 'hidden' }}>
                      <span style={{ flex: 1, color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em', textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}>
                        {task.title}
                      </span>
                      {showDaysText && (
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.8)', flexShrink: 0, fontWeight: 500 }}>
                          {isDone ? `完了` : `${elapsedDays}/${totalDaysTask}日`}
                        </span>
                      )}
                    </div>

                    {/* 右リサイズハンドル */}
                    {!readOnly && (
                      <div
                        onMouseDown={e => handleBarMouseDown(e, task, 'resize-right')}
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2 }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Checkpoint markers */}
              {displayRows.map((row, i) => {
                if (row.type === 'group' || !row.task.checkpoints?.length) return null;
                const { task } = row;
                const barTop = rowYs[i] + (ROW_HEIGHT - 26) / 2;
                return (task.checkpoints as Checkpoint[]).map(cp => {
                  const off = differenceInDays(parseISO(cp.date), viewStart);
                  const ts  = differenceInDays(parseISO(task.startDate), viewStart);
                  const te  = differenceInDays(parseISO(task.endDate),   viewStart);
                  if (off < 0 || off >= totalDays || off < ts || off > te) return null;
                  const c = cp.color ?? '#f59e0b';
                  return (
                    <div key={`${i}-${cp.id}`}>
                      <div style={{ position: 'absolute', left: off * dayWidth, top: barTop, width: dayWidth, height: 26, background: `${c}44`, borderLeft: `3px solid ${c}`, pointerEvents: 'none', zIndex: 12 }} />
                      {cp.label && (
                        <div style={{ position: 'absolute', left: off * dayWidth + dayWidth / 2, top: barTop + 28, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: c, whiteSpace: 'nowrap', zIndex: 15, pointerEvents: 'none', background: 'rgba(255,255,255,0.95)', padding: '1px 5px', borderRadius: 4, border: `1px solid ${c}55`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                          {cp.label}
                        </div>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* Empty state */}
          {displayRows.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}>
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 14h4M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 600 }}>タスクがありません</p>
              <p style={{ color: 'var(--t3)', fontSize: 11 }}>ヘッダーの「タスク追加」から作成できます</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 今日フロートボタン ── */}
      {showFloatToday && (
        <button
          onClick={scrollToToday}
          style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 40,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', fontSize: 12, fontWeight: 700,
            background: 'var(--today)', color: '#fff',
            border: 'none', borderRadius: 20, cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(224,90,27,0.45)',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(224,90,27,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 3px 12px rgba(224,90,27,0.45)'; }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 5h10" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="6" cy="8" r="1.2" fill="currentColor"/>
          </svg>
          今日
        </button>
      )}
    </div>
  );
}

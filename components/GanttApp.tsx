'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, addDays, subDays, startOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, ViewState } from '@/types/task';
import { subscribeTasks, saveTask, updateTaskFields, deleteTask } from '@/lib/storage';
import { connectGCal, disconnectGCal, wasGCalConnected, createGCalEvent, updateGCalEvent, deleteGCalEvent, listCalendars, listEvents, GCalCalendar } from '@/lib/gcal';
import { subscribeGanttSettings, GanttSettings } from '@/lib/ganttSettings';
import { isFinished } from '@/lib/status';
import { subscribeDailyTodos, DailyTodo } from '@/lib/dailyTodo';
import { SaveData } from '@/components/TaskModal';
import DailyTodoPanel from '@/components/DailyTodoPanel';
import ControlBar from '@/components/ControlBar';
import GanttChart from '@/components/GanttChart';
import ListView from '@/components/ListView';
import TaskModal from '@/components/TaskModal';
import SettingsModal from '@/components/SettingsModal';

type AppMode = 'gantt' | 'list';

const DEFAULT_VIEW_STATE: ViewState = {
  viewStartDate: format(new Date(), 'yyyy-MM-dd'),
  viewRange: 3,
  groupBy: 'none',
  showDone: false,
};

type ModalState =
  | { type: 'new'; date?: string }
  | { type: 'edit'; task: Task }
  | null;

/* ── SVG icons ── */
const IcoSettings = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3.05 3.05l1.06 1.06M9.89 9.89l1.06 1.06M3.05 10.95l1.06-1.06M9.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="3" width="11" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1.5 6.5h11" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 1.5v2M9.5 1.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IcoSync = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M12.5 7a5.5 5.5 0 0 1-9.4 3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M1.5 7a5.5 5.5 0 0 1 9.4-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 3.1 11.5 5l-2.1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 10.9 2.5 9l2.1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
    <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcoEye = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 7s2.2-4.2 6-4.2S13 7 13 7s-2.2 4.2-6 4.2S1 7 1 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

type Props = { readOnly?: boolean };

export default function GanttApp({ readOnly = false }: Props) {
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [viewState,     setViewState]     = useState<ViewState>(DEFAULT_VIEW_STATE);
  const [mode,          setMode]          = useState<AppMode>('gantt');
  const [modal,         setModal]         = useState<ModalState>(null);
  const [loading,       setLoading]       = useState(true);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalError,     setGcalError]     = useState<string | null>(null);
  const [ganttSettings, setGanttSettings] = useState<GanttSettings>({ assignees: [] });
  const [showSettings,  setShowSettings]  = useState(false);
  const [calendars,     setCalendars]     = useState<GCalCalendar[]>([]);
  const [syncing,       setSyncing]       = useState(false);
  const [dailyTodos,    setDailyTodos]    = useState<DailyTodo[]>([]);
  const [todoHeight,    setTodoHeight]    = useState(260);
  const isDragging = useRef(false);

  useEffect(() => {
    const unsub     = subscribeTasks(items => { setTasks(items); setLoading(false); }, () => setLoading(false));
    const unsubTodo = subscribeDailyTodos(items => setDailyTodos(items));
    return () => { unsub(); unsubTodo(); };
  }, []);

  useEffect(() => {
    if (readOnly || !wasGCalConnected()) return;
    const tryConnect = () => connectGCal(async () => {
      setGcalConnected(true);
      try { const cals = await listCalendars(); setCalendars(cals); } catch { /* ignore */ }
    }, () => {}, true);
    if (window.google) tryConnect();
    else { const t = setTimeout(tryConnect, 1500); return () => clearTimeout(t); }
  }, [readOnly]);

  useEffect(() => {
    const unsub = subscribeGanttSettings(s => setGanttSettings(s));
    return () => unsub();
  }, []);

  const handleCreate = useCallback(async (data: SaveData | Task, syncToGCal: boolean) => {
    const now  = new Date().toISOString();
    const base = data as SaveData;
    const task: Task = {
      ...base, id: uuidv4(),
      assignee: base.assignee ?? '', milestoneFlag: base.milestoneFlag ?? false,
      status: base.status ?? 'todo', createdAt: now, updatedAt: now,
    };
    await saveTask(task);
    if (syncToGCal && gcalConnected) {
      try {
        const calId = ganttSettings.gcalCalendarId ?? 'primary';
        const eventId = await createGCalEvent(task, calId);
        await updateTaskFields(task.id, { gcalEventId: eventId });
      } catch (e) { console.error('GCal sync failed:', e); }
    }
    setModal(null);
  }, [gcalConnected, ganttSettings]);

  const handleUpdate = useCallback(async (data: SaveData | Task, syncToGCal: boolean) => {
    const task    = data as Task;
    const updated = { ...task, updatedAt: new Date().toISOString() };
    await saveTask(updated);
    if (syncToGCal && gcalConnected) {
      try {
        const calId = ganttSettings.gcalCalendarId ?? 'primary';
        if (updated.gcalEventId) await updateGCalEvent(updated.gcalEventId, updated, calId);
        else {
          const eventId = await createGCalEvent(updated, calId);
          await updateTaskFields(updated.id, { gcalEventId: eventId });
        }
      } catch (e) { console.error('GCal sync failed:', e); }
    }
    setModal(null);
  }, [gcalConnected, ganttSettings]);

  const handleDelete = useCallback(async (task: Task) => {
    if (task.gcalEventId && gcalConnected) {
      try { await deleteGCalEvent(task.gcalEventId, ganttSettings.gcalCalendarId ?? 'primary'); } catch { /* ignore */ }
    }
    await deleteTask(task.id);
    setModal(null);
  }, [gcalConnected, ganttSettings]);

  const handleTaskDragEnd = useCallback(async (task: Task, newStart: string, newEnd: string) => {
    const updated = { ...task, startDate: newStart, endDate: newEnd, updatedAt: new Date().toISOString() };
    await saveTask(updated);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const inForm = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if (e.key === 'Escape' && modal) { setModal(null); return; }
      if (inForm || modal) return;
      if (!readOnly && (e.key === 'n' || e.key === 'N')) { setModal({ type: 'new' }); return; }
      if (e.key === 'ArrowLeft'  && !e.shiftKey) navigateWeek(-1);
      if (e.key === 'ArrowRight' && !e.shiftKey) navigateWeek(1);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [modal, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateWeek = (dir: 1 | -1) => setViewState(prev => ({
    ...prev,
    viewStartDate: format(
      dir === 1 ? addDays(parseISO(prev.viewStartDate), 7) : subDays(parseISO(prev.viewStartDate), 7),
      'yyyy-MM-dd'
    ),
  }));

  const handleConnectGCal = () => {
    setGcalError(null);
    connectGCal(
      async () => { setGcalConnected(true); try { setCalendars(await listCalendars()); } catch { /* ignore */ } },
      msg => setGcalError(msg)
    );
  };

  const handleDisconnectGCal = () => { disconnectGCal(); setGcalConnected(false); setCalendars([]); };

  const handleSyncFromGCal = useCallback(async () => {
    if (!gcalConnected) return;
    setSyncing(true); setGcalError(null);
    try {
      const calId   = ganttSettings.gcalCalendarId ?? 'primary';
      const timeMin = format(subDays(new Date(), 90),  'yyyy-MM-dd');
      const timeMax = format(addDays(new Date(), 365), 'yyyy-MM-dd');
      const events  = await listEvents(calId, timeMin, timeMax);
      const now     = new Date().toISOString();
      for (const ev of events) {
        if (!ev.summary) continue;
        const startDate = ev.start.date ?? format(new Date(ev.start.dateTime!), 'yyyy-MM-dd');
        const endRaw    = ev.end.date   ?? format(new Date(ev.end.dateTime!),   'yyyy-MM-dd');
        const endDate   = ev.end.date ? format(subDays(new Date(endRaw), 1), 'yyyy-MM-dd') : endRaw;
        const existing  = tasks.find(t => t.gcalEventId === ev.id);
        if (existing) {
          if (existing.title !== ev.summary || existing.startDate !== startDate || existing.endDate !== endDate) {
            await saveTask({ ...existing, title: ev.summary, startDate, endDate, notes: ev.description || undefined, updatedAt: now });
          }
        } else {
          await saveTask({ id: uuidv4(), title: ev.summary, startDate, endDate, status: 'todo', assignee: '', milestoneFlag: false, notes: ev.description || undefined, gcalEventId: ev.id, createdAt: now, updatedAt: now });
        }
      }
    } catch (e) {
      setGcalError(`GCalからの同期に失敗: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSyncing(false); }
  }, [gcalConnected, ganttSettings, tasks]);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    const startY = e.clientY, startH = todoHeight;
    const onMove = (ev: MouseEvent) => { if (isDragging.current) setTodoHeight(Math.max(140, Math.min(520, startH + startY - ev.clientY))); };
    const onUp   = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const modalTask = modal?.type === 'edit' ? modal.task : null;
  const modalDate = modal?.type === 'new'  ? modal.date : undefined;

  /* ── SummaryBar data ── */
  const today = startOfDay(new Date());
  const sInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const sTodo       = tasks.filter(t => t.status === 'todo').length;
  const sConsulting = tasks.filter(t => t.status === 'consulting').length;
  const sDone       = tasks.filter(t => isFinished(t.status)).length;
  const sOverdue    = tasks.filter(t => !isFinished(t.status) && parseISO(t.endDate) < today).length;
  const sTotal      = tasks.length;
  const doneRatio   = sTotal > 0 ? sDone / sTotal : 0;

  /* header button base style */
  const hdrBtn = (override?: React.CSSProperties): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', fontSize: 12, fontWeight: 500,
    borderRadius: 8, border: '1px solid var(--bd)',
    background: 'var(--surface)', color: 'var(--t2)',
    cursor: 'pointer', transition: 'all 0.15s',
    letterSpacing: '0.01em', ...override,
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--canvas)' }}>

      {/* ══ Header ══ */}
      <header style={{
        background: 'var(--header)',
        height: 54,
        display: 'flex', alignItems: 'center',
        padding: '0 18px', gap: 14, flexShrink: 0,
        borderBottom: '1px solid var(--bd)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontStyle: 'italic', fontWeight: 700,
            fontSize: 17, color: 'var(--t1)',
            letterSpacing: '-0.5px', lineHeight: 1,
          }}>SiG GANTT Scheduler</span>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 9, fontWeight: 500,
            color: 'var(--t3)', letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>SCHEDULE</span>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: 'var(--bd)', flexShrink: 0 }} />

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: 2, padding: 3, borderRadius: 9,
          background: 'var(--canvas)', border: '1px solid var(--bd)',
        }}>
          {(['gantt', 'list'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '3px 14px', fontSize: 12, fontWeight: 600,
              borderRadius: 7, border: 'none', cursor: 'pointer',
              transition: 'all 0.18s',
              background: mode === m ? 'var(--surface)' : 'transparent',
              color:      mode === m ? 'var(--accent)' : 'var(--t3)',
              boxShadow:  mode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            }}>
              {m === 'gantt' ? 'ガント' : 'リスト'}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {readOnly ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20, border: '1px solid var(--bd)', background: 'var(--surface-2)', color: 'var(--t3)', letterSpacing: '0.04em' }}>
              <IcoEye />閲覧専用
            </span>
          ) : (
            <>
              <button onClick={() => setShowSettings(true)} style={hdrBtn()}>
                <IcoSettings />設定
              </button>

              {gcalConnected ? (
                <>
                  <button onClick={handleSyncFromGCal} disabled={syncing}
                    style={hdrBtn({ opacity: syncing ? 0.55 : 1, borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#4F46E5' })}>
                    <IcoSync />{syncing ? '同期中...' : 'GCalから同期'}
                  </button>
                  <button onClick={handleDisconnectGCal}
                    style={hdrBtn({ borderColor: 'rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.06)', color: '#16A34A' })}>
                    <IcoCalendar />GCal連携中
                  </button>
                </>
              ) : (
                <button onClick={handleConnectGCal} style={hdrBtn()}>
                  <IcoCalendar />Googleカレンダー連携
                </button>
              )}

              <button
                onClick={() => setModal({ type: 'new' })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', fontSize: 13, fontWeight: 700,
                  borderRadius: 9, border: 'none',
                  background: 'var(--accent)', color: '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 2px 8px rgba(196,98,26,0.38)',
                  letterSpacing: '0.01em',
                }}
              >
                <IcoPlus />タスク追加
              </button>
            </>
          )}
        </div>
      </header>

      {/* Error banner */}
      {gcalError && (
        <div style={{
          background: '#FFF1F2', borderBottom: '1px solid #FECDD3',
          padding: '7px 18px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: '#E11D48', fontWeight: 500 }}>{gcalError}</span>
          <button onClick={() => setGcalError(null)}
            style={{ color: '#FDA4AF', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
            ✕
          </button>
        </div>
      )}

      {/* Controls */}
      <ControlBar
        viewState={viewState}
        onViewStateChange={setViewState}
        onToday={() => setViewState(p => ({ ...p, viewStartDate: format(new Date(), 'yyyy-MM-dd') }))}
        onNavigateWeek={navigateWeek}
      />

      {/* ── Summary Bar ── */}
      {!loading && sTotal > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          padding: '0 18px', height: 34, flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--bd)',
          fontSize: 11,
        }}>
          {/* Stats chips */}
          {[
            { label: '進行中', count: sInProgress, color: '#4F46E5', bg: 'rgba(79,70,229,0.08)', bd: 'rgba(79,70,229,0.2)' },
            { label: '未開始', count: sTodo,       color: 'var(--t3)', bg: 'var(--surface-2)',   bd: 'var(--bd)' },
            { label: '相談段階', count: sConsulting, color: '#0D9488', bg: 'rgba(13,148,136,0.08)', bd: 'rgba(13,148,136,0.22)' },
            { label: '期限超過', count: sOverdue,  color: '#EF4444',  bg: 'rgba(239,68,68,0.07)', bd: 'rgba(239,68,68,0.2)' },
            { label: '完了',   count: sDone,       color: '#16A34A',  bg: 'rgba(22,163,74,0.08)', bd: 'rgba(22,163,74,0.2)' },
          ].map(({ label, count, color, bg, bd }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 10 }}>
              <span style={{ color: 'var(--t3)', fontSize: 10 }}>{label}</span>
              <span style={{ fontWeight: 700, color, background: bg, border: `1px solid ${bd}`, borderRadius: 20, padding: '1px 7px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{count}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ width: 1, height: 14, background: 'var(--bd)', margin: '0 12px 0 2px', flexShrink: 0 }} />

          {/* Progress bar + ratio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ flex: 1, maxWidth: 160, height: 5, borderRadius: 3, background: 'var(--bd)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(doneRatio * 100)}%`, borderRadius: 3, background: doneRatio === 1 ? '#16A34A' : 'var(--accent)', transition: 'width .4s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: doneRatio === 1 ? '#16A34A' : 'var(--accent)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              {Math.round(doneRatio * 100)}%
            </span>
            <span style={{ fontSize: 10, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
              ({sDone}/{sTotal})
            </span>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          {loading ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, border: '2.5px solid var(--bd)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
              <p style={{ color: 'var(--t3)', fontSize: 12 }}>読み込み中...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : mode === 'gantt' ? (
            <GanttChart tasks={tasks} viewState={viewState} memberDepts={ganttSettings.memberDepts} memberInOut={ganttSettings.memberInOut} readOnly={readOnly}
              onTaskClick={task => setModal({ type: 'edit', task })}
              onDateClick={readOnly ? undefined : date => setModal({ type: 'new', date })}
              onTaskDragEnd={readOnly ? undefined : handleTaskDragEnd}
              onViewStateChange={setViewState}
              onGoToToday={() => setViewState(p => ({ ...p, viewStartDate: format(new Date(), 'yyyy-MM-dd') }))} />
          ) : (
            <ListView tasks={tasks} viewState={viewState} memberDepts={ganttSettings.memberDepts}
              onTaskClick={task => setModal({ type: 'edit', task })} />
          )}
        </div>

        <div onMouseDown={handleDividerMouseDown} className="gantt-divider" title="ドラッグでサイズ調整">
          <div className="gantt-divider-handle" />
        </div>

        <div style={{ flexShrink: 0, overflow: 'hidden', height: todoHeight }}>
          <DailyTodoPanel todos={dailyTodos} readOnly={readOnly} />
        </div>
      </div>

      {modal !== null && (
        <TaskModal
          task={modalTask} tasks={tasks}
          assignees={ganttSettings.assignees}
          memberDepts={ganttSettings.memberDepts}
          initialDate={modalDate}
          gcalConnected={gcalConnected}
          readOnly={readOnly}
          onSave={readOnly ? () => {} : (modal.type === 'new' ? handleCreate : handleUpdate)}
          onDelete={readOnly ? undefined : (modal.type === 'edit' ? () => handleDelete(modal.task) : undefined)}
          onClose={() => setModal(null)}
        />
      )}

      {!readOnly && showSettings && (
        <SettingsModal
          settings={ganttSettings} gcalConnected={gcalConnected}
          calendars={calendars} onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

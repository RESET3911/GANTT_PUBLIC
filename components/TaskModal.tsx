'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, Checkpoint } from '@/types/task';

export type SaveData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

type Props = {
  task: Task | null;
  tasks: Task[];
  assignees?: string[];
  initialDate?: string;
  gcalConnected?: boolean;
  onSave: (data: SaveData | Task, syncToGCal: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const STATUS_OPTIONS: { value: TaskStatus; label: string; bg: string; fg: string; border: string }[] = [
  { value: 'todo',        label: '未対応',   bg: '#F4F4F5', fg: '#71717A', border: '#E4E4E7' },
  { value: 'in_progress', label: '処理中',   bg: '#EEF2FF', fg: '#4F46E5', border: '#C7D2FE' },
  { value: 'done',        label: '処理済み', bg: '#F0FDF4', fg: '#16A34A', border: '#BBF7D0' },
  { value: 'closed',      label: '完了',     bg: '#F4F4F5', fg: '#A1A1AA', border: '#E4E4E7' },
];

const LBL = 'block text-[10.5px] font-bold text-[var(--t3)] mb-1.5 uppercase tracking-[0.07em]';

export default function TaskModal({ task, tasks, assignees = [], initialDate, gcalConnected, onSave, onDelete, onClose }: Props) {
  const isEdit     = task !== null;
  const defDate    = initialDate ?? format(new Date(), 'yyyy-MM-dd');
  const defEndDate = initialDate ?? format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const [title,        setTitle]        = useState(task?.title       ?? '');
  const [startDate,    setStartDate]    = useState(task?.startDate   ?? defDate);
  const [endDate,      setEndDate]      = useState(task?.endDate     ?? defEndDate);
  const [status,       setStatus]       = useState<TaskStatus>(task?.status ?? 'todo');
  const [assignee,     setAssignee]     = useState(task?.assignee    ?? '');
  const [category,     setCategory]     = useState(task?.category    ?? '');
  const [parentId,     setParentId]     = useState(task?.parentId    ?? '');
  const [milestone,    setMilestone]    = useState(task?.milestoneFlag ?? false);
  const [notes,        setNotes]        = useState(task?.notes       ?? '');
  const [syncToGCal,   setSyncToGCal]   = useState(gcalConnected ? !isEdit : false);
  const [delConfirm,   setDelConfirm]   = useState(false);
  const [checkpoints,  setCheckpoints]  = useState<Checkpoint[]>(task?.checkpoints ?? []);
  const [newCpDate,    setNewCpDate]    = useState('');
  const [newCpLabel,   setNewCpLabel]   = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const data: SaveData = {
      title: title.trim(), startDate, endDate, status,
      assignee: assignee.trim(),
      category: category.trim() || undefined,
      parentId: parentId || undefined,
      milestoneFlag: milestone,
      notes: notes.trim() || undefined,
      color: task?.color, gcalEventId: task?.gcalEventId,
      checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
    };
    onSave(isEdit ? { ...task, ...data } as Task : data, syncToGCal);
  };

  const addCp = () => {
    if (!newCpDate) return;
    setCheckpoints(p => [...p, { id: uuidv4(), date: newCpDate, label: newCpLabel.trim() || undefined }]);
    setNewCpDate(''); setNewCpLabel('');
  };

  const parentTasks = tasks.filter(t => t.id !== task?.id);

  const field: React.CSSProperties = {
    width: '100%', background: '#FAFAF8', border: '1px solid var(--bd)',
    color: 'var(--t1)', borderRadius: 9, padding: '8px 12px', fontSize: 13,
    fontFamily: 'DM Sans, system-ui, sans-serif', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box',
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent)';
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(196,98,26,0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--bd)';
    e.currentTarget.style.boxShadow   = 'none';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(26,23,16,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', border: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: 'var(--accent)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic', letterSpacing: '-0.3px' }}>
              {isEdit ? 'タスクを編集' : initialDate ? `${initialDate.replace(/-/g, '/')} にタスクを追加` : 'タスクを追加'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', cursor: 'pointer', color: 'var(--t3)', fontSize: 14, transition: 'all .15s' }}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label className={LBL}>タスク名 <span style={{ color: '#EF4444' }}>*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: デザインレビュー" required autoFocus style={{ ...field, fontSize: 14, fontWeight: 500 }} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={LBL}>開始日 <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ ...field, fontFamily: 'var(--font-mono)', fontSize: 12 }} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={LBL}>終了日 <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required style={{ ...field, fontFamily: 'var(--font-mono)', fontSize: 12 }} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          <div>
            <label className={LBL}>ステータス</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)} style={{
                  padding: '5px 13px', fontSize: 12, fontWeight: 600,
                  borderRadius: 8, cursor: 'pointer', transition: 'all .15s',
                  background: status === opt.value ? opt.bg : 'transparent',
                  color:      status === opt.value ? opt.fg : 'var(--t2)',
                  border:     status === opt.value ? `1px solid ${opt.border}` : '1px solid var(--bd)',
                  boxShadow:  status === opt.value ? `0 1px 3px rgba(0,0,0,0.08)` : 'none',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={LBL}>担当者</label>
              {assignees.length > 0 ? (
                <select value={assignee} onChange={e => setAssignee(e.target.value)} style={{ ...field, fontSize: 12 }} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">未設定</option>
                  {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="例: さく" style={{ ...field, fontSize: 12 }} onFocus={onFocus} onBlur={onBlur} />
              )}
            </div>
            <div>
              <label className={LBL}>カテゴリー</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="例: 開発" style={{ ...field, fontSize: 12 }} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          <div>
            <label className={LBL}>親課題（任意）</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} style={{ ...field, fontSize: 12 }} onFocus={onFocus} onBlur={onBlur}>
              <option value="">なし</option>
              {parentTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div onClick={() => setMilestone(v => !v)} style={{
              width: 18, height: 18, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
              border: milestone ? '1px solid #F59E0B' : '1px solid var(--bd)',
              background: milestone ? '#FFF7ED' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}>
              {milestone && <span style={{ fontSize: 9, color: '#F59E0B' }}>◆</span>}
            </div>
            <span onClick={() => setMilestone(v => !v)} style={{ fontSize: 13, color: 'var(--t2)', cursor: 'pointer', fontWeight: 500 }}>マイルストーンとして設定</span>
          </div>

          <div>
            <label className={LBL}>メモ（任意）</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="詳細・備考など..." rows={3} style={{ ...field, resize: 'none', fontSize: 12, lineHeight: 1.6 }} onFocus={onFocus as any} onBlur={onBlur as any} />
          </div>

          {/* Checkpoints */}
          <div>
            <label className={LBL}>チェックポイント</label>
            {checkpoints.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {checkpoints.slice().sort((a, b) => a.date.localeCompare(b.date)).map(cp => (
                  <div key={cp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '5px 10px' }}>
                    <span style={{ fontSize: 9, color: '#F59E0B' }}>◆</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{cp.date.replace(/-/g, '/')}</span>
                    {cp.label && <span style={{ fontSize: 11, color: 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.label}</span>}
                    <button type="button" onClick={() => setCheckpoints(p => p.filter(c => c.id !== cp.id))} style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, marginLeft: 'auto' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="date" value={newCpDate} onChange={e => setNewCpDate(e.target.value)} min={startDate} max={endDate} style={{ ...field, width: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px' }} onFocus={onFocus} onBlur={onBlur} />
              <input type="text" value={newCpLabel} onChange={e => setNewCpLabel(e.target.value)} placeholder="ラベル（例: 中間レビュー）" style={{ ...field, flex: 1, fontSize: 11, padding: '6px 10px' }} onFocus={onFocus} onBlur={onBlur}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCp(); } }} />
              <button type="button" disabled={!newCpDate} onClick={addCp} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: newCpDate ? '#FEF3C7' : '#F4F4F5', color: newCpDate ? '#D97706' : 'var(--t3)', border: newCpDate ? '1px solid #FDE68A' : '1px solid var(--bd)', borderRadius: 8, cursor: newCpDate ? 'pointer' : 'not-allowed', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
                ＋追加
              </button>
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 5 }}>{startDate.replace(/-/g, '/')} 〜 {endDate.replace(/-/g, '/')} の範囲で選択</p>
          </div>

          {gcalConnected && (
            <div onClick={() => setSyncToGCal(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: syncToGCal ? '#EEF2FF' : '#FAFAF8', border: syncToGCal ? '1px solid #C7D2FE' : '1px solid var(--bd)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: syncToGCal ? '1px solid #6366F1' : '1px solid var(--bd)', background: syncToGCal ? '#6366F1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                {syncToGCal && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 12, color: syncToGCal ? '#4338CA' : 'var(--t2)', fontWeight: 500 }}>
                Googleカレンダーにも{isEdit ? '同期' : '追加'}する
                {isEdit && task?.gcalEventId && <span style={{ marginLeft: 8, fontSize: 10.5, opacity: 0.7 }}>（既存イベントを更新）</span>}
              </span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: '13px 24px', borderTop: '1px solid var(--bd)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {isEdit && onDelete && !delConfirm && (
            <button type="button" onClick={() => setDelConfirm(true)} style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 7 }}>削除</button>
          )}
          {delConfirm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>本当に削除しますか？</span>
              <button type="button" onClick={onDelete} style={{ fontSize: 12, background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>削除する</button>
              <button type="button" onClick={() => setDelConfirm(false)} style={{ fontSize: 12, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}>キャンセル</button>
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--t2)', background: 'var(--surface-2)', border: '1px solid var(--bd)', borderRadius: 9, cursor: 'pointer', transition: 'all .15s' }}>キャンセル</button>
            <button type="button" onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={!title.trim()} style={{ padding: '8px 22px', fontSize: 13, fontWeight: 700, background: title.trim() ? 'var(--accent)' : 'var(--bd)', color: 'white', border: 'none', borderRadius: 9, cursor: title.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s', boxShadow: title.trim() ? '0 2px 8px rgba(196,98,26,0.35)' : 'none' }}>
              {isEdit ? '保存する' : '追加する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { GanttSettings, saveGanttSettings } from '@/lib/ganttSettings';
import { GCalCalendar } from '@/lib/gcal';

type Props = {
  settings: GanttSettings;
  gcalConnected?: boolean;
  calendars?: GCalCalendar[];
  onClose: () => void;
};

const LBL = 'block text-[10.5px] font-bold text-[var(--t3)] mb-2 uppercase tracking-[0.07em]';

export default function SettingsModal({ settings, gcalConnected, calendars = [], onClose }: Props) {
  const [assignees,       setAssignees]       = useState<string[]>(settings.assignees);
  const [memberDepts,     setMemberDepts]     = useState<Record<string, string>>(settings.memberDepts ?? {});
  const [gcalCalendarId,  setGcalCalendarId]  = useState(settings.gcalCalendarId ?? 'primary');
  const [newName,         setNewName]         = useState('');
  const [newDept,         setNewDept]         = useState('');
  const [saving,          setSaving]          = useState(false);

  // 既存のDept候補（datalist用）
  const deptOptions = Array.from(new Set(Object.values(memberDepts).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ja'));

  const handleAdd = () => {
    const n = newName.trim();
    if (!n || assignees.includes(n)) return;
    setAssignees(p => [...p, n]);
    if (newDept.trim()) setMemberDepts(p => ({ ...p, [n]: newDept.trim() }));
    setNewName(''); setNewDept('');
  };

  const handleRemove = (name: string) => {
    setAssignees(p => p.filter(a => a !== name));
    setMemberDepts(p => { const next = { ...p }; delete next[name]; return next; });
  };

  const setDept = (name: string, dept: string) => {
    setMemberDepts(p => {
      const next = { ...p };
      if (dept.trim()) next[name] = dept.trim(); else delete next[name];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await saveGanttSettings({ ...settings, assignees, memberDepts, gcalCalendarId });
    setSaving(false);
    onClose();
  };

  const field: React.CSSProperties = {
    background: '#FAFAF8', border: '1px solid var(--bd)', color: 'var(--t1)',
    borderRadius: 9, padding: '8px 12px', fontSize: 13,
    fontFamily: 'DM Sans, system-ui, sans-serif', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box',
  };
  const onFoc = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,98,26,0.12)'; };
  const onBlr = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.boxShadow = 'none'; };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(26,23,16,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.16)', border: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: 'var(--accent)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic', letterSpacing: '-0.3px' }}>設定</h2>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', cursor: 'pointer', color: 'var(--t3)', fontSize: 14, transition: 'all .15s' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <datalist id="dept-options">
            {deptOptions.map(d => <option key={d} value={d} />)}
          </datalist>

          <div>
            <label className={LBL}>メンバー（D・担当者リスト）</label>
            <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {assignees.length === 0 && <p style={{ fontSize: 12, color: 'var(--t3)', padding: '6px 0' }}>メンバーが登録されていません</p>}
              {assignees.map(name => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '6px 8px 6px 12px' }}>
                  <span style={{ fontSize: 13, color: 'var(--t1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <input
                    type="text" list="dept-options" value={memberDepts[name] ?? ''}
                    onChange={e => setDept(name, e.target.value)} placeholder="Dept（所属）"
                    style={{ ...field, width: 130, fontSize: 11.5, padding: '5px 9px', background: '#fff' }} onFocus={onFoc} onBlur={onBlr}
                  />
                  <button type="button" onClick={() => handleRemove(name)} style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '0 2px', transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="名前" style={{ ...field, flex: 1, minWidth: 0 }} onFocus={onFoc} onBlur={onBlr}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
              <input type="text" list="dept-options" value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Dept（任意）" style={{ ...field, width: 120, fontSize: 12 }} onFocus={onFoc} onBlur={onBlr}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
              <button type="button" onClick={handleAdd} disabled={!newName.trim()} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, background: newName.trim() ? 'var(--accent)' : 'var(--bd)', color: newName.trim() ? '#fff' : 'var(--t3)', border: 'none', borderRadius: 9, cursor: newName.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s', boxShadow: newName.trim() ? '0 2px 8px rgba(196,98,26,0.3)' : 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>追加</button>
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 6 }}>ここで登録したメンバーを、各プロジェクトのD・メンバー欄でプルダウン選択できます</p>
          </div>

          {gcalConnected && (
            <div>
              <label className={LBL}>同期先カレンダー</label>
              {calendars.length > 0 ? (
                <select value={gcalCalendarId} onChange={e => setGcalCalendarId(e.target.value)} style={{ ...field, width: '100%', fontSize: 12 }} onFocus={onFoc} onBlur={onBlr}>
                  {calendars.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}
                </select>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--t3)' }}>カレンダー一覧を取得中...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '13px 22px', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--t2)', background: 'var(--surface-2)', border: '1px solid var(--bd)', borderRadius: 9, cursor: 'pointer', transition: 'all .15s' }}>キャンセル</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all .15s', boxShadow: '0 2px 8px rgba(196,98,26,0.35)' }}>
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}

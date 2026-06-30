'use client';

import { format, parseISO } from 'date-fns';
import { ViewState, GroupBy, FilterStatus } from '@/types/task';

type Props = {
  viewState: ViewState;
  onViewStateChange: (vs: ViewState) => void;
  onToday: () => void;
  onNavigateWeek: (dir: 1 | -1) => void;
};

const VIEW_RANGES: { value: ViewState['viewRange']; label: string }[] = [
  { value: 1, label: '1M' },
  { value: 2, label: '2M' },
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none',     label: 'なし' },
  { value: 'assignee', label: '担当者' },
  { value: 'category', label: 'カテゴリー' },
  { value: 'parent',   label: '親課題' },
];

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all',        label: 'すべて' },
  { value: 'todo',       label: '未対応' },
  { value: 'in_progress',label: '処理中' },
  { value: 'done',       label: '処理済み' },
  { value: 'closed',     label: '完了' },
  { value: 'not_closed', label: '完了以外' },
];

const Sep = () => <div style={{ width: 1, height: 14, background: 'var(--bd)', flexShrink: 0 }} />;

export default function ControlBar({ viewState, onViewStateChange, onToday, onNavigateWeek }: Props) {
  const update = (patch: Partial<ViewState>) => onViewStateChange({ ...viewState, ...patch });

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--bd)',
      flexShrink: 0,
      padding: '6px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    }}>

      {/* Row 1: navigation + range + date readout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => onNavigateWeek(-1)} style={navBtn} title="1週間前">‹</button>
          <input
            type="date"
            value={viewState.viewStartDate}
            onChange={e => update({ viewStartDate: e.target.value })}
            className="ctrl-input"
            style={{ width: 118 }}
          />
          <button onClick={() => onNavigateWeek(1)}  style={navBtn} title="1週間後">›</button>
          <button onClick={onToday} style={todayBtn}>今日</button>
        </div>

        <Sep />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={label}>表示</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {VIEW_RANGES.map(r => (
              <button key={r.value} onClick={() => update({ viewRange: r.value })}
                className={`pill-btn ${viewState.viewRange === r.value ? 'pill-btn-active' : 'pill-btn-inactive'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t3)', fontWeight: 500, letterSpacing: '0.06em' }}>
          {format(parseISO(viewState.viewStartDate), 'yyyy · MM · dd')}
        </div>
      </div>

      {/* Row 2: grouping + filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={label}>グループ</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {GROUP_OPTIONS.map(o => (
              <button key={o.value} onClick={() => update({ groupBy: o.value })}
                className={`pill-btn ${viewState.groupBy === o.value ? 'pill-btn-active' : 'pill-btn-inactive'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <Sep />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={label}>状態</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {FILTER_OPTIONS.map(o => (
              <button key={o.value} onClick={() => update({ filterStatus: o.value })}
                className={`pill-btn ${viewState.filterStatus === o.value ? 'pill-btn-active' : 'pill-btn-inactive'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--t3)',
  whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.08em',
};

const navBtn: React.CSSProperties = {
  width: 26, height: 26, display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: 17, fontWeight: 400, lineHeight: 1,
  background: 'transparent', border: '1px solid var(--bd)', borderRadius: 7,
  cursor: 'pointer', color: 'var(--t2)', transition: 'all 0.15s',
};

const todayBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, fontWeight: 600,
  background: 'var(--accent-soft)', border: '1px solid rgba(196,98,26,0.28)',
  borderRadius: 7, cursor: 'pointer', color: 'var(--accent)', transition: 'all 0.15s',
};

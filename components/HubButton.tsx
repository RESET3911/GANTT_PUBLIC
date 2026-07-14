const HUB_URL = 'https://sigma-hub-six.vercel.app/';

/** SiGMa HUB へ戻るボタン（ヘッダー左端のΣマーク） */
export default function HubButton() {
  return (
    <a
      href={HUB_URL}
      title="SiGMa HUBへ"
      className="sigma-hub-btn"
      style={{
        width: 30, height: 30, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, border: '1px solid var(--bd)',
        background: 'var(--surface)', color: 'var(--t2)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        fontWeight: 700, fontSize: 15, lineHeight: 1,
        textDecoration: 'none', transition: 'all 0.15s',
      }}
    >
      Σ
    </a>
  );
}

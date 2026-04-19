/* FatTrack — UI primitives e tokens */

const FT = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  green: '#06C167',
  greenLight: '#E6FBF0',
  red: '#FF4757',
  redLight: '#FFF1F2',
  orange: '#FF9F43',
  blue: '#4C6EF5',
  purple: '#CC5DE8',
  text: '#1E2532',
  textSec: '#8892A4',
  border: '#EDF0F7',
  shadow: '0 2px 12px rgba(30,37,50,0.07)',
  shadowMd: '0 8px 32px rgba(30,37,50,0.13)',
  font: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
  meal: {
    breakfast: { color: '#FF9F43', bg: '#FFF4E6', label: 'Colazione' },
    lunch:     { color: '#06C167', bg: '#E6FBF0', label: 'Pranzo' },
    dinner:    { color: '#4C6EF5', bg: '#EEF2FF', label: 'Cena' },
    snack:     { color: '#CC5DE8', bg: '#F8F0FF', label: 'Spuntino' },
  },
};

const activityMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
const activityLabels = {
  sedentary: 'Sedentario', light: 'Leggero', moderate: 'Moderato',
  active: 'Attivo', very_active: 'Molto attivo',
};

const calcKcal = (grams, kcalPer100) => Math.round(grams * kcalPer100 / 100);

function calcTarget(user) {
  const { weight, height, age, gender, activity, weeklyGoal } = user;
  const bmr = gender === 'M'
    ? 10*weight + 6.25*height - 5*age + 5
    : 10*weight + 6.25*height - 5*age - 161;
  const tdee = bmr * activityMult[activity];
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyTarget: Math.round(tdee - weeklyGoal * 7700 / 7),
  };
}

const Ico = {
  home: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 4l9 8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  star: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={c === FT.green ? c : 'none'} fillOpacity={c === FT.green ? 0.2 : 0}
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  chart: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="13" width="4" height="8" rx="1.5" fill={c} opacity="0.85"/>
      <rect x="10" y="8" width="4" height="13" rx="1.5" fill={c} opacity="0.85"/>
      <rect x="17" y="3" width="4" height="18" rx="1.5" fill={c} opacity="0.85"/>
    </svg>
  ),
  cog: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={c} strokeWidth="1.8"/>
    </svg>
  ),
  plus: (c = 'white') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="8" y1="2" x2="8" y2="14" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="2" y1="8" x2="14" y2="8" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  trash: (c = '#FF4757') => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 3.5h12M5 3.5V2a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v1.5M3 3.5l.8 9a.5.5 0 00.5.5h6.4a.5.5 0 00.5-.5l.8-9" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  chevDown: (c = '#8892A4') => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 5l4 4 4-4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevUp: (c = '#8892A4') => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 9l4-4 4 4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (c = '#8892A4') => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke={c} strokeWidth="1.5"/>
      <path d="M12 12L15.5 15.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  barcode: (c = '#8892A4') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={c}>
      <rect x="1" y="2" width="2" height="14" rx="0.5"/>
      <rect x="4.5" y="2" width="1" height="14" rx="0.5"/>
      <rect x="6.5" y="2" width="2" height="14" rx="0.5"/>
      <rect x="9.5" y="2" width="1" height="14" rx="0.5"/>
      <rect x="11.5" y="2" width="2.5" height="14" rx="0.5"/>
      <rect x="15" y="2" width="2" height="14" rx="0.5"/>
    </svg>
  ),
  pencil: (c = '#8892A4') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  heart: (c = '#CC5DE8') => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z"
        stroke={c} strokeWidth="1.3" fill={c} fillOpacity="0.2"/>
    </svg>
  ),
  target: (c = '#8892A4') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={c} strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="3.5" stroke={c} strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="1" fill={c}/>
    </svg>
  ),
};

// Anello calorie con arco SVG
function CalorieRing({ consumed, target, size = 148 }) {
  const r = 56;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const GAP = 0.28;
  const arcLen = circ * (1 - GAP);
  const isOver = consumed > target;
  const color = isOver ? FT.red : FT.green;
  const progress = Math.min(consumed / target, 1);
  const filled = arcLen * progress;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(126deg)', display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={FT.border}
          strokeWidth="11" strokeDasharray={`${arcLen} ${circ}`} strokeLinecap="round"/>
        {consumed > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
            strokeWidth="11" strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}/>
        )}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 25, fontWeight: 800, color: FT.text, fontFamily: FT.font, lineHeight: 1 }}>
          {consumed.toLocaleString('it-IT')}
        </span>
        <span style={{ fontSize: 10, color: FT.textSec, fontFamily: FT.font, marginTop: 3 }}>
          / {target.toLocaleString('it-IT')}
        </span>
        <span style={{ fontSize: 9, color: FT.textSec, fontFamily: FT.font }}>kcal</span>
      </div>
    </div>
  );
}

function BottomTabBar({ active, onChange }) {
  const tabs = [
    { id: 'barcode',  label: 'Scansiona',   icon: Ico.barcode },
    { id: 'favorites',label: 'Preferiti',   icon: Ico.star },
    { id: 'home',     label: 'Home',        icon: null },
    { id: 'history',  label: 'Storico',     icon: Ico.chart },
    { id: 'settings', label: 'Impostazioni',icon: Ico.cog },
  ];
  return (
    <div style={{ display: 'flex', background: '#fff', borderTop: `1px solid ${FT.border}`, flexShrink: 0, alignItems: 'center' }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        const color = isActive ? FT.green : FT.textSec;
        if (t.id === 'home') {
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              flex: 1, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 6,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', marginTop: -14,
                background: isActive ? FT.green : FT.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 14px ${isActive ? FT.green : FT.text}55`,
                transition: 'background 0.2s',
              }}>
                {Ico.home('white')}
              </div>
              <span style={{ fontSize: 9, fontFamily: FT.font, fontWeight: isActive ? 700 : 500, color, marginTop: 3 }}>
                {t.label}
              </span>
            </button>
          );
        }
        if (t.id === 'barcode') {
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              flex: 1, padding: '10px 0 8px', border: 'none', background: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
            }}>
              {t.icon(color)}
              <span style={{ fontSize: 9, fontFamily: FT.font, fontWeight: isActive ? 700 : 500, color }}>
                {t.label}
              </span>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? FT.green : 'transparent' }}/>
            </button>
          );
        }
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, padding: '10px 0 8px', border: 'none', background: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
          }}>
            {t.icon(color)}
            <span style={{ fontSize: 9, fontFamily: FT.font, fontWeight: isActive ? 700 : 500, color }}>
              {t.label}
            </span>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? FT.green : 'transparent' }}/>
          </button>
        );
      })}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: FT.card, borderRadius: 16, boxShadow: FT.shadow, ...style }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, unit, style = {} }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      {label && <div style={{ fontSize: 11, color: FT.textSec, fontFamily: FT.font, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', background: FT.bg, borderRadius: 10, border: `1.5px solid ${FT.border}`, overflow: 'hidden' }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{
            flex: 1, border: 'none', background: 'none', padding: '10px 12px',
            fontSize: 14, color: FT.text, fontFamily: FT.font, outline: 'none',
          }}/>
        {unit && <span style={{ paddingRight: 12, fontSize: 12, color: FT.textSec, fontFamily: FT.font }}>{unit}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { FT, Ico, calcKcal, calcTarget, activityLabels, activityMult, CalorieRing, BottomTabBar, Card, Input });

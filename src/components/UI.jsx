import { useState } from 'react';
import { DAYS } from '../utils/helpers';

// ── Card ───────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 16,
      padding: 16, border: '1.5px solid var(--border)', boxShadow: 'none',
      ...style
    }}>
      {children}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────
export function SectionHeader({ icon, title, color, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, paddingLeft: 2 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub)', letterSpacing: 0.4 }}>{icon} {title}</span>
      {count !== undefined && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--sub)', background: 'var(--border)', borderRadius: 10, padding: '1px 7px' }}>{count}</span>
      )}
    </div>
  );
}

// ── Bottom Sheet Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,40,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', borderRadius: '22px 22px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</span>
          <button onClick={onClose} style={{ color: 'var(--sub)', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Calendar Overlay ───────────────────────────────────────────────────
export function CalendarOverlay({ current, onSelect, onClose, dotKeys = [] }) {
  const [view, setView] = useState(new Date(current.y, current.m - 1, 1));
  const y = view.getFullYear(), m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = new Date().toISOString().slice(0, 10);
  const curKey = `${current.y}-${String(current.m).padStart(2,'0')}-${String(current.day).padStart(2,'0')}`;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,40,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', borderRadius: 22, padding: 22, width: '100%', maxWidth: 340, boxShadow: '0 8px 32px rgba(124,92,191,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => setView(new Date(y, m - 1, 1))} style={{ fontSize: 22, color: 'var(--accent)', padding: '4px 10px' }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{y}년 {m + 1}월</span>
          <button onClick={() => setView(new Date(y, m + 1, 1))} style={{ fontSize: 22, color: 'var(--accent)', padding: '4px 10px' }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--sub)', padding: '4px 0', fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const k = `${y}-${String(m + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = k === todayKey, isCur = k === curKey;
            const hasDot = dotKeys.includes(k);
            return (
              <button key={day} onClick={() => { onSelect(new Date(y, m, day)); onClose(); }} style={{
                padding: '7px 2px', borderRadius: 8, cursor: 'pointer',
                background: isCur ? 'var(--accent)' : isToday ? 'var(--accent-bg)' : 'transparent',
                color: isCur ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
                fontWeight: isCur || isToday ? 700 : 400, fontSize: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                {day}
                {hasDot && <span style={{ width: 3, height: 3, borderRadius: '50%', background: isCur ? 'rgba(255,255,255,0.6)' : 'var(--accent)', display: 'inline-block' }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month Navigator ────────────────────────────────────────────────────
export function MonthNav({ ym, setYm }) {
  const move = d => {
    const [y, m] = ym.split('-').map(Number);
    const dt = new Date(y, m - 1 + d, 1);
    setYm(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2,'0')}`);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
      <button onClick={() => move(-1)} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 10px' }}>‹</button>
      <span style={{ fontWeight: 700, fontSize: 17 }}>{ym}</span>
      <button onClick={() => move(1)} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 10px' }}>›</button>
    </div>
  );
}

// ── Save Button ────────────────────────────────────────────────────────
export function SaveBtn({ onClick, label = '저장', disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', borderRadius: 14, padding: '14px',
      fontWeight: 700, fontSize: 15, marginTop: 8,
      background: disabled ? 'var(--border)' : 'var(--accent)',
      color: disabled ? 'var(--sub)' : '#fff',
    }}>{label}</button>
  );
}

// ── Add Row Button ─────────────────────────────────────────────────────
export function AddRowBtn({ onClick, label = '+ 추가하기' }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px 16px', fontSize: 12,
      color: 'var(--sub)', background: 'none', border: 'none',
      cursor: 'pointer', textAlign: 'left', opacity: 0.8,
    }}>{label}</button>
  );
}

// ── Amount input with comma formatting ────────────────────────────────
export function AmountInput({ value, onChange, placeholder = '0' }) {
  const display = value ? Number(value).toLocaleString('ko-KR') : '';
  return (
    <input
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        onChange(raw ? parseInt(raw, 10) : '');
      }}
    />
  );
}

// ── AM/PM Time Picker ──────────────────────────────────────────────────
export function TimePicker({ value, onChange }) {
  // value: { ampm, hour, min }
  const v = value || { ampm: '오전', hour: 9, min: 0 };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const mins = [0, 10, 20, 30, 40, 50];

  const Btn = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
      padding: '6px 10px', borderRadius: 8, fontSize: 13,
      background: active ? 'var(--accent)' : 'var(--bg)',
      color: active ? '#fff' : 'var(--sub)',
      fontWeight: active ? 700 : 400, border: '1px solid var(--border)',
    }}>{children}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {['오전','오후'].map(ap => (
          <Btn key={ap} active={v.ampm === ap} onClick={() => onChange({ ...v, ampm: ap })}>{ap}</Btn>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {hours.map(h => (
          <Btn key={h} active={v.hour === h} onClick={() => onChange({ ...v, hour: h })}>{h}시</Btn>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {mins.map(mn => (
          <Btn key={mn} active={v.min === mn} onClick={() => onChange({ ...v, min: mn })}>{String(mn).padStart(2,'0')}분</Btn>
        ))}
      </div>
    </div>
  );
}

// ── Donut Chart (pure SVG) ─────────────────────────────────────────────
// data: [{ label, value, color }]
// showLabels=true 면 바깥쪽에 "이름 %" 표시
// centerLabel 있으면 가운데에 총액 등 표시
export function DonutChart({ data, size = 160, showLabels = false, centerLabel = null, centerSub = null }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  // showLabels일 때는 바깥 글씨 공간이 필요해서 viewBox를 키움
  const VB = showLabels ? 200 : 120;     // viewBox 크기
  const cx = VB / 2, cy = VB / 2;        // 중심점
  const r = showLabels ? 58 : 50;        // 도넛 반지름
  const labelR = r + 14;                 // 라벨이 놓일 반지름(도넛 바깥)

  let cumAngle = -Math.PI / 2;           // 12시 방향에서 시작
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startA = cumAngle;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    // 라벨 위치 = 이 조각의 중간 각도
    const midA = startA + angle / 2;
    const lx = cx + labelR * Math.cos(midA);
    const ly = cy + labelR * Math.sin(midA);
    const pct = Math.round((d.value / total) * 100);
    return { ...d, path, lx, ly, midA, pct };
  });

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size}>
      {/* 도넛 조각들 */}
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.88} />
      ))}

      {/* 가운데 구멍 */}
      <circle cx={cx} cy={cy} r={showLabels ? 34 : 28} fill="var(--card)" />

      {/* 가운데 글씨 (총액 등) */}
      {centerLabel && (
        <text x={cx} y={cy - (centerSub ? 2 : 0)} textAnchor="middle"
          fontSize={showLabels ? 13 : 11} fontWeight="800" fill="var(--text)">
          {centerLabel}
        </text>
      )}
      {centerSub && (
        <text x={cx} y={cy + 12} textAnchor="middle"
          fontSize={9} fill="var(--sub)">
          {centerSub}
        </text>
      )}

      {/* 바깥쪽 라벨 (이름 + %) */}
      {showLabels && slices.map((s, i) => {
        // 라벨이 오른쪽이면 왼쪽정렬, 왼쪽이면 오른쪽정렬 (글씨가 도넛 밖으로 향하게)
        const isRight = Math.cos(s.midA) >= 0;
        // 너무 작은 조각(3% 미만)은 글씨 겹치니까 생략
        if (s.pct < 3) return null;
        return (
          <text key={`l${i}`} x={s.lx} y={s.ly}
            textAnchor={isRight ? 'start' : 'end'}
            dominantBaseline="middle"
            fontSize={8} fontWeight="600" fill="var(--text)">
            {s.label} {s.pct}%
          </text>
        );
      })}
    </svg>
  );
}
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const r = 50, cx = 60, cy = 60;
  let cumAngle = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...d, path };
  });

  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.85} />
      ))}
      <circle cx={cx} cy={cy} r={28} fill="var(--card)" />
    </svg>
  );
}

// ── PIN Lock Overlay ───────────────────────────────────────────────────
export function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const CORRECT = Store_get('jarvis-pin') || '0000';

  function Store_get(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(_) { return null; }
  }

  const tap = d => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      const saved = Store_get('jarvis-pin');
      if (!saved || next === saved) {
        setTimeout(onUnlock, 150);
      } else {
        setTimeout(() => { setPin(''); setError(true); setTimeout(() => setError(false), 1000); }, 300);
      }
    }
  };

  const del = () => setPin(p => p.slice(0, -1));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📓</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>일기장 잠금</div>
      <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 32 }}>PIN을 입력하세요</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            background: pin.length > i ? (error ? 'var(--red)' : 'var(--accent)') : 'var(--border)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,72px)', gap: 12 }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
          <button key={i} onClick={() => d === '⌫' ? del() : d !== '' ? tap(String(d)) : null} style={{
            height: 72, borderRadius: 16, fontSize: d === '⌫' ? 20 : 24, fontWeight: 600,
            background: d === '' ? 'transparent' : 'var(--card)',
            color: d === '⌫' ? 'var(--sub)' : 'var(--text)',
            boxShadow: d === '' ? 'none' : '0 2px 8px rgba(124,92,191,0.1)',
            border: '1.5px solid var(--border)',
          }}>{d}</button>
        ))}
      </div>
    </div>
  );
}

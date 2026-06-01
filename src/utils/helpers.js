// ── ID generator ──────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

// ── Storage (localStorage only for GitHub PWA) ─────────────────────────
export const Store = {
  get(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(_) { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {}
  },
};

export const FIREBASE_KEYS = {
  todo:   'todo',
  ledger: 'ledger',
  diary:  'diary',
  ess:    'essentials',
  cats:   'categories',
  tags:   'tags',
};

// ── Date helpers ───────────────────────────────────────────────────────
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function fmtDate(d) {
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    day: d.getDate(),
    dow: DAYS[d.getDay()],
    key: d.toISOString().slice(0, 10),
  };
}

export const toKey = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const toYM  = s => String(s).slice(0, 7);
export const toDay = s => String(s).slice(0, 10);

export function addDays(dateKey, n) {
  const d = new Date(dateKey);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 864e5);
}

// ── Number formatting ──────────────────────────────────────────────────
export const fmt = n => Number(n || 0).toLocaleString('ko-KR');

export function parseAmount(s) {
  return parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
}

export function fmtAmount(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

// ── Cycling interval calculator ────────────────────────────────────────
export function calcInterval(history = []) {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / 864e5);
  }
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

export function getNextDiff(item) {
  const h = item.history || [];
  const interval = calcInterval(h);
  if (!interval || h.length === 0) return null;
  const last = new Date([...h].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date);
  last.setDate(last.getDate() + interval);
  return Math.ceil((last - new Date()) / 864e5);
}

// ── Category constants ─────────────────────────────────────────────────
export const DEFAULT_CATS = {
  식비:   ['회사점심','모임·약속','외식','식재료','간식','배달음식'],
  카페:   ['카페'],
  뷰티:   ['뷰티','색조','기초'],
  쇼핑:   ['옷','잡화'],
  생필품: ['생필품'],
  구독:   ['구독','통신비'],
  교통:   ['대중교통','주유·차량'],
  의료:   ['영양제','병원','약국'],
  여가:   ['운동','취미','여행'],
  저축:   ['청년적금','청약','특판적금','투자'],
  경조사: ['축의금','조의금','선물'],
  교육:   ['자격증','책','학원','강의'],
  기타:   [],
};

export const SAVINGS_SET = new Set(['저축']);

export const DEFAULT_DISCOUNT_REASONS = [
  '카드 할인',
  '포인트 사용',
  '쿠폰',
  '멤버십 할인',
  '행사 할인',
];

export const PALETTE = [
  '#7c5cbf','#e05252','#3dbf6c','#e8a838',
  '#5b8dee','#e8406a','#5ac8fa','#af52de',
  '#f0956a','#50c0e8'
];

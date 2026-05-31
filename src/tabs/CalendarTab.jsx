// src/tabs/CalendarTab.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 구글 캘린더 연동 탭
//  - localStorage 토큰 저장 → 앱 껐다 켜도 로그인 유지
//  - 기간 일정: 칸을 넘어가도 끊기지 않고 같은 줄(레인)에 이어지게 표시
//  - 각 날짜 칸에 일정 제목 글씨로 표시
//  - 구글 캘린더 색상 동기화 + 일정마다 색상 선택
//  - 일정 추가/수정/삭제 + 반복(매일·매주·매월·매년)
//  - 일정 클릭 시 팝업 대신 달력 하단에 그날 일정 표시
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useRef } from 'react';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const LS_TOKEN  = 'jarvis-gcal-token';
const LS_EXPIRY = 'jarvis-gcal-expiry';

// 구글 캘린더 공식 색상표 (colorId → 색상)
const GCAL_COLOR = {
  '1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73',
  '5':'#F6BF26','6':'#F4511E','7':'#039BE5','8':'#616161',
  '9':'#3F51B5','10':'#0B8043','11':'#D50000',
};
// 색상 선택 팔레트
const COLOR_CHOICES = [
  { id:'', name:'기본', hex:'#7c5cbf' },
  { id:'1', name:'라벤더', hex:'#7986CB' },
  { id:'2', name:'세이지', hex:'#33B679' },
  { id:'3', name:'포도', hex:'#8E24AA' },
  { id:'4', name:'플라밍고', hex:'#E67C73' },
  { id:'5', name:'바나나', hex:'#F6BF26' },
  { id:'6', name:'귤', hex:'#F4511E' },
  { id:'7', name:'공작', hex:'#039BE5' },
  { id:'11', name:'토마토', hex:'#D50000' },
];

// 반복 옵션 (RRULE)
const RECUR_CHOICES = [
  { val:'', label:'반복 안 함' },
  { val:'RRULE:FREQ=DAILY',   label:'매일' },
  { val:'RRULE:FREQ=WEEKLY',  label:'매주' },
  { val:'RRULE:FREQ=MONTHLY', label:'매월' },
  { val:'RRULE:FREQ=YEARLY',  label:'매년' },
];

const DOW = ['일','월','화','수','목','금','토'];

const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const toYMD = s => s ? s.slice(0, 10) : '';

function eventRange(ev) {
  const start = toYMD(ev.start?.date || ev.start?.dateTime);
  let end = toYMD(ev.end?.date || ev.end?.dateTime);
  if (ev.start?.date && ev.end?.date) {
    const d = new Date(end);
    d.setDate(d.getDate() - 1);
    end = d.toISOString().slice(0, 10);
  }
  return { start, end };
}

// 레인 배정: 같은 이벤트가 여러 날 걸쳐도 항상 같은 줄에 오도록
function assignLanes(events) {
  const sorted = [...events].sort((a, b) => {
    const ra = eventRange(a), rb = eventRange(b);
    if (ra.start !== rb.start) return ra.start < rb.start ? -1 : 1;
    const lenA = (new Date(ra.end) - new Date(ra.start));
    const lenB = (new Date(rb.end) - new Date(rb.start));
    return lenB - lenA;
  });
  const lanes = [];
  const laneOf = {};
  sorted.forEach(ev => {
    const { start, end } = eventRange(ev);
    let lane = 0;
    while (lanes[lane] && lanes[lane] >= start) lane++;
    lanes[lane] = end;
    laneOf[ev.id] = lane;
  });
  return laneOf;
}

// ── 입력/수정/보기 모달 ──────────────────────────────────────────────────
function EvModal({ modal, onClose, onCreate, onUpdate, onDelete }) {
  const ev = modal.event;
  const [editing, setEditing] = useState(modal.mode !== 'view');

  const defDate = modal.date || new Date().toISOString().slice(0, 10);
  const isAllDay = ev ? !!ev.start?.date : true;

  const getInitEndDate = () => {
    if (!ev) return defDate;
    if (ev.start?.date) {
      const d = new Date(ev.end.date);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
    return toYMD(ev.end?.dateTime);
  };

  const [title,     setTitle]     = useState(ev?.summary  || '');
  const [allDay,    setAllDay]    = useState(isAllDay);
  const [startDate, setStartDate] = useState(ev ? toYMD(ev.start?.date || ev.start?.dateTime) : defDate);
  const [startTime, setStartTime] = useState(ev?.start?.dateTime ? ev.start.dateTime.slice(11,16) : '09:00');
  const [endDate,   setEndDate]   = useState(getInitEndDate());
  const [endTime,   setEndTime]   = useState(ev?.end?.dateTime ? ev.end.dateTime.slice(11,16) : '10:00');
  const [location,  setLocation]  = useState(ev?.location    || '');
  const [desc,      setDesc]      = useState(ev?.description || '');
  const [colorId,   setColorId]   = useState(ev?.colorId || '');
  const [recur,     setRecur]     = useState(ev?.recurrence?.[0] || '');

  const handleSave = () => {
    if (!title.trim()) return;
    const body = {
      summary: title.trim(),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(desc.trim()     ? { description: desc.trim()  } : {}),
      ...(colorId ? { colorId } : {}),
      ...(recur ? { recurrence: [recur] } : {}),
      start: allDay
        ? { date: startDate }
        : { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Asia/Seoul' },
      end: allDay
        ? { date: (() => { const d=new Date(endDate); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })() }
        : { dateTime: `${endDate}T${endTime}:00`, timeZone: 'Asia/Seoul' },
    };
    ev?.id ? onUpdate(ev.calId || 'primary', ev.id, body) : onCreate(body);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 14, marginBottom: 10,
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  };

  const recurLabel = RECUR_CHOICES.find(r => r.val === (ev?.recurrence?.[0]||''))?.label;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:480, maxHeight:'88vh', overflowY:'auto', padding:'16px 18px calc(24px + env(safe-area-inset-bottom))', boxSizing:'border-box' }} onClick={e => e.stopPropagation()}>
        <div style={{ width:40, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 16px' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <b style={{ fontSize:16 }}>{!editing ? '📅 일정 상세' : ev?.id ? '✏️ 일정 수정' : '➕ 일정 추가'}</b>
          <button onClick={onClose} style={{ fontSize:24, background:'none', border:'none', cursor:'pointer', color:'var(--sub)', lineHeight:1 }}>×</button>
        </div>

        {!editing ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ width:14, height:14, borderRadius:'50%', background:ev?.calColor||'var(--accent)', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontWeight:700, fontSize:17 }}>{ev?.summary}</span>
            </div>
            <div style={{ color:'var(--sub)', fontSize:13, marginBottom:6 }}>
              🗓 {ev?.start?.date ? `${ev.start.date} (하루 종일)` : `${toYMD(ev?.start?.dateTime)} ${ev?.start?.dateTime?.slice(11,16)} ~ ${ev?.end?.dateTime?.slice(11,16)}`}
            </div>
            {recurLabel && recurLabel!=='반복 안 함' && <div style={{ color:'var(--sub)', fontSize:13, marginBottom:6 }}>🔁 {recurLabel} 반복</div>}
            {ev?.location && <div style={{ color:'var(--sub)', fontSize:13, marginBottom:6 }}>📍 {ev.location}</div>}
            {ev?.description && <div style={{ fontSize:14, lineHeight:1.6, marginBottom:12, whiteSpace:'pre-wrap' }}>{ev.description}</div>}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => setEditing(true)} style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid var(--border)', background:'none', color:'var(--text)', fontWeight:600, fontSize:14, cursor:'pointer' }}>✏️ 수정</button>
              <button onClick={() => onDelete(ev?.calId||'primary', ev?.id)} style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'#ef5350', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>🗑 삭제</button>
            </div>
          </div>
        ) : (
          <div>
            <input placeholder="일정 제목 *" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, fontWeight:600, fontSize:15 }} />

            <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, fontSize:13, color:'var(--sub)', cursor:'pointer' }}>
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> 하루 종일
            </label>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:2 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--sub)', marginBottom:4 }}>시작일</div>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inputStyle} />
                {!allDay && <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={{ ...inputStyle, marginTop:-4 }} />}
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--sub)', marginBottom:4 }}>종료일</div>
                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={inputStyle} />
                {!allDay && <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={{ ...inputStyle, marginTop:-4 }} />}
              </div>
            </div>

            <div style={{ fontSize:11, color:'var(--sub)', marginBottom:4 }}>🔁 반복</div>
            <select value={recur} onChange={e=>setRecur(e.target.value)} style={inputStyle}>
              {RECUR_CHOICES.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
            </select>

            <div style={{ fontSize:11, color:'var(--sub)', marginBottom:6 }}>🎨 색상</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {COLOR_CHOICES.map(c => (
                <button key={c.id} onClick={()=>setColorId(c.id)} title={c.name} style={{
                  width:30, height:30, borderRadius:'50%', background:c.hex, cursor:'pointer',
                  border: colorId===c.id ? '3px solid var(--text)' : '2px solid var(--border)',
                }} />
              ))}
            </div>

            <input placeholder="📍 장소 (선택)" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            <textarea placeholder="📝 메모 (선택)" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize:'none' }} />

            <div style={{ display:'flex', gap:8 }}>
              {ev?.id && <button onClick={() => onDelete(ev?.calId||'primary', ev?.id)} style={{ width:48, borderRadius:12, border:'none', background:'#ef5350', color:'#fff', fontSize:18, cursor:'pointer', flexShrink:0 }}>🗑</button>}
              <button onClick={handleSave} disabled={!title.trim()} style={{
                flex:1, padding:'13px', borderRadius:12, border:'none',
                background: title.trim() ? 'var(--accent)' : 'var(--border)',
                color: title.trim() ? '#fff' : 'var(--sub)', fontWeight:700, fontSize:15,
                cursor: title.trim() ? 'pointer' : 'default',
              }}>저장</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────────────
export default function CalendarTab({ todoData }) {
  const today    = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth()+1, today.getDate());

  const [ym,      setYm]      = useState(`${today.getFullYear()}-${pad(today.getMonth()+1)}`);
  const [token,   setToken]   = useState(null);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [modal,   setModal]   = useState(null);
  const [selectedDay, setSelectedDay] = useState(todayStr);

  const tokenClientRef = useRef(null);
  const calsRef        = useRef([]);

  useEffect(() => {
    const savedToken  = localStorage.getItem(LS_TOKEN);
    const savedExpiry = localStorage.getItem(LS_EXPIRY);
    if (savedToken && savedExpiry && Date.now() < Number(savedExpiry)) setToken(savedToken);

    const tryInit = () => {
      if (!window.google?.accounts?.oauth2) { setTimeout(tryInit, 300); return; }
      if (!CLIENT_ID) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, scope: SCOPES,
        callback: (response) => {
          if (response.error) { setError('로그인 실패: ' + response.error); return; }
          const expiry = Date.now() + (response.expires_in - 60) * 1000;
          localStorage.setItem(LS_TOKEN, response.access_token);
          localStorage.setItem(LS_EXPIRY, String(expiry));
          setToken(response.access_token);
          setError('');
        },
      });
    };
    tryInit();
  }, []);

  useEffect(() => { if (token) loadAll(token); }, [token, ym]);

  async function apiFetch(t, url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(opts.headers||{}) } });
    if (res.status === 401) { handleLogout(); throw new Error('AUTH_EXPIRED'); }
    if (res.status === 204) return {};
    return res.json();
  }

  async function loadAll(t) {
    setLoading(true); setError('');
    try {
      const calData = await apiFetch(t, 'https://www.googleapis.com/calendar/v3/users/me/calendarList');
      const cals = calData.items || [];
      calsRef.current = cals;
      await loadEvents(t, cals);
    } catch (e) {
      if (e.message !== 'AUTH_EXPIRED') setError('불러오기 실패: ' + e.message);
    }
    setLoading(false);
  }

  async function loadEvents(t, cals) {
    const [y, mo] = ym.split('-').map(Number);
    const timeMin = new Date(y, mo-1, 1).toISOString();
    const timeMax = new Date(y, mo, 1).toISOString();
    const calList = cals.length ? cals : [{ id:'primary', backgroundColor:'#7c5cbf' }];
    const allEvents = [];

    await Promise.all(calList.map(async (cal) => {
      try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events` +
          `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
          `&singleEvents=true&orderBy=startTime&maxResults=250`;
        const data = await apiFetch(t, url);
        (data.items || []).forEach(ev => {
          allEvents.push({
            ...ev, calId: cal.id,
            calColor: (ev.colorId ? GCAL_COLOR[ev.colorId] : null) || cal.backgroundColor || '#7c5cbf',
          });
        });
      } catch (_) {}
    }));

    allEvents.sort((a, b) => {
      const as = a.start?.date || a.start?.dateTime || '';
      const bs = b.start?.date || b.start?.dateTime || '';
      return as.localeCompare(bs);
    });
    setEvents(allEvents);
  }

  const handleLogin = () => {
    if (!CLIENT_ID) { setError('REACT_APP_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.'); return; }
    if (!tokenClientRef.current) { setError('초기화 중입니다. 잠시 후 다시 눌러주세요.'); return; }
    const hadToken = !!localStorage.getItem(LS_TOKEN);
    tokenClientRef.current.requestAccessToken({ prompt: hadToken ? '' : 'consent' });
  };
  const handleLogout = () => {
    localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_EXPIRY);
    setToken(null); setEvents([]); calsRef.current = [];
  };

  const handleCreate = async (body) => {
    try {
      await apiFetch(token, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', { method:'POST', body:JSON.stringify(body) });
      await loadEvents(token, calsRef.current); setModal(null);
    } catch (e) { setError('일정 추가 실패'); }
  };
  const handleUpdate = async (calId, evId, body) => {
    try {
      await apiFetch(token, `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${evId}`, { method:'PUT', body:JSON.stringify(body) });
      await loadEvents(token, calsRef.current); setModal(null);
    } catch (e) { setError('일정 수정 실패'); }
  };
  const handleDelete = async (calId, evId) => {
    if (!window.confirm('이 일정을 삭제할까요?')) return;
    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${evId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      setEvents(prev => prev.filter(e => e.id !== evId)); setModal(null);
    } catch (e) { setError('일정 삭제 실패'); }
  };

  const [y, mo] = ym.split('-').map(Number);
  const firstDay    = new Date(y, mo-1, 1).getDay();
  const daysInMonth = new Date(y, mo, 0).getDate();

  const moveMonth = (delta) => {
    const d = new Date(y, mo-1+delta, 1);
    setYm(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);
  };

  const laneOf = assignLanes(events);
  const maxLane = Math.max(0, ...Object.values(laneOf));
  const LANE_H = 16;

  const evForDay = (dateStr) => events.filter(ev => {
    const { start, end } = eventRange(ev);
    return dateStr >= start && dateStr <= end;
  });

  const selectedEvents = evForDay(selectedDay).sort((a,b) => {
    const as = a.start?.dateTime || a.start?.date || '';
    const bs = b.start?.dateTime || b.start?.date || '';
    return as.localeCompare(bs);
  });

  if (!token) {
    return (
      <div style={{ padding:'48px 24px', textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:20 }}>📅</div>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>구글 캘린더 연동</div>
        <div style={{ color:'var(--sub)', fontSize:14, lineHeight:1.8, marginBottom:28 }}>
          구글 계정으로 로그인하면<br/>달력에서 바로 일정을 볼 수 있어요!<br/>
          <span style={{ fontSize:11 }}>🔒 로그인 토큰은 이 기기에만 저장돼요</span>
        </div>
        {!CLIENT_ID && (
          <div style={{ background:'rgba(239,83,80,0.1)', borderRadius:12, padding:'12px 14px', marginBottom:16, fontSize:12, color:'#ef5350', textAlign:'left' }}>
            <b>⚠️ 개발자 설정 필요</b><br/>
            <code style={{ fontSize:11 }}>REACT_APP_GOOGLE_CLIENT_ID</code> 환경변수를 설정하세요.
          </div>
        )}
        {error && <div style={{ color:'#ef5350', fontSize:13, marginBottom:16 }}>{error}</div>}
        <button onClick={handleLogin} style={{ background:'#4285f4', color:'#fff', border:'none', borderRadius:14, padding:'14px 28px', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(66,133,244,0.35)' }}>
          Google로 로그인
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:'8px 4px 80px', userSelect:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px', marginBottom:8 }}>
        <button onClick={() => moveMonth(-1)} style={{ fontSize:26, color:'var(--accent)', padding:'2px 8px', background:'none', border:'none', cursor:'pointer' }}>‹</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontWeight:800, fontSize:18 }}>{y}년 {mo}월</div>
          {loading && <div style={{ fontSize:10, color:'var(--sub)' }}>동기화 중...</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={() => moveMonth(1)} style={{ fontSize:26, color:'var(--accent)', padding:'2px 8px', background:'none', border:'none', cursor:'pointer' }}>›</button>
          <button onClick={handleLogout} style={{ fontSize:11, color:'var(--sub)', background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'3px 8px', cursor:'pointer' }}>로그아웃</button>
        </div>
      </div>

      {error && <div style={{ textAlign:'center', fontSize:12, color:'#ef5350', marginBottom:6 }}>{error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 2px', marginBottom:2 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, padding:'4px 0', color: i===0?'#ef5350':i===6?'#5c7aff':'var(--sub)' }}>{d}</div>
        ))}
      </div>

      <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {(() => {
          const cells = [];
          for (let i = 0; i < firstDay; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);
          const weeks = [];
          for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i+7));

          return weeks.map((week, wi) => (
            <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderTop: wi>0?'1px solid var(--border)':'none', position:'relative' }}>
              {week.map((day, di) => {
                if (!day) return <div key={di} style={{ minHeight: 30 + (maxLane+1)*LANE_H, background:'var(--card)', borderRight: di<6?'1px solid var(--border)':'none' }} />;
                const dateStr = ymd(y, mo, day);
                const isToday = dateStr === todayStr;
                const isSel = dateStr === selectedDay;
                const dow = (firstDay + day - 1) % 7;
                return (
                  <div key={di} onClick={() => setSelectedDay(dateStr)} style={{
                    minHeight: 30 + (maxLane+1)*LANE_H,
                    background: isSel ? 'var(--accent-bg)' : 'var(--card)',
                    borderRight: di<6?'1px solid var(--border)':'none',
                    padding:'3px 0 2px', cursor:'pointer',
                  }}>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <span style={{
                        width:20, height:20, borderRadius:'50%',
                        background: isToday ? 'var(--accent)' : 'transparent',
                        color: isToday ? '#fff' : dow===0?'#ef5350':dow===6?'#5c7aff':'var(--text)',
                        fontSize:11, fontWeight: isToday?800:500,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>{day}</span>
                    </div>
                  </div>
                );
              })}

              {events.map(ev => {
                const { start, end } = eventRange(ev);
                const lane = laneOf[ev.id] ?? 0;
                const weekDays = week.map((d) => d ? ymd(y, mo, d) : null).filter(Boolean);
                if (!weekDays.length) return null;
                const weekStart = weekDays[0], weekEnd = weekDays[weekDays.length-1];
                if (end < weekStart || start > weekEnd) return null;
                const segStart = start < weekStart ? weekStart : start;
                const segEnd   = end   > weekEnd   ? weekEnd   : end;
                const startCol = week.findIndex(d => d && ymd(y,mo,d) === segStart);
                const endCol   = week.findIndex(d => d && ymd(y,mo,d) === segEnd);
                if (startCol < 0 || endCol < 0) return null;
                const isStart = start === segStart;
                const isEnd = end === segEnd;
                const color = ev.calColor || '#7c5cbf';
                return (
                  <div key={ev.id} onClick={(e)=>{ e.stopPropagation(); setModal({ mode:'view', event:ev }); }} title={ev.summary} style={{
                    position:'absolute',
                    left: `calc(${startCol}/7*100% + 1px)`,
                    width: `calc(${endCol-startCol+1}/7*100% - 2px)`,
                    top: 26 + lane*LANE_H,
                    height: LANE_H-2,
                    background: color, color:'#fff',
                    fontSize:9, fontWeight:600, lineHeight:`${LANE_H-2}px`,
                    paddingLeft: isStart?5:2, paddingRight:2,
                    borderRadius: `${isStart?4:0}px ${isEnd?4:0}px ${isEnd?4:0}px ${isStart?4:0}px`,
                    overflow:'hidden', whiteSpace:'nowrap', cursor:'pointer', boxSizing:'border-box',
                  }}>
                    {isStart ? (ev.summary || '(제목 없음)') : '\u00A0'}
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      <div style={{ marginTop:14, padding:'0 6px' }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>
          {Number(selectedDay.slice(5,7))}월 {Number(selectedDay.slice(8,10))}일
          <span style={{ fontSize:11, color:'var(--sub)', fontWeight:400, marginLeft:6 }}>{selectedEvents.length}개 일정</span>
        </div>
        {selectedEvents.length === 0
          ? <div style={{ textAlign:'center', color:'var(--sub)', padding:'20px 0', fontSize:13 }}>이 날 일정이 없어요</div>
          : selectedEvents.map(ev => (
              <div key={ev.id} onClick={()=>setModal({ mode:'view', event:ev })} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8, cursor:'pointer' }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:ev.calColor||'var(--accent)', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600 }}>{ev.summary||'(제목 없음)'}</div>
                  <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>
                    {ev.start?.date ? '하루 종일' : `${ev.start?.dateTime?.slice(11,16)} ~ ${ev.end?.dateTime?.slice(11,16)}`}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </div>
                </div>
              </div>
            ))
        }
      </div>

      <button onClick={() => setModal({ mode:'add', date:selectedDay })} style={{
        position:'fixed', bottom:80, right:20, width:52, height:52, borderRadius:'50%',
        background:'var(--accent)', color:'#fff', fontSize:28, border:'none', cursor:'pointer', zIndex:50,
        boxShadow:'0 4px 18px rgba(124,92,191,0.5)', display:'flex', alignItems:'center', justifyContent:'center',
      }}>+</button>

      {modal && (
        <EvModal modal={modal} onClose={() => setModal(null)} onCreate={handleCreate} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
    </div>
  );
}

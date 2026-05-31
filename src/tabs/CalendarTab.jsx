import { useState, useEffect, useRef } from 'react';

// ── 환경변수 & 상수 ────────────────────────────────────────────────────
// .env 파일에 REACT_APP_GOOGLE_CLIENT_ID=xxx 형태로 넣어야 함
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

// 구글 캘린더 API에 필요한 권한 범위
const SCOPES = 'https://www.googleapis.com/auth/calendar';

// localStorage에 토큰을 저장할 키 이름
const LS_TOKEN  = 'jarvis-gcal-token';
const LS_EXPIRY = 'jarvis-gcal-expiry';

// 구글 캘린더 공식 색상표 (colorId → 실제 색상 코드)
const GCAL_COLOR = {
  '1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73',
  '5':'#F6BF26','6':'#F4511E','7':'#039BE5','8':'#616161',
  '9':'#3F51B5','10':'#0B8043','11':'#D50000',
};

// 요일 이름 (한국어)
const DOW = ['일','월','화','수','목','금','토'];

// ── 날짜 유틸 함수들 ───────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');                 // 1 → "01"
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;       // 날짜 문자열 만들기
const toYMD = s => s ? s.slice(0, 10) : '';                 // "2025-01-01T09:00:00" → "2025-01-01"

// 구글 캘린더 이벤트의 시작일/종료일 계산
// (종일 이벤트의 end는 마지막날+1 이므로 하루 빼줌)
function eventRange(ev) {
  const start = toYMD(ev.start?.date || ev.start?.dateTime);
  let end = toYMD(ev.end?.date || ev.end?.dateTime);
  if (ev.start?.date) {
    const d = new Date(end);
    d.setDate(d.getDate() - 1);
    end = d.toISOString().slice(0, 10);
  }
  return { start, end };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컴포넌트 1: 달력 칸 안의 이벤트 바
// 기간 이벤트는 시작/끝 여부에 따라 모서리가 달라져서 "이어진" 느낌 표현
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EvBar({ ev, dateStr, onClick }) {
  const { start, end } = eventRange(ev);
  const isStart = dateStr === start;   // 이 날이 이벤트 시작일?
  const isEnd   = dateStr === end;     // 이 날이 이벤트 종료일?
  const color   = ev.calColor || '#7c5cbf';

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(ev); }}
      title={ev.summary}
      style={{
        background: color,
        color: '#fff',
        fontSize: 9,
        fontWeight: 600,
        lineHeight: '15px',
        height: 15,
        marginTop: 1,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        // 시작일이면 왼쪽 모서리 둥글게, 종료일이면 오른쪽 모서리 둥글게
        borderRadius: `${isStart?4:0}px ${isEnd?4:0}px ${isEnd?4:0}px ${isStart?4:0}px`,
        // 시작/끝이 아닌 날은 셀 경계까지 꽉 채워서 "이어진" 느낌
        marginLeft:  isStart ? 1 : -1,
        marginRight: isEnd   ? 1 : -1,
        paddingLeft:  isStart ? 4 : 0,
        paddingRight: isEnd   ? 4 : 0,
      }}
    >
      {/* 시작일에만 제목 표시, 이어지는 날은 빈 공간 (색상만) */}
      {isStart ? (ev.summary || '(제목 없음)') : '\u00A0'}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컴포넌트 2: 일정 추가/보기/수정 모달 (하단 슬라이드 팝업)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EvModal({ modal, onClose, onCreate, onUpdate, onDelete }) {
  const ev = modal.event;                           // 기존 이벤트 (수정/보기 시)
  const [editing, setEditing] = useState(modal.mode !== 'view');  // 편집 모드 여부

  // 기본값 계산
  const defDate  = modal.date || new Date().toISOString().slice(0, 10);
  const isAllDay = ev ? !!ev.start?.date : true;

  // 종일 이벤트의 종료일: 구글은 end가 +1일이므로 하루 빼서 보여줌
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

  // 저장 버튼 클릭 시: 구글 캘린더 API 형식으로 데이터 구성
  const handleSave = () => {
    if (!title.trim()) return;
    const body = {
      summary: title.trim(),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(desc.trim()     ? { description: desc.trim()  } : {}),
      // 종일 이벤트: date 형식, 시간 이벤트: dateTime 형식
      start: allDay
        ? { date: startDate }
        : { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Asia/Seoul' },
      end: allDay
        // 종일 종료일: 구글은 end가 exclusive → 하루 더 더해서 보냄
        ? { date: (() => { const d=new Date(endDate); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })() }
        : { dateTime: `${endDate}T${endTime}:00`, timeZone: 'Asia/Seoul' },
    };
    ev?.id
      ? onUpdate(ev.calId || 'primary', ev.id, body)  // 수정
      : onCreate(body);                                 // 새 추가
  };

  // 공통 입력 필드 스타일
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 14, marginBottom: 10,
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  };

  return (
    // 배경 클릭 시 닫기
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200,
        display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      {/* 모달 본체 (클릭 이벤트 막기) */}
      <div
        style={{ background:'var(--card)', borderRadius:'22px 22px 0 0', width:'100%',
          maxWidth:480, maxHeight:'88vh', overflowY:'auto',
          padding:'16px 18px calc(24px + env(safe-area-inset-bottom))', boxSizing:'border-box' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div style={{ width:40, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 16px' }} />

        {/* 헤더 */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <b style={{ fontSize:16 }}>
            {!editing ? '📅 일정 상세' : ev?.id ? '✏️ 일정 수정' : '➕ 일정 추가'}
          </b>
          <button onClick={onClose} style={{ fontSize:24, background:'none', border:'none', cursor:'pointer', color:'var(--sub)', lineHeight:1 }}>×</button>
        </div>

        {/* ── 보기 모드 ── */}
        {!editing ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ width:14, height:14, borderRadius:'50%', background:ev?.calColor||'var(--accent)', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontWeight:700, fontSize:17 }}>{ev?.summary}</span>
            </div>
            <div style={{ color:'var(--sub)', fontSize:13, marginBottom:6 }}>
              🗓{' '}
              {ev?.start?.date
                ? `${ev.start.date}  (하루 종일)`
                : `${toYMD(ev?.start?.dateTime)}  ${ev?.start?.dateTime?.slice(11,16)} ~ ${ev?.end?.dateTime?.slice(11,16)}`}
            </div>
            {ev?.location    && <div style={{ color:'var(--sub)', fontSize:13, marginBottom:6 }}>📍 {ev.location}</div>}
            {ev?.description && (
              <div style={{ fontSize:14, lineHeight:1.6, marginBottom:12, whiteSpace:'pre-wrap', color:'var(--text)' }}>{ev.description}</div>
            )}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button
                onClick={() => setEditing(true)}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid var(--border)', background:'none', color:'var(--text)', fontWeight:600, fontSize:14, cursor:'pointer' }}
              >✏️ 수정</button>
              <button
                onClick={() => onDelete(ev?.calId||'primary', ev?.id)}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'#ef5350', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}
              >🗑 삭제</button>
            </div>
          </div>

        ) : (
          /* ── 편집/추가 모드 ── */
          <div>
            <input
              placeholder="일정 제목 *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ ...inputStyle, fontWeight:600, fontSize:15 }}
            />

            {/* 종일 여부 체크박스 */}
            <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, fontSize:13, color:'var(--sub)', cursor:'pointer' }}>
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
              하루 종일
            </label>

            {/* 시작/종료 날짜·시간 */}
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

            <input
              placeholder="📍 장소 (선택)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="📝 메모 (선택)"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize:'none' }}
            />

            {/* 하단 버튼 */}
            <div style={{ display:'flex', gap:8 }}>
              {ev?.id && (
                <button
                  onClick={() => onDelete(ev?.calId||'primary', ev?.id)}
                  style={{ width:48, borderRadius:12, border:'none', background:'#ef5350', color:'#fff', fontSize:18, cursor:'pointer', flexShrink:0 }}
                >🗑</button>
              )}
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                style={{
                  flex:1, padding:'13px', borderRadius:12, border:'none',
                  background: title.trim() ? 'var(--accent)' : 'var(--border)',
                  color: title.trim() ? '#fff' : 'var(--sub)',
                  fontWeight:700, fontSize:15,
                  cursor: title.trim() ? 'pointer' : 'default',
                }}
              >저장</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트: CalendarTab
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function CalendarTab({ todoData }) {
  const today    = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth()+1, today.getDate());

  // ── 상태 변수들 ────────────────────────────────────────────────────
  const [ym,      setYm]      = useState(`${today.getFullYear()}-${pad(today.getMonth()+1)}`);
  const [token,   setToken]   = useState(null);    // 구글 API 접근 토큰
  const [events,  setEvents]  = useState([]);      // 이벤트 목록
  const [loading, setLoading] = useState(false);   // 로딩 중 여부
  const [error,   setError]   = useState('');      // 에러 메시지
  const [modal,   setModal]   = useState(null);    // 열린 모달 정보

  const tokenClientRef = useRef(null);  // GIS 토큰 클라이언트 (ref로 보관)
  const calsRef        = useRef([]);    // 캘린더 목록 (ref로 보관, 최신값 유지)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 앱 시작 시: localStorage에서 토큰 복원 + GIS 초기화
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    // 저장된 토큰이 아직 유효하면 바로 사용 (로그인 팝업 없이 자동 복원)
    const savedToken  = localStorage.getItem(LS_TOKEN);
    const savedExpiry = localStorage.getItem(LS_EXPIRY);
    if (savedToken && savedExpiry && Date.now() < Number(savedExpiry)) {
      setToken(savedToken);
    }

    // Google Identity Services(GIS) 초기화
    // index.html에 <script src="https://accounts.google.com/gsi/client"> 있어야 함
    const tryInit = () => {
      if (!window.google?.accounts?.oauth2) {
        setTimeout(tryInit, 300);  // 스크립트 아직 로드 중이면 0.3초 후 재시도
        return;
      }
      if (!CLIENT_ID) return;  // 환경변수 없으면 초기화 스킵

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            setError('로그인 실패: ' + response.error);
            return;
          }
          // 토큰을 localStorage에 저장 (expires_in초 후 만료, 60초 여유)
          const expiry = Date.now() + (response.expires_in - 60) * 1000;
          localStorage.setItem(LS_TOKEN,  response.access_token);
          localStorage.setItem(LS_EXPIRY, String(expiry));
          setToken(response.access_token);
          setError('');
        },
      });
    };
    tryInit();
  }, []);

  // ── 토큰 또는 표시 월이 바뀔 때 데이터 새로 불러오기 ───────────────
  useEffect(() => {
    if (token) loadAll(token);
  }, [token, ym]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API 호출 공통 함수
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async function apiFetch(t, url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401) {
      // 토큰 만료 → 자동 로그아웃
      handleLogout();
      throw new Error('AUTH_EXPIRED');
    }
    if (res.status === 204) return {};  // DELETE 성공 (응답 본문 없음)
    return res.json();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 캘린더 목록 + 이벤트 로드
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async function loadAll(t) {
    setLoading(true);
    setError('');
    try {
      // 1. 사용자의 캘린더 목록 가져오기 (색상 정보 포함)
      const calData = await apiFetch(t, 'https://www.googleapis.com/calendar/v3/users/me/calendarList');
      const cals = calData.items || [];
      calsRef.current = cals;

      // 2. 각 캘린더의 이벤트 가져오기
      await loadEvents(t, cals);
    } catch (e) {
      if (e.message !== 'AUTH_EXPIRED') setError('불러오기 실패: ' + e.message);
    }
    setLoading(false);
  }

  async function loadEvents(t, cals) {
    const [y, mo] = ym.split('-').map(Number);
    // 이번 달 첫날 ~ 다음 달 첫날 (API 쿼리 범위)
    const timeMin = new Date(y, mo-1, 1).toISOString();
    const timeMax = new Date(y, mo, 1).toISOString();

    // 캘린더가 없으면 기본(primary) 사용
    const calList = cals.length ? cals : [{ id:'primary', backgroundColor:'#7c5cbf' }];

    const allEvents = [];

    // 모든 캘린더에서 동시에 이벤트 가져오기 (병렬 처리로 빠름)
    await Promise.all(calList.map(async (cal) => {
      try {
        const url =
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events` +
          `?timeMin=${encodeURIComponent(timeMin)}` +
          `&timeMax=${encodeURIComponent(timeMax)}` +
          `&singleEvents=true&orderBy=startTime&maxResults=250`;

        const data = await apiFetch(t, url);

        (data.items || []).forEach(ev => {
          allEvents.push({
            ...ev,
            calId: cal.id,
            // 색상 우선순위: 이벤트 자체 색 → 캘린더 색 → 기본 보라색
            calColor: (ev.colorId ? GCAL_COLOR[ev.colorId] : null) || cal.backgroundColor || '#7c5cbf',
          });
        });
      } catch (_) { /* 개별 캘린더 에러는 무시하고 계속 */ }
    }));

    // 시작 날짜 기준으로 정렬 (같은 날은 일관된 순서 유지)
    allEvents.sort((a, b) => {
      const as = a.start?.date || a.start?.dateTime || '';
      const bs = b.start?.date || b.start?.dateTime || '';
      return as.localeCompare(bs);
    });

    setEvents(allEvents);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 로그인 / 로그아웃
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleLogin = () => {
    if (!CLIENT_ID) {
      setError('REACT_APP_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
      return;
    }
    if (!tokenClientRef.current) {
      setError('초기화 중입니다. 잠시 후 다시 눌러주세요.');
      return;
    }
    // 이전에 로그인한 적 있으면 동의 화면 생략 (빠른 재로그인)
    const hadToken = !!localStorage.getItem(LS_TOKEN);
    tokenClientRef.current.requestAccessToken({ prompt: hadToken ? '' : 'consent' });
  };

  const handleLogout = () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EXPIRY);
    setToken(null);
    setEvents([]);
    calsRef.current = [];
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 일정 CRUD (추가/수정/삭제)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleCreate = async (body) => {
    try {
      await apiFetch(token,
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        { method: 'POST', body: JSON.stringify(body) }
      );
      await loadEvents(token, calsRef.current);
      setModal(null);
    } catch (e) { setError('일정 추가 실패'); }
  };

  const handleUpdate = async (calId, evId, body) => {
    try {
      await apiFetch(token,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${evId}`,
        { method: 'PUT', body: JSON.stringify(body) }
      );
      await loadEvents(token, calsRef.current);
      setModal(null);
    } catch (e) { setError('일정 수정 실패'); }
  };

  const handleDelete = async (calId, evId) => {
    if (!window.confirm('이 일정을 삭제할까요?')) return;
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${evId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents(prev => prev.filter(e => e.id !== evId));
      setModal(null);
    } catch (e) { setError('일정 삭제 실패'); }
  };

  // ── 달력 계산 ─────────────────────────────────────────────────────
  const [y, mo] = ym.split('-').map(Number);
  const firstDay    = new Date(y, mo-1, 1).getDay();  // 1일이 무슨 요일(0=일)
  const daysInMonth = new Date(y, mo, 0).getDate();   // 이번 달 총 일수

  // 월 이동
  const moveMonth = (delta) => {
    const d = new Date(y, mo-1+delta, 1);
    setYm(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);
  };

  // 특정 날짜에 표시할 이벤트 목록
  const evForDay = (dateStr) =>
    events.filter(ev => {
      const { start, end } = eventRange(ev);
      return dateStr >= start && dateStr <= end;
    });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 화면 1: 미로그인 상태 → 로그인 안내 화면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!token) {
    return (
      <div style={{ padding:'48px 24px', textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:20 }}>📅</div>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>구글 캘린더 연동</div>
        <div style={{ color:'var(--sub)', fontSize:14, lineHeight:1.8, marginBottom:28 }}>
          구글 계정으로 로그인하면<br/>
          달력에서 바로 일정을 볼 수 있어요!<br/>
          <span style={{ fontSize:11 }}>🔒 로그인 토큰은 이 기기에만 저장돼요</span>
        </div>

        {/* CLIENT_ID 미설정 시 개발자 안내 메시지 */}
        {!CLIENT_ID && (
          <div style={{ background:'rgba(239,83,80,0.1)', borderRadius:12, padding:'12px 14px',
            marginBottom:16, fontSize:12, color:'#ef5350', textAlign:'left' }}>
            <b>⚠️ 개발자 설정 필요</b><br/>
            프로젝트 루트의 <code>.env</code> 파일에 아래 줄 추가:<br/>
            <code style={{ fontSize:11 }}>REACT_APP_GOOGLE_CLIENT_ID=여기에_클라이언트ID</code>
          </div>
        )}

        {error && (
          <div style={{ color:'#ef5350', fontSize:13, marginBottom:16 }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          style={{
            background: '#4285f4', color: '#fff', border: 'none',
            borderRadius: 14, padding: '14px 28px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(66,133,244,0.35)',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}
        >
          {/* 구글 로고 SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 화면 2: 로그인 완료 → 달력 메인 화면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={{ padding:'8px 4px 80px', userSelect:'none' }}>

      {/* ── 월 네비게이션 헤더 ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 10px', marginBottom:8 }}>
        <button
          onClick={() => moveMonth(-1)}
          style={{ fontSize:26, color:'var(--accent)', padding:'2px 8px',
            background:'none', border:'none', cursor:'pointer' }}
        >‹</button>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontWeight:800, fontSize:18 }}>{y}년 {mo}월</div>
          {loading && <div style={{ fontSize:10, color:'var(--sub)' }}>동기화 중...</div>}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button
            onClick={() => moveMonth(1)}
            style={{ fontSize:26, color:'var(--accent)', padding:'2px 8px',
              background:'none', border:'none', cursor:'pointer' }}
          >›</button>
          <button
            onClick={handleLogout}
            style={{ fontSize:11, color:'var(--sub)', background:'none',
              border:'1px solid var(--border)', borderRadius:8, padding:'3px 8px', cursor:'pointer' }}
          >로그아웃</button>
        </div>
      </div>

      {error && (
        <div style={{ textAlign:'center', fontSize:12, color:'#ef5350', marginBottom:6 }}>{error}</div>
      )}

      {/* ── 요일 헤더 (일~토) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 2px', marginBottom:2 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{
            textAlign:'center', fontSize:11, fontWeight:700, padding:'4px 0',
            color: i===0 ? '#ef5350' : i===6 ? '#5c7aff' : 'var(--sub)',
          }}>{d}</div>
        ))}
      </div>

      {/* ── 달력 그리드 ── */}
      {/* gap:1px + background:'var(--border)' 조합으로 격자선 표현 */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(7,1fr)',
        border:'1px solid var(--border)', borderRadius:12,
        overflow:'hidden', gap:'1px', background:'var(--border)',
      }}>

        {/* 1일 전 빈 칸들 (예: 1일이 수요일이면 일/월/화 3칸 비움) */}
        {Array(firstDay).fill(null).map((_, i) => (
          <div key={`e${i}`} style={{ background:'var(--card)', minHeight:72 }} />
        ))}

        {/* 날짜 칸들 */}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day     = i + 1;
          const dateStr = ymd(y, mo, day);
          const isToday = dateStr === todayStr;
          const dow     = (firstDay + i) % 7;     // 이 날의 요일 (0=일)
          const dayEvs  = evForDay(dateStr);       // 이 날의 이벤트들

          return (
            <div
              key={day}
              // 날짜 칸 클릭 → 일정 추가 모달
              onClick={() => setModal({ mode:'add', date:dateStr })}
              style={{
                background: isToday ? 'rgba(124,92,191,0.07)' : 'var(--card)',
                minHeight: 72,
                padding: '3px 2px 2px',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {/* 날짜 숫자 (오늘은 보라 원형 배경) */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:1 }}>
                <span style={{
                  width:20, height:20, borderRadius:'50%',
                  background: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? '#fff' : dow===0 ? '#ef5350' : dow===6 ? '#5c7aff' : 'var(--text)',
                  fontSize:11, fontWeight: isToday ? 800 : 500,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>{day}</span>
              </div>

              {/* 이벤트 바 (최대 3개까지 표시) */}
              {dayEvs.slice(0, 3).map(calEv => (
                <EvBar
                  key={calEv.id}
                  ev={calEv}
                  dateStr={dateStr}
                  onClick={clickedEv => setModal({ mode:'view', event:clickedEv })}
                />
              ))}
              {/* 3개 초과 시 "+N개" 표시 */}
              {dayEvs.length > 3 && (
                <div style={{ fontSize:8, color:'var(--sub)', textAlign:'center' }}>
                  +{dayEvs.length - 3}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 플로팅 추가 버튼 (FAB) ── */}
      <button
        onClick={() => setModal({ mode:'add', date:todayStr })}
        style={{
          position:'fixed', bottom:80, right:20,
          width:52, height:52, borderRadius:'50%',
          background:'var(--accent)', color:'#fff',
          fontSize:28, border:'none', cursor:'pointer', zIndex:50,
          boxShadow:'0 4px 18px rgba(124,92,191,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
      >+</button>

      {/* ── 모달 ── */}
      {modal && (
        <EvModal
          modal={modal}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

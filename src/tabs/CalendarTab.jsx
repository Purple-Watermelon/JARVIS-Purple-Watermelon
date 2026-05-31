import { useState, useEffect } from 'react';
import { toKey, DAYS } from '../utils/helpers';

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export default function CalendarTab({ todoData }) {
  const [view, setView] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toKey(new Date()));
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gEvents, setGEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = toKey(new Date());

  // Google 로그인
  const handleGoogleLogin = () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: async (res) => {
        if (res.access_token) {
          setAccessToken(res.access_token);
          setIsSignedIn(true);
          fetchEvents(res.access_token);
        }
      },
    });
    client.requestAccessToken();
  };

  // 구글 캘린더 이벤트 가져오기
  const fetchEvents = async (token) => {
    setLoading(true);
    try {
      const start = new Date(y, m, 1).toISOString();
      const end = new Date(y, m + 1, 0, 23, 59).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setGEvents(data.items || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (accessToken) fetchEvents(accessToken);
  }, [view]);

  // 날짜별 구글 이벤트
  const getGEvents = (dateKey) => gEvents.filter(e => {
    const start = e.start?.date || e.start?.dateTime?.slice(0,10);
    return start === dateKey;
  });

  // 날짜별 할일 (회사업무 마감일)
  const getWorkItems = (dateKey) => {
    const all = Object.values(todoData?.work || {}).flat();
    return all.filter(t => t.due === dateKey || t.startDate === dateKey);
  };

  // 날짜별 루틴
  const getRoutines = (dateKey) => (todoData?.routines || []).filter(r => r.addedDate <= dateKey && !(r.removed && r.removed[dateKey]));

  const selectedGEvents = getGEvents(selectedDate);
  const selectedWork = getWorkItems(selectedDate);
  const selectedRoutines = getRoutines(selectedDate);
  const selectedDaily = (todoData?.daily || {})[selectedDate] || [];

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setView(new Date(y, m-1, 1))} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 8px' }}>‹</button>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{y}년 {MONTHS[m]}</span>
        <button onClick={() => setView(new Date(y, m+1, 1))} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 8px' }}>›</button>
      </div>

      {/* 구글 로그인 */}
      {!isSignedIn ? (
        <button onClick={handleGoogleLogin} style={{
          width: '100%', padding: '12px', borderRadius: 12, marginBottom: 16,
          background: 'var(--card)', border: '1.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          <span>🗓️</span> Google 캘린더 연동하기
        </button>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>✅ Google 캘린더 연동됨 {loading && '(불러오는 중...)'}</div>
      )}

      {/* 달력 */}
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 12, marginBottom: 16, border: '1.5px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--sub)', padding: '4px 0', fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const k = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = k === todayKey;
            const isSel = k === selectedDate;
            const hasGEvent = getGEvents(k).length > 0;
            const hasWork = getWorkItems(k).length > 0;
            return (
              <button key={day} onClick={() => setSelectedDate(k)} style={{
                padding: '6px 2px', borderRadius: 8,
                background: isSel ? 'var(--accent)' : isToday ? 'var(--accent-bg)' : 'transparent',
                color: isSel ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
                fontWeight: isSel || isToday ? 700 : 400, fontSize: 13,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                {day}
                <div style={{ display: 'flex', gap: 2 }}>
                  {hasGEvent && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.8)' : '#4285f4', display: 'inline-block' }} />}
                  {hasWork && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.8)' : 'var(--yellow)', display: 'inline-block' }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 상세 */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--accent)' }}>{selectedDate}</div>

      {/* 구글 캘린더 일정 */}
      {selectedGEvents.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4285f4', marginBottom: 6 }}>🗓️ Google 캘린더</div>
          {selectedGEvents.map(e => (
            <div key={e.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1.5px solid #4285f422' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.summary}</div>
              {e.start?.dateTime && <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>{new Date(e.start.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>}
              {e.location && <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>📍 {e.location}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 회사업무 */}
      {selectedWork.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>💼 회사업무</div>
          {selectedWork.map(t => (
            <div key={t.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1.5px solid var(--yellow-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
              {t.due && <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>마감 {t.due}</div>}
              {t.priority && <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2, fontWeight: 700 }}>{t.priority}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 루틴 */}
      {selectedRoutines.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>🔄 루틴</div>
          {selectedRoutines.map(r => (
            <div key={r.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* 일상 */}
      {selectedDaily.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>🌿 일상</div>
          {selectedDaily.map(t => (
            <div key={t.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1.5px solid var(--green-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
            </div>
          ))}
        </div>
      )}

      {selectedGEvents.length === 0 && selectedWork.length === 0 && selectedRoutines.length === 0 && selectedDaily.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--sub)', padding: '30px 0', fontSize: 13 }}>이날 일정이 없어요 😊</div>
      )}
    </div>
  );
}

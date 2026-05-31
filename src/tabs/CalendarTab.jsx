import { useState, useEffect } from 'react';
import { uid, toKey, DAYS } from '../utils/helpers';

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const GOOGLE_COLORS = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#3f51b5',
  '9': '#0b8043', '10': '#d60000', '11': '#616161',
};

const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none' };

export default function CalendarTab({ todoData }) {
  const [view, setView] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toKey(new Date()));
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gEvents, setGEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayKey = toKey(new Date());
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // 구글 로그인
  const handleGoogleLogin = () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.events',
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

  // 이벤트 가져오기
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

  useEffect(() => { if (accessToken) fetchEvents(accessToken); }, [view]);

  // 일정 추가
  const addEvent = async () => {
    if (!form.title || !form.startDate) return;
    const event = {
      summary: form.title,
      start: form.allDay ? { date: form.startDate } : { dateTime: `${form.startDate}T${form.startTime||'09:00'}:00`, timeZone: 'Asia/Seoul' },
      end: form.allDay ? { date: form.endDate || form.startDate } : { dateTime: `${form.endDate||form.startDate}T${form.endTime||'10:00'}:00`, timeZone: 'Asia/Seoul' },
      description: form.memo || '',
      location: form.location || '',
      colorId: form.colorId || '7',
    };
    try {
      await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      fetchEvents(accessToken);
      setShowAddForm(false);
      setForm({});
    } catch(e) { console.error(e); }
  };

  // 일정 삭제
  const deleteEvent = async (eventId) => {
    if (!window.confirm('일정을 삭제할까요?')) return;
    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchEvents(accessToken);
      setSelectedEvent(null);
    } catch(e) { console.error(e); }
  };

  // 날짜별 이벤트
  const getEventsForDate = (dateKey) => gEvents.filter(e => {
    const start = e.start?.date || e.start?.dateTime?.slice(0,10);
    const end = e.end?.date || e.end?.dateTime?.slice(0,10);
    return start <= dateKey && dateKey <= end;
  });

  const getWorkItems = (dateKey) => Object.values(todoData?.work || {}).flat().filter(t => t.due === dateKey || t.startDate === dateKey);
  const getRoutines = (dateKey) => (todoData?.routines || []).filter(r => r.addedDate <= dateKey && !(r.removed && r.removed[dateKey]));

  const selectedGEvents = getEventsForDate(selectedDate);
  const selectedWork = getWorkItems(selectedDate);
  const selectedRoutines = getRoutines(selectedDate);
  const selectedDaily = (todoData?.daily || {})[selectedDate] || [];

  const getEventColor = (e) => GOOGLE_COLORS[e.colorId] || '#4285f4';

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
          🗓️ Google 캘린더 연동하기
        </button>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✅ 연동됨 {loading && '(불러오는 중...)'}</span>
          <button onClick={() => { setShowAddForm(true); setForm({ startDate: selectedDate, endDate: selectedDate, allDay: true }); }} style={{ padding: '6px 14px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12 }}>+ 일정 추가</button>
        </div>
      )}

      {/* 달력 */}
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 12, marginBottom: 16, border: '1.5px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, padding: '4px 0', fontWeight: 600, color: i===0?'var(--red)':i===6?'#4285f4':'var(--sub)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const k = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = k === todayKey;
            const isSel = k === selectedDate;
            const dayEvents = getEventsForDate(k);
            const hasWork = getWorkItems(k).length > 0;
            const dow = (firstDay + i) % 7;
            return (
              <div key={day} onClick={() => setSelectedDate(k)} style={{ cursor: 'pointer', minHeight: 52, padding: '2px 2px 4px' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', margin: '0 auto 2px',
                  background: isSel ? 'var(--accent)' : isToday ? 'var(--accent-bg)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: isSel||isToday ? 700 : 400,
                  color: isSel ? '#fff' : isToday ? 'var(--accent)' : dow===0 ? 'var(--red)' : dow===6 ? '#4285f4' : 'var(--text)',
                }}>{day}</div>
                {/* 이벤트 바 */}
                {dayEvents.slice(0,2).map(e => (
                  <div key={e.id} style={{
                    background: getEventColor(e), borderRadius: 3,
                    fontSize: 9, color: '#fff', padding: '1px 3px',
                    marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontWeight: 600,
                  }}>{e.summary}</div>
                ))}
                {dayEvents.length > 2 && <div style={{ fontSize: 9, color: 'var(--sub)', paddingLeft: 2 }}>+{dayEvents.length-2}</div>}
                {hasWork && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--yellow)', margin: '1px auto 0' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--accent)' }}>{selectedDate}</div>

      {/* 구글 캘린더 일정 */}
      {selectedGEvents.map(e => (
        <div key={e.id} onClick={() => setSelectedEvent(selectedEvent?.id===e.id ? null : e)} style={{
          background: 'var(--card)', borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          borderLeft: `4px solid ${getEventColor(e)}`, cursor: 'pointer',
          border: `1.5px solid ${getEventColor(e)}33`,
          borderLeftWidth: 4, borderLeftColor: getEventColor(e),
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{e.summary}</div>
            {isSignedIn && <button onClick={ev => { ev.stopPropagation(); deleteEvent(e.id); }} style={{ fontSize: 11, color: 'var(--red)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--red-bg)', background: 'var(--red-bg)' }}>삭제</button>}
          </div>
          {selectedEvent?.id === e.id && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--sub)', lineHeight: 1.8 }}>
              {e.start?.dateTime && <div>⏰ {new Date(e.start.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ {new Date(e.end.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>}
              {e.start?.date && e.end?.date && e.start.date !== e.end.date && <div>📅 {e.start.date} ~ {e.end.date}</div>}
              {e.location && <div>📍 {e.location}</div>}
              {e.description && <div>📝 {e.description}</div>}
            </div>
          )}
        </div>
      ))}

      {/* 회사업무 */}
      {selectedWork.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>💼 회사업무</div>
          {selectedWork.map(t => (
            <div key={t.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, borderLeft: '4px solid var(--yellow)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
              {t.due && <div style={{ fontSize: 11, color: 'var(--sub)' }}>마감 {t.due}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 루틴 */}
      {selectedRoutines.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>🔄 루틴</div>
          {selectedRoutines.map(r => (
            <div key={r.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, borderLeft: '4px solid var(--accent)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* 일상 */}
      {selectedDaily.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>🌿 일상</div>
          {selectedDaily.map(t => (
            <div key={t.id} style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, borderLeft: '4px solid var(--green)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
            </div>
          ))}
        </div>
      )}

      {selectedGEvents.length === 0 && selectedWork.length === 0 && selectedRoutines.length === 0 && selectedDaily.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--sub)', padding: '30px 0', fontSize: 13 }}>이날 일정이 없어요 😊</div>
      )}

      {/* 일정 추가 모달 */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,40,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowAddForm(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '22px 22px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>📅 일정 추가</span>
              <button onClick={() => setShowAddForm(false)} style={{ fontSize: 22, color: 'var(--sub)' }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}><label style={lbl}>제목 *</label><input style={inp} placeholder="일정 제목" value={form.title||''} onChange={e => F('title', e.target.value)} /></div>

            {/* 종일 토글 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => F('allDay', v)} style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: `1.5px solid ${form.allDay===v ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.allDay===v ? 'var(--accent-bg)' : 'var(--card)',
                  color: form.allDay===v ? 'var(--accent)' : 'var(--sub)',
                  fontWeight: form.allDay===v ? 700 : 400, fontSize: 13,
                }}>{v ? '종일' : '시간 지정'}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label style={lbl}>시작일 *</label><input style={inp} type="date" value={form.startDate||''} onChange={e => F('startDate', e.target.value)} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>종료일</label><input style={inp} type="date" value={form.endDate||''} onChange={e => F('endDate', e.target.value)} /></div>
            </div>

            {!form.allDay && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}><label style={lbl}>시작 시간</label><input style={inp} type="time" value={form.startTime||'09:00'} onChange={e => F('startTime', e.target.value)} /></div>
                <div style={{ flex: 1 }}><label style={lbl}>종료 시간</label><input style={inp} type="time" value={form.endTime||'10:00'} onChange={e => F('endTime', e.target.value)} /></div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}><label style={lbl}>장소</label><input style={inp} placeholder="장소 (선택)" value={form.location||''} onChange={e => F('location', e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>메모</label><textarea style={{...inp, resize:'none'}} rows={2} placeholder="메모 (선택)" value={form.memo||''} onChange={e => F('memo', e.target.value)} /></div>

            {/* 색상 선택 */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>색상</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(GOOGLE_COLORS).map(([id, color]) => (
                  <button key={id} onClick={() => F('colorId', id)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: color,
                    border: form.colorId===id ? '3px solid var(--text)' : '3px solid transparent',
                  }} />
                ))}
              </div>
            </div>

            <button onClick={addEvent} disabled={!form.title||!form.startDate} style={{
              width: '100%', borderRadius: 14, padding: '14px',
              fontWeight: 700, fontSize: 15,
              background: !form.title||!form.startDate ? 'var(--border)' : 'var(--accent)',
              color: !form.title||!form.startDate ? 'var(--sub)' : '#fff',
            }}>저장</button>
          </div>
        </div>
      )}
    </div>
  );
}

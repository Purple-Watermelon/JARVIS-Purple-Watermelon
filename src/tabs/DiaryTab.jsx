import { useState, useRef } from 'react';
import { uid, fmtDate, toKey, Store } from '../utils/helpers';
import { CalendarOverlay, Modal, SaveBtn } from '../components/UI';
import { DAYS } from '../utils/helpers';

const EMOTIONS = [
  { emoji: '🐷❤️', label: '행복' },
  { emoji: '😊', label: '좋음' },
  { emoji: '😐', label: '평범' },
  { emoji: '😢', label: '슬픔' },
  { emoji: '😤', label: '화남' },
  { emoji: '😴', label: '지침' },
];

export default function DiaryTab({ data, setData, unlocked, setUnlocked }) {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [showCal, setShowCal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const fileRef = useRef();

  const { y, m, day, dow, key } = fmtDate(date);
  const entries = data || {};
  const entry = entries[key] || null;

  const savedPin = Store.get('jarvis-pin');

  // ── PIN Lock ───────────────────────────────────────────────────────────
  const tapPin = d => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      const sp = Store.get('jarvis-pin');
      if (!sp || next === sp) {
        setTimeout(() => { setUnlocked(true); setPin(''); }, 150);
      } else {
        setTimeout(() => { setPin(''); setPinError(true); setTimeout(() => setPinError(false), 800); }, 300);
      }
    }
  };

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📓</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>일기장 잠금</div>
        <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 32 }}>{savedPin ? 'PIN을 입력하세요' : '처음 사용 시 아무 PIN이나 입력하면 설정돼요'}</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: pin.length>i ? (pinError?'var(--red)':'var(--accent)') : 'var(--border)', transition: 'background 0.2s' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,72px)', gap: 12 }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
            <button key={i} onClick={() => d==='⌫' ? setPin(p=>p.slice(0,-1)) : d!=='' ? tapPin(String(d)) : null} style={{
              height: 72, borderRadius: 16, fontSize: d==='⌫'?20:24, fontWeight: 600,
              background: d===''?'transparent':'var(--card)', color: d==='⌫'?'var(--sub)':'var(--text)',
              boxShadow: d===''?'none':'0 2px 8px rgba(124,92,191,0.1)', border: d===''?'none':'1.5px solid var(--border)',
            }}>{d}</button>
          ))}
        </div>
      </div>
    );
  }

  // ── Diary content ──────────────────────────────────────────────────────
  const saveEntry = (updated) => {
    setData(p => ({ ...p, [key]: updated }));
    setEditEntry(null);
  };

  const delPhoto = (photoId) => {
    if (!entry) return;
    const updated = { ...entry, photos: (entry.photos||[]).filter(p=>p.id!==photoId) };
    setData(p => ({ ...p, [key]: updated }));
  };

  const addPhotos = (files) => {
    const readers = Array.from(files).map(file => new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => resolve({ id: uid(), src: e.target.result, comment: '' });
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then(newPhotos => {
      const updated = { ...(entry||{date:key}), photos: [...((entry||{}).photos||[]), ...newPhotos] };
      setData(p => ({ ...p, [key]: updated }));
    });
  };

  const updatePhotoComment = (photoId, comment) => {
    const updated = { ...entry, photos: (entry.photos||[]).map(p=>p.id===photoId?{...p,comment}:p) };
    setData(p => ({ ...p, [key]: updated }));
  };

  const WriteModal = () => {
    const [form, setForm] = useState(entry || { emotion: '', text: '' });
    return (
      <Modal title="일기 쓰기" onClose={() => setEditEntry(null)}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8, fontWeight: 600 }}>오늘의 감정</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {EMOTIONS.map(e => (
              <button key={e.label} onClick={() => setForm(p=>({...p,emotion:e.label}))} style={{
                padding: '10px 6px', borderRadius: 12, textAlign: 'center',
                border: `2px solid ${form.emotion===e.label?'var(--accent)':'var(--border)'}`,
                background: form.emotion===e.label?'var(--accent-bg)':'var(--card)',
              }}>
                <div style={{ fontSize: 22 }}>{e.emoji}</div>
                <div style={{ fontSize: 11, color: form.emotion===e.label?'var(--accent)':'var(--sub)', marginTop: 3, fontWeight: form.emotion===e.label?700:400 }}>{e.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8, fontWeight: 600 }}>오늘 하루</div>
          <textarea style={{ width:'100%', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px', fontSize:14, lineHeight:1.8, minHeight:160, outline:'none', background:'var(--card)', color:'var(--text)', resize:'none' }}
            placeholder="오늘은 어떤 하루였나요? ✍️"
            value={form.text||''}
            onChange={e => setForm(p=>({...p,text:e.target.value}))}
          />
        </div>
        <SaveBtn onClick={() => saveEntry({ ...(entry||{}), ...form, date: key })} label="저장" />
      </Modal>
    );
  };

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      {/* Date Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate()-1); return n; })} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 8px' }}>‹</button>
        <button onClick={() => setShowCal(true)} style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{m}월 {day}일</div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{y} {dow}요일</div>
        </button>
        <button onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate()+1); return n; })} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 8px' }}>›</button>
      </div>

      {/* Lock settings */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowSetPin(true)} style={{ fontSize: 12, color: 'var(--sub)', display: 'flex', alignItems: 'center', gap: 4 }}>🔒 PIN 변경</button>
      </div>

      {/* Entry */}
      {entry ? (
        <div>
          {/* Emotion */}
          {entry.emotion && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {EMOTIONS.find(e=>e.label===entry.emotion) && (
                <div>
                  <div style={{ fontSize: 48 }}>{EMOTIONS.find(e=>e.label===entry.emotion)?.emoji}</div>
                  <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4, fontWeight: 600 }}>{entry.emotion}</div>
                </div>
              )}
            </div>
          )}

          {/* Text */}
          {entry.text && (
            <div style={{ background: 'var(--card)', borderRadius: 16, padding: '18px', marginBottom: 16, lineHeight: 1.85, fontSize: 14, color: 'var(--text)', boxShadow: '0 2px 12px rgba(124,92,191,0.08)', whiteSpace: 'pre-wrap' }}>
              {entry.text}
            </div>
          )}

          {/* Photos (Polaroid style) */}
          {(entry.photos||[]).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {entry.photos.map(photo => (
                <div key={photo.id} style={{ background: '#fff', borderRadius: 4, padding: '12px 12px 8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', transform: `rotate(${(Math.random()-0.5)*2}deg)` }}>
                  <img
                    src={photo.src}
                    alt=""
                    onClick={() => setViewPhoto(photo)}
                    onContextMenu={e => { e.preventDefault(); if(window.confirm('사진을 삭제할까요?')) delPhoto(photo.id); }}
                    style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 2, cursor: 'pointer', display: 'block' }}
                  />
                  <input
                    value={photo.comment||''}
                    onChange={e => updatePhotoComment(photo.id, e.target.value)}
                    placeholder="코멘트..."
                    style={{ width:'100%', border:'none', outline:'none', fontSize:12, color:'var(--sub)', marginTop:8, background:'transparent', textAlign:'center', fontStyle:'italic' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditEntry(true)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>✎ 수정</button>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', fontWeight: 700, color: 'var(--sub)', fontSize: 13 }}>📸 사진 추가</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0 30px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📓</div>
          <div style={{ fontSize: 15, color: 'var(--sub)', lineHeight: 1.8, marginBottom: 24 }}>오늘의 일기를 써볼까요?</div>
          <button onClick={() => setEditEntry(true)} style={{ padding: '14px 32px', borderRadius: 14, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15 }}>✍️ 일기 쓰기</button>
        </div>
      )}

      {!entry && <button onClick={() => fileRef.current?.click()} style={{ width:'100%', marginTop:12, padding:'12px', borderRadius:12, border:'1.5px dashed var(--border)', color:'var(--sub)', fontSize:13 }}>📸 사진만 추가</button>}

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => { addPhotos(e.target.files); e.target.value=''; }} />

      {showCal && <CalendarOverlay current={{ y, m, day }} onSelect={setDate} onClose={() => setShowCal(false)} dotKeys={Object.keys(entries)} />}

      {editEntry && <WriteModal />}

      {/* Photo fullscreen */}
      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <img src={viewPhoto.src} alt="" style={{ maxWidth:'100%',maxHeight:'80vh',borderRadius:8,objectFit:'contain' }} />
        </div>
      )}

      {/* PIN change modal */}
      {showSetPin && (
        <Modal title="🔒 PIN 변경" onClose={() => { setShowSetPin(false); setNewPin(''); setNewPinConfirm(''); }}>
          <div style={{ marginBottom: 12 }}><label style={{ fontSize:11,color:'var(--sub)',fontWeight:600,display:'block',marginBottom:5 }}>새 PIN (4자리)</label>
            <input style={{ width:'100%',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 12px',fontSize:14,background:'var(--card)',outline:'none',letterSpacing:8 }} type="password" maxLength={4} inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="••••" />
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ fontSize:11,color:'var(--sub)',fontWeight:600,display:'block',marginBottom:5 }}>PIN 확인</label>
            <input style={{ width:'100%',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 12px',fontSize:14,background:'var(--card)',outline:'none',letterSpacing:8 }} type="password" maxLength={4} inputMode="numeric" value={newPinConfirm} onChange={e=>setNewPinConfirm(e.target.value)} placeholder="••••" />
          </div>
          {newPin && newPinConfirm && newPin!==newPinConfirm && <div style={{color:'var(--red)',fontSize:12,marginBottom:8}}>PIN이 일치하지 않아요</div>}
          <SaveBtn onClick={() => {
            if (newPin.length===4 && newPin===newPinConfirm) { Store.set('jarvis-pin', newPin); setShowSetPin(false); setNewPin(''); setNewPinConfirm(''); alert('PIN이 변경됐어요!'); }
          }} disabled={newPin.length!==4||newPin!==newPinConfirm} label="PIN 저장" />
        </Modal>
      )}
    </div>
  );
}

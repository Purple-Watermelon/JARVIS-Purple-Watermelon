import { useState } from 'react';
import { Card } from '../components/UI';

const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none' };

export default function SettingsTab({ cats, setCats, gTags, setGTags, discReasons, setDiscReasons, todoData, setTodoData }) {
  const [selCat, setSelCat] = useState(Object.keys(cats)[0] || '');
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newDisc, setNewDisc] = useState('');

  const addCat = () => {
    const c = newCat.trim();
    if (!c || cats[c]) return;
    setCats(p => ({ ...p, [c]: [] }));
    setSelCat(c); setNewCat('');
  };
  const delCat = cat => {
    const n = { ...cats }; delete n[cat];
    setCats(n); setSelCat(Object.keys(n)[0] || '');
  };
  const addSub = () => {
    const s = newSub.trim();
    if (!s || (cats[selCat] || []).includes(s)) return;
    setCats(p => ({ ...p, [selCat]: [...(p[selCat]||[]), s] }));
    setNewSub('');
  };
  const delSub = (cat, sub) => setCats(p => ({ ...p, [cat]: (p[cat]||[]).filter(s => s !== sub) }));
  const addTag = () => {
    let t = newTag.trim(); if (!t) return;
    if (!t.startsWith('#')) t = '#' + t;
    if (!gTags.includes(t)) setGTags(p => [...p, t]);
    setNewTag('');
  };
  const delTag = t => setGTags(p => p.filter(x => x !== t));
  const addDisc = () => {
    const d = newDisc.trim();
    if (!d || (discReasons||[]).includes(d)) return;
    setDiscReasons(p => [...p, d]);
    setNewDisc('');
  };
  const delDisc = r => setDiscReasons(p => p.filter(x => x !== r));

  const AddBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 700, flexShrink: 0 }}>추가</button>
  );

  return (
    <div style={{ padding: 16, paddingBottom: 90, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>⚙️ 설정</div>

      {/* 카테고리 관리 */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>카테고리 관리</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="새 대분류" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key==='Enter'&&addCat()} />
          <AddBtn onClick={addCat} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {Object.keys(cats).map(c => (
            <button key={c} onClick={() => setSelCat(c)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: selCat===c ? 'var(--accent)' : 'var(--bg)',
              color: selCat===c ? '#fff' : 'var(--text)',
              border: `1.5px solid ${selCat===c?'var(--accent)':'var(--border)'}`,
            }}>{c}</button>
          ))}
        </div>
        {selCat && cats[selCat] !== undefined && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{selCat} 소분류</span>
              <button onClick={() => delCat(selCat)} style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>분류 삭제</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="새 소분류" value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key==='Enter'&&addSub()} />
              <AddBtn onClick={addSub} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(cats[selCat] || []).map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg)', borderRadius: 20, padding: '6px 10px 6px 14px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>{s}</span>
                  <button onClick={() => delSub(selCat, s)} style={{ color: 'var(--red)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 할인 이유 관리 */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>할인 이유 관리</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="새 할인 이유" value={newDisc} onChange={e => setNewDisc(e.target.value)} onKeyDown={e => e.key==='Enter'&&addDisc()} />
          <AddBtn onClick={addDisc} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(discReasons||[]).map(r => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--green-bg)', borderRadius: 20, padding: '6px 10px 6px 14px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}>{r}</span>
              <button onClick={() => delDisc(r)} style={{ color: 'var(--red)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>
      </Card>

      {/* 태그 관리 */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>태그 관리</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="#새 태그" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key==='Enter'&&addTag()} />
          <AddBtn onClick={addTag} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {gTags.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-bg)', borderRadius: 20, padding: '6px 10px 6px 14px' }}>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{t}</span>
              <button onClick={() => delTag(t)} style={{ color: 'var(--red)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>
      </Card>

      {/* ⚠️ 임시: 회사업무 전체 삭제 (쓰고 나서 이 카드 통째로 지울 것) */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, color: 'var(--red)' }}>⚠️ 회사업무 데이터 정리</div>
        <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 12, lineHeight: 1.6 }}>
          버그로 쌓인 회사업무 찌꺼기를 전부 삭제해요.<br/>
          (루틴·일상·위시·일기·가계부는 안 지워져요)
        </div>
        <button
          onClick={() => {
            if (!window.confirm('회사업무를 전부 삭제할까요?\n되돌릴 수 없어요!')) return;
            setTodoData(p => ({ ...p, work: {} }));
            alert('회사업무를 모두 삭제했어요! 🐷');
          }}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          🗑 회사업무 전체 삭제
        </button>
      </Card>

      {/* 앱 정보 */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>앱 정보</div>
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 2 }}>
          <div>버전: 1.0.0</div>
          <div>저장 방식: Firebase 클라우드</div>
          <div style={{ fontSize: 12, marginTop: 8, background: 'var(--bg)', borderRadius: 10, padding: 10, lineHeight: 1.8 }}>
            ✅ 데이터가 클라우드에 안전하게 저장됩니다.<br/>
            PC와 폰에서 실시간 동기화돼요.<br/>
            Firebase (Google) 서버에 저장됩니다.
          </div>
        </div>
      </Card>
    </div>
  );
}

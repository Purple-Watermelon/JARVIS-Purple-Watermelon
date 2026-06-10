import { useState, useEffect } from 'react';
import { Store, DEFAULT_CATS, FIREBASE_KEYS, DEFAULT_DISCOUNT_REASONS } from './utils/helpers';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import TodoTab    from './tabs/TodoTab';
import LedgerTab  from './tabs/LedgerTab';
import DiaryTab   from './tabs/DiaryTab';
import CycleTab   from './tabs/CycleTab';
import SettingsTab from './tabs/SettingsTab';
import CalendarTab from './tabs/CalendarTab';

const TABS = [
  { id: 'todo',    icon: '✅', label: '할일'   },
  { id: 'ledger',  icon: '💰', label: '가계부' },
  { id: 'calendar', icon: '📅', label: '달력'   },
  { id: 'diary',   icon: '📓', label: '일기'   },
  { id: 'cycle',   icon: '🔄', label: '주기'   },
  { id: 'settings',icon: '⚙️', label: '설정'  },
];

export default function App() {
  const [tab, setTab] = useState('todo');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [diaryUnlocked, setDiaryUnlocked] = useState(false);

  // Data slices
  const [todoData,   setTodoData]   = useState({ routines:[], work:{}, daily:{}, wish:[], completed:{} });
  const [ledgerData, setLedgerData] = useState([]);
  const [diaryData,  setDiaryData]  = useState({});
  const [essItems,   setEssItems]   = useState([]);
  const [cats,       setCats]       = useState(DEFAULT_CATS);
  const [gTags, setGTags] = useState(['#사치','#스트레스','#건강','#필수']);
  const [discReasons, setDiscReasons] = useState(DEFAULT_DISCOUNT_REASONS);

  const USER_ID = 'subin';

  // Load all from Firebase
  useEffect(() => {
    const load = async () => {
      // 키 하나를 안전하게 불러온다. 성공하면 {ok:true, value}, 실패하면 {ok:false}
      const loadOne = async (key) => {
        try {
          const snap = await getDoc(doc(db, key, USER_ID));
          return { ok: true, value: snap.exists() ? snap.data().value : null };
        } catch (e) {
          console.error(`[불러오기 실패] ${key}:`, e);
          return { ok: false, value: null };
        }
      };

      const td  = await loadOne('todo');
      const ld  = await loadOne('ledger');
      const dd  = await loadOne('diary');
      const ed  = await loadOne('ess');
      const cd  = await loadOne('cats');
      const tgs = await loadOne('tags');
      const dr  = await loadOne('discReasons');

      // 하나라도 통신 자체에 실패했으면 = 위험 상황 → 저장 켜지 않고 차단
      const anyFailed = [td, ld, dd, ed, cd, tgs, dr].some(r => !r.ok);
      if (anyFailed) {
        console.error('불러오기 실패 감지 → 저장 차단 (데이터 보호)');
        setLoadError(true);
        return;
      }

      // 통신 성공한 경우에만 값을 화면에 반영
      if (td.value)  setTodoData(td.value);
      if (ld.value)  setLedgerData(ld.value);
      if (dd.value)  setDiaryData(dd.value);
      if (ed.value)  setEssItems(ed.value);
      if (cd.value)  setCats(cd.value);
      if (tgs.value) setGTags(tgs.value);
      if (dr.value)  setDiscReasons(dr.value);

      // 모두 정상적으로 불러왔을 때만 저장 기능을 켠다
      setReady(true);
    };
    load();
  }, []);

  // Save to Firebase (ready가 true일 때만, 즉 불러오기 성공 후에만 동작)
  const save = async (key, value) => {
    try { await setDoc(doc(db, key, USER_ID), { value }); } catch(e) { console.error('Firebase save error:', e); }
  };

  useEffect(() => { if (ready) save('todo',   todoData);   }, [todoData,   ready]);
  useEffect(() => { if (ready) save('ledger', ledgerData); }, [ledgerData, ready]);
  useEffect(() => { if (ready) save('diary',  diaryData);  }, [diaryData,  ready]);
  useEffect(() => { if (ready) save('ess',    essItems);   }, [essItems,   ready]);
  useEffect(() => { if (ready) save('cats',   cats);       }, [cats,       ready]);
  useEffect(() => { if (ready) save('discReasons', discReasons); }, [discReasons, ready]);

  // 불러오기 실패 시: 저장을 멈추고 안내 화면 표시 (데이터 보호)
  if (loadError) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', padding:24, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)' }}>데이터를 불러오지 못했어요</div>
      <div style={{ fontSize:13, color:'var(--sub)', marginTop:8, lineHeight:1.6 }}>
        기록을 보호하기 위해 저장을 멈췄어요.<br/>인터넷 연결을 확인하고 잠시 후 새로고침 해주세요.
      </div>
      <button onClick={() => window.location.reload()} style={{ marginTop:20, padding:'10px 24px', border:'none', borderRadius:10, background:'var(--accent)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        다시 시도
      </button>
    </div>
  );

  if (!ready) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🟣</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)' }}>JARVIS Purple</div>
      <div style={{ fontSize:13, color:'var(--sub)', marginTop:8 }}>불러오는 중...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'var(--bg)', color:'var(--text)', position:'relative', boxShadow:'0 0 40px rgba(124,92,191,0.15)' }}>

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'var(--card)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:57 }}>
        <span style={{ fontWeight:800, fontSize:18, color:'var(--accent)', letterSpacing:-0.5 }}>🍉💜 JARVIS <span style={{ fontWeight:400, fontSize:14 }}>Purple Watermelon</span></span>
        <span style={{ fontSize:12, color:'var(--sub)' }}>{new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})}</span>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 70 }}>
        {tab === 'todo'     && <TodoTab     data={todoData}   setData={setTodoData}   essItems={essItems} setEssItems={setEssItems} />}
        {tab === 'ledger'   && <LedgerTab   data={ledgerData} setData={setLedgerData} cats={cats} gTags={gTags} setGTags={setGTags} essItems={essItems} setEssItems={setEssItems} discReasons={discReasons} setDiscReasons={setDiscReasons} />}
        {tab === 'diary'    && <DiaryTab    data={diaryData}  setData={setDiaryData}  unlocked={diaryUnlocked} setUnlocked={setDiaryUnlocked} />}
        {tab === 'cycle'    && <CycleTab    data={essItems}   setData={setEssItems} />}
        {tab === 'calendar' && <CalendarTab todoData={todoData} />}
        {tab === 'settings' && <SettingsTab cats={cats} setCats={setCats} gTags={gTags} setGTags={setGTags} discReasons={discReasons} setDiscReasons={setDiscReasons} />}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'var(--card)', borderTop: '1px solid var(--border)',
        display: 'flex', zIndex: 100,
        boxShadow: '0 -4px 20px rgba(124,92,191,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => {
            if (t.id === 'diary' && tab !== 'diary') setDiaryUnlocked(false);
            setTab(t.id);
          }} style={{
            flex: 1, padding: '8px 0 10px', border: 'none', background: 'none', cursor: 'pointer',
            color: tab===t.id ? 'var(--accent)' : 'var(--sub)',
            fontWeight: tab===t.id ? 700 : 400,
            transition: 'color 0.2s',
          }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{t.icon}</div>
            <div style={{ fontSize: 10, letterSpacing: 0.3 }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

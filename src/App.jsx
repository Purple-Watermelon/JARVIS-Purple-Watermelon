import { useState, useEffect } from 'react';
import { Store, DEFAULT_CATS, FIREBASE_KEYS, DEFAULT_DISCOUNT_REASONS } from './utils/helpers';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import TodoTab    from './tabs/TodoTab';
import FloatingTodo from './components/FloatingTodo';
import LedgerTab  from './tabs/LedgerTab';
import DiaryTab   from './tabs/DiaryTab';
import CycleTab   from './tabs/CycleTab';
import SettingsTab from './tabs/SettingsTab';
import CalendarTab from './tabs/CalendarTab';

const KEYS = {
  todo:    'jarvis-todo-v1',
  ledger:  'jarvis-ledger-v1',
  diary:   'jarvis-diary-v1',
  ess:     'jarvis-ess-v1',
  cats:    'jarvis-cats-v1',
  tags:    'jarvis-tags-v1',
};

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
      try {
        const keys = ['todo','ledger','diary','ess','cats','tags','discReasons'];
        const docs = await Promise.all(keys.map(k => getDoc(doc(db, k, USER_ID))));
        const [td, ld, dd, ed, cd, tgs, dr] = docs.map(d => d.exists() ? d.data().value : null);
        if (td)  setTodoData(td);
        if (ld)  setLedgerData(ld);
        if (dd)  setDiaryData(dd);
        if (ed)  setEssItems(ed);
        if (cd)  setCats(cd);
        if (tgs) setGTags(tgs);
        if (dr)  setDiscReasons(dr);
      } catch(e) { console.error('Firebase load error:', e); }
      setReady(true);
    };
    load();
  }, []);

  // Save to Firebase
  const save = async (key, value) => {
    try { await setDoc(doc(db, key, USER_ID), { value }); } catch(e) { console.error('Firebase save error:', e); }
  };

  useEffect(() => { if (ready) save('todo',   todoData);   }, [todoData,   ready]);
  useEffect(() => { if (ready) save('ledger', ledgerData); }, [ledgerData, ready]);
  useEffect(() => { if (ready) save('diary',  diaryData);  }, [diaryData,  ready]);
  useEffect(() => { if (ready) save('ess',    essItems);   }, [essItems,   ready]);
  useEffect(() => { if (ready) save('cats',   cats);       }, [cats,       ready]);
  useEffect(() => { if (ready) save('discReasons', discReasons); }, [discReasons, ready]);

  if (!ready) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🟣</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)' }}>JARVIS Purple</div>
      <div style={{ fontSize:13, color:'var(--sub)', marginTop:8 }}>불러오는 중...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'var(--bg)', color:'var(--text)', position:'relative' }}>

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'var(--card)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:57 }}>
        <span style={{ fontWeight:800, fontSize:18, color:'var(--accent)', letterSpacing:-0.5 }}>🍉💜 JARVIS <span style={{ fontWeight:400, fontSize:14 }}>Purple Watermelon</span></span>
        <span style={{ fontSize:12, color:'var(--sub)' }}>{new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})}</span>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 70 }}>
        {tab === 'todo'     && <TodoTab     data={todoData}   setData={setTodoData}   essItems={essItems} />}
        {tab === 'ledger'   && <LedgerTab   data={ledgerData} setData={setLedgerData} cats={cats} gTags={gTags} setGTags={setGTags} essItems={essItems} setEssItems={setEssItems} discReasons={discReasons} setDiscReasons={setDiscReasons} />}
        {tab === 'diary'    && <DiaryTab    data={diaryData}  setData={setDiaryData}  unlocked={diaryUnlocked} setUnlocked={setDiaryUnlocked} />}
        {tab === 'cycle'    && <CycleTab    data={essItems}   setData={setEssItems} />}
        {tab === 'calendar' && <CalendarTab todoData={todoData} />}
        {tab === 'settings' && <SettingsTab cats={cats} setCats={setCats} gTags={gTags} setGTags={setGTags} discReasons={discReasons} setDiscReasons={setDiscReasons} />}
      </div>

      {/* PC 플로팅 할일 위젯 */}
      <FloatingTodo todoData={todoData} setTodoData={setTodoData} />
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

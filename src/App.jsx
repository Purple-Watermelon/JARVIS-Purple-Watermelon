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
      //

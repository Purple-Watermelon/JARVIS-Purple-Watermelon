import { useState, useEffect } from 'react';
import {
  Store,
  DEFAULT_CATS,
  FIREBASE_KEYS,
  DEFAULT_DISCOUNT_REASONS
} from './utils/helpers';
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';

import TodoTab from './tabs/TodoTab';
import LedgerTab from './tabs/LedgerTab';
import DiaryTab from './tabs/DiaryTab';
import CycleTab from './tabs/CycleTab';
import SettingsTab from './tabs/SettingsTab';
import CalendarTab from './tabs/CalendarTab';

const TABS = [
  { id: 'todo', icon: '✓', label: '할 일' },
  { id: 'ledger', icon: '₩', label: '가계부' },
  { id: 'calendar', icon: '○', label: '달력' },
  { id: 'diary', icon: '✎', label: '일기' },
  { id: 'cycle', icon: '↻', label: '주기' },
  { id: 'settings', icon: '⋯', label: '설정' },
];

export default function App() {
  const [tab, setTab] = useState('todo');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [diaryUnlocked, setDiaryUnlocked] = useState(false);

  const [todoData, setTodoData] = useState({
    routines: [],
    work: {},
    daily: {},
    wish: [],
    completed: {}
  });

  const [ledgerData, setLedgerData] = useState([]);
  const [diaryData, setDiaryData] = useState({});
  const [essItems, setEssItems] = useState([]);
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [gTags, setGTags] = useState([
    '#사치',
    '#스트레스',
    '#건강',
    '#필수'
  ]);
  const [discReasons, setDiscReasons] =
    useState(DEFAULT_DISCOUNT_REASONS);

  const USER_ID = 'subin';

  /* ─────────────────────────────────────────
     Firebase 불러오기
  ───────────────────────────────────────── */

  useEffect(() => {
    const load = async () => {
      const loadOne = async key => {
        try {
          const snap = await getDoc(
            doc(db, key, USER_ID)
          );

          return {
            ok: true,
            value: snap.exists()
              ? snap.data().value
              : null
          };
        } catch (e) {
          console.error(
            `[불러오기 실패] ${key}:`,
            e
          );

          return {
            ok: false,
            value: null
          };
        }
      };

      const td = await loadOne('todo');
      const ld = await loadOne('ledger');
      const dd = await loadOne('diary');
      const ed = await loadOne('ess');
      const cd = await loadOne('cats');
      const tgs = await loadOne('tags');
      const dr = await loadOne('discReasons');

      const anyFailed = [
        td,
        ld,
        dd,
        ed,
        cd,
        tgs,
        dr
      ].some(r => !r.ok);

      if (anyFailed) {
        console.error(
          '불러오기 실패 감지 → 저장 차단'
        );

        setLoadError(true);
        return;
      }

      if (td.value) setTodoData(td.value);
      if (ld.value) setLedgerData(ld.value);
      if (dd.value) setDiaryData(dd.value);
      if (ed.value) setEssItems(ed.value);
      if (cd.value) setCats(cd.value);
      if (tgs.value) setGTags(tgs.value);
      if (dr.value) setDiscReasons(dr.value);

      setReady(true);
    };

    load();
  }, []);

  /* ─────────────────────────────────────────
     일반 저장
  ───────────────────────────────────────── */

  const save = async (key, value) => {
    try {
      await setDoc(
        doc(db, key, USER_ID),
        { value }
      );
    } catch (e) {
      console.error(
        'Firebase save error:',
        e
      );

      throw e;
    }
  };

  /* ─────────────────────────────────────────
     Diary 날짜 단위 저장
  ───────────────────────────────────────── */

  const saveDiaryEntry = async (
    dateKey,
    entry
  ) => {
    if (!ready) {
      throw new Error(
        '아직 Firebase 데이터를 불러오는 중입니다.'
      );
    }

    if (!dateKey) {
      throw new Error(
        '일기 날짜가 없습니다.'
      );
    }

    try {
      const diaryRef = doc(
        db,
        'diary',
        USER_ID
      );

      await updateDoc(
        diaryRef,
        {
          [`value.${dateKey}`]: entry
        }
      );

      setDiaryData(prev => ({
        ...prev,
        [dateKey]: entry
      }));

      console.log(
        `✅ Diary 저장 완료: ${dateKey}`
      );
    } catch (error) {
      console.error(
        `❌ Diary 저장 실패: ${dateKey}`,
        error
      );

      throw error;
    }
  };

  /* ─────────────────────────────────────────
     자동 저장
  ───────────────────────────────────────── */

  useEffect(() => {
    if (ready) {
      save('todo', todoData);
    }
  }, [todoData, ready]);

  useEffect(() => {
    if (ready) {
      save('ledger', ledgerData);
    }
  }, [ledgerData, ready]);

  useEffect(() => {
    if (ready) {
      save('ess', essItems);
    }
  }, [essItems, ready]);

  useEffect(() => {
    if (ready) {
      save('cats', cats);
    }
  }, [cats, ready]);

  useEffect(() => {
    if (ready) {
      save(
        'discReasons',
        discReasons
      );
    }
  }, [discReasons, ready]);

  /* ─────────────────────────────────────────
     로딩 실패
  ───────────────────────────────────────── */

  if (loadError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 360
          }}
        >
          <div
            style={{
              fontSize: 38,
              marginBottom: 16
            }}
          >
            🕊
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text)'
            }}
          >
            데이터를 불러오지 못했어요
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--sub)',
              marginTop: 9,
              lineHeight: 1.8
            }}
          >
            기록을 보호하기 위해
            <br />
            저장을 잠시 멈췄어요.
            <br />
            인터넷 연결을 확인한 뒤
            다시 시도해주세요.
          </div>

          <button
            onClick={() =>
              window.location.reload()
            }
            style={{
              marginTop: 22,
              padding: '11px 25px',
              borderRadius: 20,
              background:
                'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     초기 로딩
  ───────────────────────────────────────── */

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontFamily:
                "'Noto Serif KR','Batang',serif",
              fontSize: 25,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: 1
            }}
          >
            JARVIS
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--sub)',
              marginTop: 6,
              letterSpacing: 1
            }}
          >
            purple watermelon
          </div>

          <div
            style={{
              width: 34,
              height: 1,
              background:
                'var(--border)',
              margin:
                '17px auto 0'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          "'Noto Sans KR','Apple SD Gothic Neo',sans-serif",
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        position: 'relative'
      }}
    >
      {/* ─────────────────────────────────────
          상단 헤더
      ───────────────────────────────────── */}

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background:
            'rgba(255,253,251,0.94)',
          backdropFilter:
            'blur(12px)',
          borderBottom:
            '1px solid var(--border)',
          padding:
            '12px 18px 11px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between'
          }}
        >
          <button
            onClick={() =>
              setTab('todo')
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: 0,
              background: 'none'
            }}
          >
            <span
              style={{
                width: 25,
                height: 25,
                borderRadius: '50%',
                background:
                  'var(--accent-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                color:
                  'var(--accent)',
                fontSize: 14
              }}
            >
              ◐
            </span>

            <span
              style={{
                fontFamily:
                  "'Noto Serif KR','Batang',serif",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing:
                  -0.3
              }}
            >
              JARVIS
            </span>
          </button>

          <div
            style={{
              fontSize: 10,
              color: 'var(--sub)',
              letterSpacing: 0.4
            }}
          >
            {new Date().toLocaleDateString(
              'ko-KR',
              {
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              }
            )}
          </div>
        </div>

        <div
          style={{
            fontSize: 9,
            color: 'var(--sub)',
            marginTop: 3,
            marginLeft: 34,
            letterSpacing: 0.6,
            opacity: 0.8
          }}
        >
          purple watermelon
        </div>
      </header>

      {/* ─────────────────────────────────────
          본문
      ───────────────────────────────────── */}

      <main
        style={{
          padding:
            '18px 14px 92px'
        }}
      >
        {tab === 'todo' && (
          <TodoTab
            data={todoData}
            setData={setTodoData}
            essItems={essItems}
            setEssItems={setEssItems}
          />
        )}

        {tab === 'ledger' && (
          <LedgerTab
            data={ledgerData}
            setData={setLedgerData}
            cats={cats}
            gTags={gTags}
            setGTags={setGTags}
            essItems={essItems}
            setEssItems={setEssItems}
            discReasons={discReasons}
            setDiscReasons={
              setDiscReasons
            }
          />
        )}

        {tab === 'diary' && (
          <DiaryTab
            data={diaryData}
            setData={setDiaryData}
            saveDiaryEntry={
              saveDiaryEntry
            }
            unlocked={
              diaryUnlocked
            }
            setUnlocked={
              setDiaryUnlocked
            }
          />
        )}

        {tab === 'cycle' && (
          <CycleTab
            data={essItems}
            setData={setEssItems}
          />
        )}

        {tab === 'calendar' && (
          <CalendarTab
            todoData={todoData}
          />
        )}

        {tab === 'settings' && (
          <SettingsTab
            cats={cats}
            setCats={setCats}
            gTags={gTags}
            setGTags={setGTags}
            discReasons={
              discReasons
            }
            setDiscReasons={
              setDiscReasons
            }
          />
        )}
      </main>

      {/* ─────────────────────────────────────
          하단 탭
      ───────────────────────────────────── */}

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform:
            'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background:
            'rgba(255,253,251,0.96)',
          backdropFilter:
            'blur(14px)',
          borderTop:
            '1px solid var(--border)',
          display: 'flex',
          zIndex: 100,
          padding:
            '5px 4px calc(5px + env(safe-area-inset-bottom))'
        }}
      >
        {TABS.map(t => {
          const active =
            tab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => {
                if (
                  t.id === 'diary' &&
                  tab !== 'diary'
                ) {
                  setDiaryUnlocked(
                    false
                  );
                }

                setTab(t.id);
              }}
              style={{
                flex: 1,
                padding:
                  '6px 0 5px',
                borderRadius: 12,
                background:
                  active
                    ? 'var(--accent-bg)'
                    : 'transparent',
                color:
                  active
                    ? 'var(--accent)'
                    : 'var(--sub)',
                cursor: 'pointer',
                transition:
                  'all 0.2s'
              }}
            >
              <div
                style={{
                  width: 27,
                  height: 27,
                  margin: '0 auto 2px',
                  borderRadius:
                    '50%',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  fontFamily:
                    "'Noto Serif KR','Batang',serif",
                  fontSize:
                    t.id ===
                    'ledger'
                      ? 15
                      : 17,
                  fontWeight:
                    active
                      ? 700
                      : 400,
                  background:
                    active
                      ? 'var(--card)'
                      : 'transparent',
                  border:
                    active
                      ? '1px solid var(--border)'
                      : '1px solid transparent'
                }}
              >
                {t.icon}
              </div>

              <div
                style={{
                  fontSize: 9,
                  fontWeight:
                    active
                      ? 700
                      : 400,
                  letterSpacing: 0.2
                }}
              >
                {t.label}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

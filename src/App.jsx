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

import TodoTab     from './tabs/TodoTab';
import LedgerTab   from './tabs/LedgerTab';
import DiaryTab    from './tabs/DiaryTab';
import CycleTab    from './tabs/CycleTab';
import SettingsTab from './tabs/SettingsTab';
import CalendarTab from './tabs/CalendarTab';


// ─────────────────────────────────────────────────────────────
// 하단 탭
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'todo',     icon: '✅', label: '할일' },
  { id: 'ledger',   icon: '💰', label: 'Ledger' },
  { id: 'calendar', icon: '📅', label: '달력' },
  { id: 'diary',    icon: '📓', label: '일기' },
  { id: 'cycle',    icon: '🔄', label: '주기' },
  { id: 'settings', icon: '⚙️', label: '설정' },
];


// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────

export default function App() {

  const [tab, setTab] = useState('todo');

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [diaryUnlocked, setDiaryUnlocked] = useState(false);

  // ☰ 메뉴
  const [menuOpen, setMenuOpen] = useState(false);


  // ───────────────────────────────────────────────────────────
  // Data
  // ───────────────────────────────────────────────────────────

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


  // ───────────────────────────────────────────────────────────
  // ✦ AI 오늘 마무리
  //
  // AI 결과를 local state에만 두지 않고
  // Firebase에 별도 저장한다.
  //
  // 구조:
  //
  // aiReviews / subin
  //   └─ value
  //       └─ 2026-09-01
  //           ├─ review
  //           └─ updatedAt
  // ───────────────────────────────────────────────────────────

  const [aiReviews, setAiReviews] = useState({});


  const USER_ID = 'subin';


  // ───────────────────────────────────────────────────────────
  // Firebase 데이터 불러오기
  // ───────────────────────────────────────────────────────────

  useEffect(() => {

    const load = async () => {

      // 하나의 데이터를 안전하게 불러오는 함수
      const loadOne = async (key) => {

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


      // 기존 데이터
      const td  = await loadOne('todo');
      const ld  = await loadOne('ledger');
      const dd  = await loadOne('diary');
      const ed  = await loadOne('ess');
      const cd  = await loadOne('cats');
      const tgs = await loadOne('tags');
      const dr  = await loadOne('discReasons');

      // ✦ AI 분석 데이터
      const air = await loadOne('aiReviews');


      // 하나라도 통신 실패하면
      // 기존 데이터를 기본값으로 덮어쓰지 않는다.

      const anyFailed = [
        td,
        ld,
        dd,
        ed,
        cd,
        tgs,
        dr,
        air
      ].some(r => !r.ok);


      if (anyFailed) {

        console.error(
          '불러오기 실패 감지 → 저장 차단'
        );

        setLoadError(true);

        return;
      }


      // 정상적으로 불러온 데이터만 적용

      if (td.value)
        setTodoData(td.value);

      if (ld.value)
        setLedgerData(ld.value);

      if (dd.value)
        setDiaryData(dd.value);

      if (ed.value)
        setEssItems(ed.value);

      if (cd.value)
        setCats(cd.value);

      if (tgs.value)
        setGTags(tgs.value);

      if (dr.value)
        setDiscReasons(dr.value);

      // AI 결과
      if (air.value)
        setAiReviews(air.value);


      // 모든 데이터 로딩 완료
      setReady(true);
    };


    load();

  }, []);


  // ───────────────────────────────────────────────────────────
  // 일반 데이터 저장
  // ───────────────────────────────────────────────────────────

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


  // ───────────────────────────────────────────────────────────
  // Diary 전용 저장
  //
  // ★ 전체 diary를 덮어쓰지 않는다.
  // ★ 해당 날짜 하나만 업데이트한다.
  // ───────────────────────────────────────────────────────────

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

      const diaryRef =
        doc(db, 'diary', USER_ID);


      await updateDoc(
        diaryRef,
        {
          [`value.${dateKey}`]: entry
        }
      );


      // Firebase 저장 성공 후
      // 화면 데이터 갱신

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


  // ───────────────────────────────────────────────────────────
  // ✦ AI 오늘 마무리 저장
  //
  // AI가 한 번 만들어준 결과를 Firebase에 보관한다.
  //
  // 그래서:
  //
  // 새로고침
  // 앱 재접속
  // 다른 날짜 이동
  //
  // 을 해도 결과가 남아있다.
  // ───────────────────────────────────────────────────────────

  const saveAiReview = async (
    dateKey,
    review
  ) => {

    if (!ready) {
      throw new Error(
        '아직 Firebase 데이터를 불러오는 중입니다.'
      );
    }


    if (!dateKey) {
      throw new Error(
        'AI 분석 날짜가 없습니다.'
      );
    }


    if (!review) {
      throw new Error(
        'AI 분석 결과가 없습니다.'
      );
    }


    try {

      const aiRef =
        doc(db, 'aiReviews', USER_ID);


      const savedReview = {
        review,
        updatedAt: new Date().toISOString()
      };


      // 해당 날짜의 AI 결과만 저장
      await updateDoc(
        aiRef,
        {
          [`value.${dateKey}`]: savedReview
        }
      );


      // Firebase 성공 후 화면 반영

      setAiReviews(prev => ({
        ...prev,
        [dateKey]: savedReview
      }));


      console.log(
        `✦ AI 오늘 마무리 저장 완료: ${dateKey}`
      );


      return savedReview;

    } catch (error) {

      console.error(
        `❌ AI 분석 저장 실패: ${dateKey}`,
        error
      );

      throw error;
    }
  };


  // ───────────────────────────────────────────────────────────
  // 일반 데이터 자동 저장
  // ───────────────────────────────────────────────────────────

  useEffect(() => {

    if (ready)
      save('todo', todoData);

  }, [todoData, ready]);


  useEffect(() => {

    if (ready)
      save('ledger', ledgerData);

  }, [ledgerData, ready]);


  // Diary 전체 자동 저장은 하지 않는다.
  //
  // DiaryTab → saveDiaryEntry()
  // 날짜 하나만 저장한다.


  useEffect(() => {

    if (ready)
      save('ess', essItems);

  }, [essItems, ready]);


  useEffect(() => {

    if (ready)
      save('cats', cats);

  }, [cats, ready]);


  useEffect(() => {

    if (ready)
      save(
        'discReasons',
        discReasons
      );

  }, [discReasons, ready]);


  // ───────────────────────────────────────────────────────────
  // 메뉴에서 탭 이동
  // ───────────────────────────────────────────────────────────

  const goToTab = (id) => {

    if (id === 'diary' && tab !== 'diary') {
      setDiaryUnlocked(false);
    }

    setTab(id);
    setMenuOpen(false);
  };


  // ───────────────────────────────────────────────────────────
  // Load Error
  // ───────────────────────────────────────────────────────────

  if (loadError) {

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg)',
          padding: 24,
          textAlign: 'center'
        }}
      >

        <div
          style={{
            fontSize: 48,
            marginBottom: 16
          }}
        >
          ⚠️
        </div>


        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent)'
          }}
        >
          데이터를 불러오지 못했어요
        </div>


        <div
          style={{
            fontSize: 13,
            color: 'var(--sub)',
            marginTop: 8,
            lineHeight: 1.6
          }}
        >
          기록을 보호하기 위해 저장을 멈췄어요.
          <br />
          인터넷 연결을 확인하고 잠시 후
          새로고침 해주세요.
        </div>


        <button
          onClick={() =>
            window.location.reload()
          }
          style={{
            marginTop: 20,
            padding: '10px 24px',
            border: 'none',
            borderRadius: 10,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          다시 시도
        </button>

      </div>
    );
  }


  // ───────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────

  if (!ready) {

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg)'
        }}
      >

        <div
          style={{
            fontSize: 48,
            marginBottom: 16
          }}
        >
          🍉💜
        </div>


        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent)'
          }}
        >
          JARVIS Purple
        </div>


        <div
          style={{
            fontSize: 13,
            color: 'var(--sub)',
            marginTop: 8
          }}
        >
          기록을 준비하고 있어요...
        </div>

      </div>
    );
  }


  // ───────────────────────────────────────────────────────────
  // Main
  // ───────────────────────────────────────────────────────────

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

        position: 'relative',

        // 살짝 부드러운 그림자
        boxShadow:
          '0 0 50px rgba(110,88,150,0.08)'
      }}
    >


      {/* ───────────────────────────────────────────────
          Top bar
      ─────────────────────────────────────────────── */}

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,

          background:
            'color-mix(in srgb, var(--card) 94%, transparent)',

          backdropFilter: 'blur(12px)',

          borderBottom:
            '1px solid var(--border)',

          display: 'flex',
          alignItems: 'center',

          height: 57,

          padding: '0 14px'
        }}
      >

        {/* 삼선 메뉴 */}

        <button
          onClick={() =>
            setMenuOpen(true)
          }
          aria-label="메뉴"
          style={{
            width: 38,
            height: 38,

            border: 'none',
            borderRadius: 12,

            background:
              'var(--accent-bg)',

            color:
              'var(--accent)',

            fontSize: 21,

            cursor: 'pointer',

            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            flexShrink: 0
          }}
        >
          ☰
        </button>


        {/* Logo */}

        <div
          style={{
            flex: 1,
            textAlign: 'center',

            fontWeight: 800,
            fontSize: 17,

            color:
              'var(--accent)',

            letterSpacing: -0.5
          }}
        >
          🍉💜 JARVIS
        </div>


        {/* 현재 날짜 */}

        <div
          style={{
            width: 38,
            textAlign: 'center',

            fontSize: 10,
            color: 'var(--sub)',

            lineHeight: 1.3
          }}
        >
          {new Date().toLocaleDateString(
            'ko-KR',
            {
              month: 'numeric',
              day: 'numeric'
            }
          )}
        </div>

      </div>


      {/* ───────────────────────────────────────────────
          Side Menu
      ─────────────────────────────────────────────── */}

      {menuOpen && (

        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,

            background:
              'rgba(35,28,45,0.28)',

            backdropFilter:
              'blur(2px)'
          }}
          onClick={() =>
            setMenuOpen(false)
          }
        >

          <div
            onClick={e =>
              e.stopPropagation()
            }
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,

              width: 'min(82vw, 340px)',

              background:
                'var(--card)',

              boxShadow:
                '12px 0 40px rgba(60,45,80,0.15)',

              padding:
                '26px 18px',

              overflowY: 'auto'
            }}
          >

            {/* 메뉴 헤더 */}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',

                marginBottom: 30
              }}
            >

              <div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color:
                      'var(--accent)'
                  }}
                >
                  🍉💜 JARVIS
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--sub)',
                    marginTop: 4
                  }}
                >
                  나의 작은 생활 기록장
                </div>

              </div>


              <button
                onClick={() =>
                  setMenuOpen(false)
                }
                style={{
                  border: 'none',
                  background: 'var(--accent-bg)',
                  color: 'var(--sub)',

                  width: 34,
                  height: 34,

                  borderRadius: 10,

                  fontSize: 20,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>

            </div>


            {/* 메뉴 */}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >

              {TABS.map(t => {

                const active =
                  tab === t.id;

                return (

                  <button
                    key={t.id}
                    onClick={() =>
                      goToTab(t.id)
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',

                      width: '100%',

                      padding:
                        '13px 14px',

                      border: 'none',
                      borderRadius: 13,

                      background:
                        active
                          ? 'var(--accent-bg)'
                          : 'transparent',

                      color:
                        active
                          ? 'var(--accent)'
                          : 'var(--text)',

                      fontSize: 14,
                      fontWeight:
                        active
                          ? 700
                          : 500,

                      cursor: 'pointer',

                      textAlign: 'left'
                    }}
                  >

                    <span
                      style={{
                        width: 32,
                        fontSize: 19
                      }}
                    >
                      {t.icon}
                    </span>

                    {t.label}

                  </button>

                );
              })}

            </div>


            {/* AI 영역은 나중에 여기와 연결 */}

            <div
              style={{
                marginTop: 30,
                paddingTop: 20,

                borderTop:
                  '1px solid var(--border)'
              }}
            >

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--sub)',
                  marginBottom: 10
                }}
              >
                TODAY
              </div>

              <button
                onClick={() =>
                  goToTab('diary')
                }
                style={{
                  width: '100%',

                  padding: 14,

                  borderRadius: 14,

                  border:
                    '1px solid var(--border)',

                  background:
                    'var(--bg)',

                  color:
                    'var(--text)',

                  textAlign: 'left',

                  cursor: 'pointer'
                }}
              >

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  ✦ 오늘의 기록
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--sub)',
                    marginTop: 4,
                    lineHeight: 1.5
                  }}
                >
                  오늘 하루를 기록하고
                  <br />
                  마무리해보세요.
                </div>

              </button>

            </div>

          </div>

        </div>

      )}


      {/* ───────────────────────────────────────────────
          Content
      ─────────────────────────────────────────────── */}

      <div
        style={{
          paddingBottom: 78
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
            setDiscReasons={setDiscReasons}

            // ✦ AI 분석 결과
            aiReviews={aiReviews}
            saveAiReview={saveAiReview}
          />

        )}


        {tab === 'diary' && (

          <DiaryTab
            data={diaryData}
            setData={setDiaryData}

            saveDiaryEntry={
              saveDiaryEntry
            }

            // ✦ AI 분석 결과
            aiReviews={aiReviews}
            saveAiReview={saveAiReview}

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

            discReasons={discReasons}
            setDiscReasons={
              setDiscReasons
            }
          />

        )}

      </div>


      {/* ───────────────────────────────────────────────
          Bottom Navigation
          ★ 그대로 유지
      ─────────────────────────────────────────────── */}

      <div
        style={{
          position: 'fixed',

          bottom: 0,
          left: '50%',

          transform:
            'translateX(-50%)',

          width: '100%',
          maxWidth: 480,

          background:
            'color-mix(in srgb, var(--card) 96%, transparent)',

          backdropFilter:
            'blur(12px)',

          borderTop:
            '1px solid var(--border)',

          display: 'flex',

          zIndex: 100,

          boxShadow:
            '0 -4px 24px rgba(70,55,90,0.07)',

          paddingBottom:
            'env(safe-area-inset-bottom)'
        }}
      >

        {TABS.map(t => (

          <button
            key={t.id}
            onClick={() =>
              goToTab(t.id)
            }
            style={{
              flex: 1,

              padding:
                '8px 0 10px',

              border: 'none',
              background: 'none',

              cursor: 'pointer',

              color:
                tab === t.id
                  ? 'var(--accent)'
                  : 'var(--sub)',

              fontWeight:
                tab === t.id
                  ? 700
                  : 400,

              transition:
                'color 0.2s'
            }}
          >

            <div
              style={{
                fontSize: 20,
                marginBottom: 2
              }}
            >
              {t.icon}
            </div>

            <div
              style={{
                fontSize: 10,
                letterSpacing: 0.3
              }}
            >
              {t.label}
            </div>

          </button>

        ))}

      </div>

    </div>
  );
}

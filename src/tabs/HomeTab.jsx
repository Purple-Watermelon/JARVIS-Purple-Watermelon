import { useMemo } from 'react';
import { toDay } from '../utils/helpers';

export default function HomeTab({
  todoData,
  ledgerData,
  diaryData,
  onNavigate
}) {
  const today = new Date();

  const dateKey =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dateLabel = today.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  /* ─────────────────────────────────────
     오늘의 지출
  ───────────────────────────────────── */

  const todayExpense = useMemo(() => {
    if (!Array.isArray(ledgerData)) return 0;

    return ledgerData
      .filter(item => {
        if (!item || item.isSaving) return false;
        return toDay(item.datetime) === dateKey;
      })
      .reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
      }, 0);
  }, [ledgerData, dateKey]);


  /* ─────────────────────────────────────
     오늘의 할 일
     
     TodoTab과 같은 완료 데이터 사용
     - daily → completed[dateKey][id]
     - work → doneDate === dateKey
  ───────────────────────────────────── */

  const todoCount = useMemo(() => {
    const data = todoData || {};
    const completedMap = data.completed?.[dateKey] || {};

    let total = 0;
    let completed = 0;

    /* 오늘의 일상 */
    let dailyItems = [];

    if (data.daily) {
      if (Array.isArray(data.daily)) {
        dailyItems = data.daily;
      } else if (typeof data.daily === 'object') {
        dailyItems =
          data.daily[dateKey] ||
          data.daily[dateKey.replaceAll('-', '.')] ||
          data.daily[dateKey.replaceAll('-', '/')] ||
          [];
      }
    }

    if (Array.isArray(dailyItems)) {
      dailyItems.forEach(item => {
        if (!item) return;

        total += 1;

        if (completedMap[item.id]) {
          completed += 1;
        }
      });
    }


    /* 오늘의 회사업무 */
    let workItems = [];

    if (data.work && typeof data.work === 'object') {
      const allWork = Object.values(data.work).flat();

      workItems = allWork.filter(item => {
        if (!item) return false;

        if (item.startDate > dateKey) {
          return false;
        }

        if (item.removed?.[dateKey]) {
          return false;
        }

        /*
         * 완료한 날 이후에는 목록에서 제외.
         * 단, 완료한 바로 그 날은 오늘의 완료 항목으로 포함.
         */
        if (item.doneDate && item.doneDate < dateKey) {
          return false;
        }

        return true;
      });
    }

    workItems.forEach(item => {
      total += 1;

      if (item.doneDate === dateKey) {
        completed += 1;
      }
    });


    return {
      total,
      completed,
      remaining: Math.max(0, total - completed)
    };
  }, [todoData, dateKey]);


  /* ─────────────────────────────────────
     오늘의 루틴
     
     루틴은 오늘의 할 일과 별도로 표시
  ───────────────────────────────────── */

  const routineCount = useMemo(() => {
    const data = todoData || {};
    const routines = Array.isArray(data.routines)
      ? data.routines
      : [];

    const completedMap = data.completed?.[dateKey] || {};

    const activeRoutines = routines.filter(item => {
      if (!item) return false;

      if (item.addedDate && item.addedDate > dateKey) {
        return false;
      }

      if (item.removed?.[dateKey]) {
        return false;
      }

      return true;
    });

    const completed = activeRoutines.filter(
      item => completedMap[item.id]
    ).length;

    return {
      total: activeRoutines.length,
      completed,
      remaining: Math.max(
        0,
        activeRoutines.length - completed
      )
    };
  }, [todoData, dateKey]);


  /* ─────────────────────────────────────
     오늘의 일기
  ───────────────────────────────────── */

  const diaryStatus = useMemo(() => {
    const entry = diaryData?.[dateKey];

    if (!entry) {
      return {
        exists: false,
        text: '아직 오늘의 기록이 없어요.'
      };
    }

    const blocks = Array.isArray(entry.blocks)
      ? entry.blocks
      : [];

    const hasText = blocks.some(
      block =>
        block?.type === 'text' &&
        String(block.content || '').trim()
    );

    const hasImage = blocks.some(
      block =>
        block?.type === 'image' &&
        block.src
    );

    const hasTitle =
      String(entry.title || '').trim();

    const hasEmotion =
      String(entry.emotion || '').trim();

    const exists =
      hasText ||
      hasImage ||
      hasTitle ||
      hasEmotion;

    return {
      exists,
      text: exists
        ? '오늘의 기록이 있어요.'
        : '아직 오늘의 기록이 없어요.'
    };
  }, [diaryData, dateKey]);


  const money = value =>
    `${Number(value || 0).toLocaleString('ko-KR')}원`;


  /* ─────────────────────────────────────
     카드 스타일
  ───────────────────────────────────── */

  const card = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '19px 18px',
    boxShadow: '0 5px 20px rgba(70,55,90,0.045)'
  };


  const go = tab => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };


  return (
    <div
      style={{
        padding: '8px 2px 30px',
        fontFamily:
          "'Noto Sans KR','Apple SD Gothic Neo',sans-serif"
      }}
    >

      {/* 인사 */}

      <section
        style={{
          padding: '18px 8px 22px'
        }}
      >
        <div
          style={{
            fontFamily:
              "'Noto Serif KR','Batang',serif",
            fontSize: 27,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: -0.8
          }}
        >
          오늘도 잘 지내고 있나요?
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--sub)',
            letterSpacing: 0.2
          }}
        >
          {dateLabel}
        </div>
      </section>


      {/* 오늘의 할 일 */}

      <button
        onClick={() => go('todo')}
        style={{
          ...card,
          width: '100%',
          textAlign: 'left',
          marginBottom: 12,
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                marginBottom: 7
              }}
            >
              오늘의 할 일
            </div>

            <div
              style={{
                fontFamily:
                  "'Noto Serif KR','Batang',serif",
                fontSize: 23,
                fontWeight: 700
              }}
            >
              {todoCount.remaining}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  marginLeft: 4
                }}
              >
                건 남음
              </span>
            </div>
          </div>

          <div
            style={{
              width: 43,
              height: 43,
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: 19
            }}
          >
            ✓
          </div>
        </div>


        <div
          style={{
            marginTop: 13,
            height: 5,
            background: 'var(--bg)',
            borderRadius: 10,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width:
                todoCount.total > 0
                  ? `${Math.min(
                      100,
                      (todoCount.completed /
                        todoCount.total) *
                        100
                    )}%`
                  : '0%',
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 10,
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 10,
            color: 'var(--sub)'
          }}
        >
          {todoCount.completed}건 완료 · {todoCount.total}건 중
        </div>
      </button>


      {/* 오늘의 루틴 */}

      <button
        onClick={() => go('todo')}
        style={{
          ...card,
          width: '100%',
          textAlign: 'left',
          marginBottom: 12,
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                marginBottom: 7
              }}
            >
              오늘의 루틴
            </div>

            <div
              style={{
                fontFamily:
                  "'Noto Serif KR','Batang',serif",
                fontSize: 23,
                fontWeight: 700
              }}
            >
              {routineCount.remaining}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  marginLeft: 4
                }}
              >
                건 남음
              </span>
            </div>
          </div>

          <div
            style={{
              width: 43,
              height: 43,
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: 19
            }}
          >
            ↻
          </div>
        </div>


        <div
          style={{
            marginTop: 13,
            height: 5,
            background: 'var(--bg)',
            borderRadius: 10,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width:
                routineCount.total > 0
                  ? `${Math.min(
                      100,
                      (routineCount.completed /
                        routineCount.total) *
                        100
                    )}%`
                  : '0%',
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 10,
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 10,
            color: 'var(--sub)'
          }}
        >
          {routineCount.completed}건 완료 · {routineCount.total}건 중
        </div>
      </button>


      {/* 오늘의 지출 */}

      <button
        onClick={() => go('ledger')}
        style={{
          ...card,
          width: '100%',
          textAlign: 'left',
          marginBottom: 12,
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                marginBottom: 7
              }}
            >
              오늘의 지출
            </div>

            <div
              style={{
                fontFamily:
                  "'Noto Serif KR','Batang',serif",
                fontSize: 23,
                fontWeight: 700
              }}
            >
              {money(todayExpense)}
            </div>
          </div>

          <div
            style={{
              width: 43,
              height: 43,
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: 18
            }}
          >
            ₩
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 10,
            color: 'var(--sub)'
          }}
        >
          오늘 기록된 지출
        </div>
      </button>


      {/* 오늘의 기록 */}

      <section
        style={{
          ...card,
          marginBottom: 12
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--sub)',
            marginBottom: 10
          }}
        >
          오늘의 기록
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: diaryStatus.exists
                ? 'var(--accent-bg)'
                : 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}
          >
            {diaryStatus.exists ? '✎' : '○'}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700
              }}
            >
              {diaryStatus.exists
                ? '오늘의 일기 작성 완료'
                : '일기 미완료'}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: 'var(--sub)'
              }}
            >
              {diaryStatus.text}
            </div>
          </div>
        </div>

        <button
          onClick={() => go('diary')}
          style={{
            width: '100%',
            marginTop: 15,
            padding: '11px 12px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          일기장 열기
        </button>
      </section>


      {/* 오늘 마무리 */}

      <button
        onClick={() => go('diary')}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 20,
          padding: '20px 18px',
          background: 'var(--accent-bg)',
          color: 'var(--text)',
          textAlign: 'left',
          cursor: 'pointer',
          marginBottom: 18
        }}
      >
        <div
          style={{
            fontFamily:
              "'Noto Serif KR','Batang',serif",
            fontSize: 17,
            fontWeight: 700
          }}
        >
          오늘 하루, 마무리할까요?
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 11,
            color: 'var(--sub)',
            lineHeight: 1.7
          }}
        >
          오늘의 기록을 돌아보고
          <br />
          하루를 천천히 정리해보세요.
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--accent)'
          }}
        >
          오늘 마무리하러 가기 →
        </div>
      </button>


      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--sub)',
          letterSpacing: 0.5,
          paddingBottom: 10
        }}
      >
        JARVIS · purple watermelon
      </div>

    </div>
  );
}

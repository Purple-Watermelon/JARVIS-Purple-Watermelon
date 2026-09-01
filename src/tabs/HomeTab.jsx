import { useMemo } from 'react';

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

  // ─────────────────────────────────────────
  // 오늘의 지출
  // ─────────────────────────────────────────

  const todayExpense = useMemo(() => {
    if (!Array.isArray(ledgerData)) return 0;

    return ledgerData
      .filter(item => {
        const itemDate =
          item.date ||
          item.day ||
          item.dateKey ||
          '';

        return String(itemDate).slice(0, 10) === dateKey;
      })
      .reduce((sum, item) => {
        const amount =
          Number(item.amount) ||
          Number(item.originalAmount) ||
          0;

        return sum + amount;
      }, 0);
  }, [ledgerData, dateKey]);

  // ─────────────────────────────────────────
  // 오늘의 할 일
  // 데이터 구조가 달라도 최대한 안전하게 계산
  // ─────────────────────────────────────────

  const todoCount = useMemo(() => {
    const data = todoData || {};
    let total = 0;
    let completed = 0;

    const addItems = items => {
      if (!Array.isArray(items)) return;

      items.forEach(item => {
        if (!item) return;

        total += 1;

        if (
          item.completed === true ||
          item.done === true ||
          item.checked === true
        ) {
          completed += 1;
        }
      });
    };

    // 오늘 날짜의 daily
    if (data.daily) {
      if (Array.isArray(data.daily)) {
        addItems(data.daily);
      } else if (typeof data.daily === 'object') {
        const todayItems =
          data.daily[dateKey] ||
          data.daily[dateKey.replaceAll('-', '.')] ||
          data.daily[dateKey.replaceAll('-', '/')] ||
          [];

        addItems(todayItems);
      }
    }

    // 오늘의 work
    if (data.work && typeof data.work === 'object') {
      const todayWork =
        data.work[dateKey] ||
        data.work[dateKey.replaceAll('-', '.')] ||
        data.work[dateKey.replaceAll('-', '/')] ||
        [];

      addItems(todayWork);
    }

    return {
      total,
      completed,
      remaining: Math.max(0, total - completed)
    };
  }, [todoData, dateKey]);

  // ─────────────────────────────────────────
  // 오늘의 일기
  // ─────────────────────────────────────────

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
        block.type === 'text' &&
        String(block.content || '').trim()
    );

    const hasImage = blocks.some(
      block =>
        block.type === 'image' &&
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

  // ─────────────────────────────────────────
  // 카드 공통 스타일
  // ─────────────────────────────────────────

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

      {/* ─────────────────────────────────────
          인사
      ───────────────────────────────────── */}

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


      {/* ─────────────────────────────────────
          오늘의 할 일
      ───────────────────────────────────── */}

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
              borderRadius: 10
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
          {todoCount.completed}건 완료
        </div>
      </button>


      {/* ─────────────────────────────────────
          오늘의 지출
      ───────────────────────────────────── */}

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


      {/* ─────────────────────────────────────
          오늘의 기록
      ───────────────────────────────────── */}

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


      {/* ─────────────────────────────────────
          오늘 마무리
      ───────────────────────────────────── */}

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


      {/* 작은 바로가기 */}

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

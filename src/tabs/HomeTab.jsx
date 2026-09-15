import { useMemo } from 'react';
import { toKey } from '../utils/helpers';
import { Card } from '../components/UI';

/* =========================================================
   공통 스타일
========================================================= */

const sectionTitle = {
  fontSize: 12,
  fontWeight: 800,
  color: 'var(--sub)',
  marginBottom: 8,
  letterSpacing: '-0.2px'
};

const cardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  boxShadow: '0 2px 10px rgba(124,92,191,0.06)'
};

const miniBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 7px',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--sub)',
  fontSize: 10,
  fontWeight: 700
};

/* =========================================================
   날짜
========================================================= */

const getTodayKey = () => {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
};

const formatDate = () => {
  const d = new Date();

  const days = [
    '일',
    '월',
    '화',
    '수',
    '목',
    '금',
    '토'
  ];

  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
    dow: days[d.getDay()]
  };
};

/* =========================================================
   HomeTab
========================================================= */

export default function HomeTab({
  data,
  setData,
  onNavigate
}) {
  const todayKey = getTodayKey();
  const { month, day, dow } = formatDate();

  const routines = data?.routines || [];
  const work = data?.work || {};
  const daily = data?.daily || {};
  const completed = data?.completed || {};
  const ledger = data?.ledger || {};
  const diary = data?.diary || {};

  /* =======================================================
     오늘 루틴
  ======================================================= */

  const todayRoutines = useMemo(() => {
    return routines
      .filter(r => {
        if (!r) return false;

        if (
          r.addedDate &&
          r.addedDate > todayKey
        ) {
          return false;
        }

        if (
          r.removed &&
          r.removed[todayKey]
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          (a.order ?? 9999) -
          (b.order ?? 9999)
      );
  }, [routines, todayKey]);

  /* =======================================================
     오늘 회사업무

     TodoTab과 동일하게
     startDate 이후 미완료 업무는 계속 노출.
  ======================================================= */

  const todayWork = useMemo(() => {
    return Object.values(work)
      .flat()
      .filter(t => {
        if (!t || !t.startDate) {
          return false;
        }

        if (t.startDate > todayKey) {
          return false;
        }

        if (
          t.removed &&
          t.removed[todayKey]
        ) {
          return false;
        }

        if (
          t.doneDate &&
          t.doneDate < todayKey
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priority = {
          높음: 0,
          중간: 1,
          낮음: 2
        };

        const pa =
          priority[a.priority] ?? 1;

        const pb =
          priority[b.priority] ?? 1;

        if (pa !== pb) {
          return pa - pb;
        }

        return (
          (a.order ?? 9999) -
          (b.order ?? 9999)
        );
      });
  }, [work, todayKey]);

  /* =======================================================
     오늘 일상 + 이월
  ======================================================= */

  const todayDaily = useMemo(() => {
    const result = [];

    Object.keys(daily).forEach(dateKey => {
      if (dateKey > todayKey) {
        return;
      }

      const items = Array.isArray(
        daily[dateKey]
      )
        ? daily[dateKey]
        : [];

      items.forEach(item => {
        if (!item) return;

        /*
         * 오늘 작성
         */
        if (dateKey === todayKey) {
          result.push({
            ...item,
            _originalDate: dateKey
          });

          return;
        }

        /*
         * 과거 미완료 → 이월
         */
        const done =
          completed[todayKey]?.[item.id] ||
          item.completed === true ||
          item.done === true ||
          item.checked === true;

        if (!done) {
          result.push({
            ...item,
            _originalDate: dateKey,
            _carried: true
          });
        }
      });
    });

    const unique = [];

    result.forEach(item => {
      if (
        !unique.some(
          x => x.id === item.id
        )
      ) {
        unique.push(item);
      }
    });

    return unique.sort(
      (a, b) =>
        (a.order ?? 9999) -
        (b.order ?? 9999)
    );
  }, [
    daily,
    completed,
    todayKey
  ]);

  /* =======================================================
     완료 여부
  ======================================================= */

  const isCompleted = id => {
    return !!(
      completed[todayKey] &&
      completed[todayKey][id]
    );
  };

  /* =======================================================
     전체 할 일
  ======================================================= */

  const totalTasks =
    todayRoutines.length +
    todayWork.length +
    todayDaily.length;

  const doneTasks =
    todayRoutines.filter(r =>
      isCompleted(r.id)
    ).length +
    todayWork.filter(t =>
      !!t.doneDate
    ).length +
    todayDaily.filter(t =>
      isCompleted(t.id) ||
      t.completed === true
    ).length;

  const progress =
    totalTasks > 0
      ? Math.round(
          (doneTasks /
            totalTasks) *
            100
        )
      : 0;

  /* =======================================================
     오늘 지출
     
     ledger 구조가 프로젝트에서 달라도
     최대한 여러 형태를 대응.
  ======================================================= */

  const todayExpenses = useMemo(() => {
    let items = [];

    if (Array.isArray(ledger)) {
      items = ledger;
    } else if (
      Array.isArray(ledger.items)
    ) {
      items = ledger.items;
    } else if (
      ledger &&
      typeof ledger === 'object'
    ) {
      Object.keys(ledger).forEach(k => {
        if (Array.isArray(ledger[k])) {
          items.push(
            ...ledger[k]
          );
        }
      });
    }

    return items.filter(item => {
      if (!item) return false;

      const date =
        item.date ||
        item.createdDate ||
        item.day;

      return date === todayKey;
    });
  }, [ledger, todayKey]);

  const todayExpenseAmount =
    todayExpenses.reduce(
      (sum, item) => {
        const amount = Number(
          item.amount ||
          item.price ||
          item.cost ||
          0
        );

        return sum + amount;
      },
      0
    );

  /* =======================================================
     오늘 일기
  ======================================================= */

  const todayDiary = useMemo(() => {
    if (!diary) return null;

    if (typeof diary === 'string') {
      return diary.trim()
        ? diary
        : null;
    }

    if (Array.isArray(diary)) {
      return (
        diary.find(
          d =>
            d?.date === todayKey
        ) || null
      );
    }

    if (diary[todayKey]) {
      return diary[todayKey];
    }

    if (
      diary.entries &&
      Array.isArray(diary.entries)
    ) {
      return (
        diary.entries.find(
          d =>
            d?.date === todayKey
        ) || null
      );
    }

    return null;
  }, [diary, todayKey]);

  const hasDiary =
    !!todayDiary;

  /* =======================================================
     오늘 마무리 상태
  ======================================================= */

  const dayFinished =
    data?.dayFinished?.[todayKey] ||
    data?.dailyFinished?.[todayKey] ||
    false;

  /* =======================================================
     할 일 완료 토글
     
     Home에서 바로 체크해도
     TodoTab과 동일한 completed 구조를 사용.
  ======================================================= */

  const toggleTask = (
    id,
    type
  ) => {
    setData?.(prev => {
      const next = {
        ...prev,
        completed: {
          ...(prev.completed || {})
        }
      };

      const todayCompleted = {
        ...(next.completed[todayKey] ||
          {})
      };

      const currentlyDone =
        !!todayCompleted[id];

      if (currentlyDone) {
        delete todayCompleted[id];
      } else {
        todayCompleted[id] = true;
      }

      next.completed[todayKey] =
        todayCompleted;

      /* 루틴 */
      if (type === 'routine') {
        next.routines = (
          prev.routines || []
        ).map(r =>
          r.id === id
            ? {
                ...r,
                completed:
                  !currentlyDone
              }
            : r
        );
      }

      /* 일상 */
      if (type === 'daily') {
        const d = {
          ...(prev.daily || {})
        };

        Object.keys(d).forEach(
          dateKey => {
            d[dateKey] = (
              d[dateKey] || []
            ).map(item =>
              item.id === id
                ? {
                    ...item,
                    completed:
                      !currentlyDone,
                    completedDate:
                      !currentlyDone
                        ? todayKey
                        : null
                  }
                : item
            );
          }
        );

        next.daily = d;
      }

      /* 회사업무 */
      if (type === 'work') {
        const w = {
          ...(prev.work || {})
        };

        Object.keys(w).forEach(
          dateKey => {
            w[dateKey] = (
              w[dateKey] || []
            ).map(item =>
              item.id === id
                ? {
                    ...item,
                    completed:
                      !currentlyDone,
                    doneDate:
                      !currentlyDone
                        ? todayKey
                        : null,
                    completedDate:
                      !currentlyDone
                        ? todayKey
                        : null
                  }
                : item
            );
          }
        );

        next.work = w;
      }

      return next;
    });
  };

  /* =======================================================
     오늘 마무리
  ======================================================= */

  const finishToday = () => {
    setData?.(prev => ({
      ...prev,
      dayFinished: {
        ...(prev.dayFinished || {}),
        [todayKey]: !dayFinished
      }
    }));
  };

  /* =======================================================
     네비게이션
  ======================================================= */

  const go = tab => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  /* =======================================================
     최근 할 일 미리보기
  ======================================================= */

  const previewTasks = [
    ...todayWork.map(t => ({
      ...t,
      _type: 'work'
    })),
    ...todayDaily.map(t => ({
      ...t,
      _type: 'daily'
    })),
    ...todayRoutines.map(t => ({
      ...t,
      _type: 'routine'
    }))
  ].slice(0, 5);

  /* =======================================================
     화면
  ======================================================= */

  return (
    <div
      style={{
        padding: 16,
        paddingBottom: 90
      }}
    >
      {/* =================================================
          날짜 헤더
      ================================================= */}

      <div
        style={{
          marginBottom: 20
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--accent)',
            fontWeight: 700,
            marginBottom: 3
          }}
        >
          TODAY
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 5
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 850,
              color: 'var(--text)',
              letterSpacing: '-1.2px'
            }}
          >
            {month}월 {day}일
          </div>

          <div
            style={{
              fontSize: 14,
              color: 'var(--sub)',
              fontWeight: 600
            }}
          >
            {dow}요일
          </div>
        </div>
      </div>

      {/* =================================================
          오늘의 요약
      ================================================= */}

      <div
        style={{
          ...cardStyle,
          padding: 16,
          marginBottom: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800
            }}
          >
            오늘의 할 일
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--accent)'
            }}
          >
            {doneTasks}/{totalTasks}
          </div>
        </div>

        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 9
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 8,
              background:
                'linear-gradient(90deg,var(--accent),var(--accent2))',
              transition: 'width .3s'
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--sub)'
          }}
        >
          <span>
            {progress === 100
              ? '오늘 할 일 완료!'
              : `${progress}% 완료`}
          </span>

          <button
            onClick={() => go('todo')}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 800,
              padding: 0,
              cursor: 'pointer'
            }}
          >
            전체 보기 →
          </button>
        </div>
      </div>

      {/* =================================================
          3개 요약 카드
      ================================================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 20
        }}
      >
        <button
          onClick={() => go('todo')}
          style={{
            ...cardStyle,
            padding: '13px 8px',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              fontSize: 19,
              marginBottom: 5
            }}
          >
            ✓
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--sub)',
              marginBottom: 2
            }}
          >
            남은 할 일
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 850
            }}
          >
            {Math.max(
              0,
              totalTasks - doneTasks
            )}
          </div>
        </button>

        <button
          onClick={() => go('ledger')}
          style={{
            ...cardStyle,
            padding: '13px 8px',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              fontSize: 19,
              marginBottom: 5
            }}
          >
            ₩
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--sub)',
              marginBottom: 2
            }}
          >
            오늘 지출
          </div>

          <div
            style={{
              fontSize: 15,
              fontWeight: 850,
              wordBreak: 'keep-all'
            }}
          >
            {todayExpenseAmount.toLocaleString()}
          </div>
        </button>

        <button
          onClick={() => go('diary')}
          style={{
            ...cardStyle,
            padding: '13px 8px',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              fontSize: 19,
              marginBottom: 5
            }}
          >
            ✎
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--sub)',
              marginBottom: 2
            }}
          >
            오늘 기록
          </div>

          <div
            style={{
              fontSize: 15,
              fontWeight: 850
            }}
          >
            {hasDiary
              ? '작성 완료'
              : '미작성'}
          </div>
        </button>
      </div>

      {/* =================================================
          오늘 할 일
      ================================================= */}

      <div
        style={{
          marginBottom: 20
        }}
      >
        <div style={sectionTitle}>
          TODAY'S TASKS
        </div>

        <div
          style={{
            ...cardStyle,
            overflow: 'hidden'
          }}
        >
          {previewTasks.length === 0 ? (
            <div
              style={{
                padding: '22px 16px',
                textAlign: 'center',
                color: 'var(--sub)',
                fontSize: 12
              }}
            >
              오늘 등록된 할 일이 없어요.
            </div>
          ) : (
            previewTasks.map(
              (task, index) => {
                const done =
                  task._type === 'work'
                    ? !!task.doneDate
                    : isCompleted(
                        task.id
                      ) ||
                      task.completed ===
                        true;

                return (
                  <div
                    key={task.id}
                    onClick={() =>
                      toggleTask(
                        task.id,
                        task._type
                      )
                    }
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 10,
                      padding:
                        '12px 14px',
                      borderBottom:
                        index <
                        previewTasks.length -
                          1
                          ? '1px solid var(--border)'
                          : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <div
                      style={{
                        width: 21,
                        height: 21,
                        flexShrink: 0,
                        borderRadius: 7,
                        border: `2px solid ${
                          done
                            ? 'var(--accent)'
                            : 'var(--border)'
                        }`,
                        background:
                          done
                            ? 'var(--accent)'
                            : 'transparent',
                        display: 'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center'
                      }}
                    >
                      {done && (
                        <span
                          style={{
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 800
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight:
                            done
                              ? 400
                              : 650,
                          color:
                            done
                              ? 'var(--sub)'
                              : 'var(--text)',
                          textDecoration:
                            done
                              ? 'line-through'
                              : 'none',
                          overflow:
                            'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {task.title ||
                          task.name}
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          gap: 5,
                          marginTop: 3
                        }}
                      >
                        <span
                          style={{
                            ...miniBadge,
                            fontSize: 9
                          }}
                        >
                          {task._type ===
                          'work'
                            ? '업무'
                            : task._type ===
                              'routine'
                            ? '루틴'
                            : '일상'}
                        </span>

                        {task._carried && (
                          <span
                            style={{
                              fontSize: 9,
                              color:
                                '#c95b5b',
                              fontWeight: 700
                            }}
                          >
                            이월
                          </span>
                        )}
                      </div>
                    </div>

                    {task.priority && (
                      <span
                        style={{
                          fontSize: 9,
                          color:
                            task.priority ===
                            '높음'
                              ? '#e05252'
                              : task.priority ===
                                '낮음'
                              ? '#52ae7a'
                              : '#e8a838',
                          fontWeight: 800
                        }}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>
                );
              }
            )
          )}

          {totalTasks > 5 && (
            <button
              onClick={() => go('todo')}
              style={{
                width: '100%',
                padding: 11,
                border: 'none',
                borderTop:
                  '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--accent)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {totalTasks - 5}개 더 보기 →
            </button>
          )}
        </div>
      </div>

      {/* =================================================
          오늘 지출
      ================================================= */}

      <div
        style={{
          marginBottom: 20
        }}
      >
        <div style={sectionTitle}>
          TODAY'S SPENDING
        </div>

        <div
          style={{
            ...cardStyle,
            padding: 16,
            cursor: 'pointer'
          }}
          onClick={() => go('ledger')}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--sub)',
                  marginBottom: 4
                }}
              >
                오늘 지출
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 850,
                  letterSpacing: '-0.7px'
                }}
              >
                ₩
                {todayExpenseAmount.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background:
                  'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              ₩
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 10.5,
              color: 'var(--sub)'
            }}
          >
            {todayExpenses.length}건의 지출
            <span
              style={{
                float: 'right',
                color: 'var(--accent)',
                fontWeight: 700
              }}
            >
              가계부 보기 →
            </span>
          </div>
        </div>
      </div>

      {/* =================================================
          오늘의 기록
      ================================================= */}

      <div
        style={{
          marginBottom: 20
        }}
      >
        <div style={sectionTitle}>
          TODAY'S DIARY
        </div>

        <div
          onClick={() => go('diary')}
          style={{
            ...cardStyle,
            padding: 16,
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginBottom:
                hasDiary ? 10 : 0
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800
              }}
            >
              오늘의 기록
            </div>

            <div
              style={{
                fontSize: 11,
                color: hasDiary
                  ? 'var(--accent)'
                  : 'var(--sub)',
                fontWeight: 700
              }}
            >
              {hasDiary
                ? '✓ 작성 완료'
                : '미작성'}
            </div>
          </div>

          {hasDiary && (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.65,
                color: 'var(--sub)',
                display:
                  '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient:
                  'vertical',
                overflow: 'hidden'
              }}
            >
              {typeof todayDiary ===
              'string'
                ? todayDiary
                : todayDiary?.content ||
                  todayDiary?.text ||
                  todayDiary?.body ||
                  '오늘의 기록이 있습니다.'}
            </div>
          )}

          {!hasDiary && (
            <div
              style={{
                marginTop: 8,
                padding: '12px 0 2px',
                color: 'var(--sub)',
                fontSize: 11
              }}
            >
              오늘 하루를 기록해보세요.
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          오늘 마무리
      ================================================= */}

      <div
        style={{
          marginBottom: 20
        }}
      >
        <div style={sectionTitle}>
          END OF DAY
        </div>

        <div
          style={{
            ...cardStyle,
            padding: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background:
                  dayFinished
                    ? 'var(--accent)'
                    : 'var(--accent-bg)',
                color: dayFinished
                  ? '#fff'
                  : 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              {dayFinished
                ? '✓'
                : '🌙'}
            </div>

            <div
              style={{
                flex: 1
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 3
                }}
              >
                {dayFinished
                  ? '오늘 하루 마무리 완료'
                  : '오늘 하루 마무리하기'}
              </div>

              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--sub)',
                  lineHeight: 1.4
                }}
              >
                {dayFinished
                  ? '오늘도 수고했어요.'
                  : '할 일과 기록을 확인하고 하루를 마무리하세요.'}
              </div>
            </div>
          </div>

          <button
            onClick={finishToday}
            style={{
              width: '100%',
              padding: 11,
              borderRadius: 10,
              border: `1px solid ${
                dayFinished
                  ? 'var(--border)'
                  : 'var(--accent)'
              }`,
              background:
                dayFinished
                  ? 'var(--bg)'
                  : 'var(--accent)',
              color: dayFinished
                ? 'var(--sub)'
                : '#fff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {dayFinished
              ? '마무리 완료 취소'
              : '오늘 마무리하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

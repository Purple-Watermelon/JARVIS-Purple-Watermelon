import { useState, useMemo } from 'react';
import { uid, fmtDate, toKey } from '../utils/helpers';
import {
  Modal,
  CalendarOverlay,
  SaveBtn,
  AddRowBtn,
  SectionHeader
} from '../components/UI';

const PC = {
  높음: '#e05252',
  중간: '#e8a838',
  낮음: '#52ae7a'
};

const PORDER = {
  높음: 0,
  중간: 1,
  낮음: 2
};

const lbl = {
  fontSize: 11,
  color: 'var(--sub)',
  display: 'block',
  marginBottom: 5,
  fontWeight: 600
};

const inp = {
  width: '100%',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: 'var(--card)',
  color: 'var(--text)',
  outline: 'none',
  WebkitAppearance: 'none',
  boxSizing: 'border-box'
};

/* =========================================================
   기본 정렬
========================================================= */

const byOrder = (a, b) => {
  const orderDiff =
    (a.order ?? 9999) -
    (b.order ?? 9999);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  const dateA =
    a.addedDate ||
    a.startDate ||
    '';

  const dateB =
    b.addedDate ||
    b.startDate ||
    '';

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  return String(a.id || '').localeCompare(
    String(b.id || '')
  );
};

/* =========================================================
   날짜 차이
========================================================= */

const dayDiff = (from, to) => {
  if (!from || !to) return 0;

  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);

  return Math.round((b - a) / 864e5);
};

/* =========================================================
   완료일 찾기
     
   새 구조:
   completed = {
     "2026-09-15": {
       id: true
     }
   }

   가장 최근 완료일을 찾는다.
========================================================= */

const getCompletionDate = (
  completed,
  id,
  currentDate
) => {
  const dates = Object.keys(
    completed || {}
  )
    .filter(date => {
      if (date > currentDate) {
        return false;
      }

      return !!completed?.[date]?.[id];
    })
    .sort();

  return dates.length
    ? dates[dates.length - 1]
    : null;
};

/* =========================================================
   이월 표시
========================================================= */

const getCarryBadge = (
  addedDate,
  currentDate
) => {
  if (!addedDate || !currentDate) {
    return null;
  }

  const diff = dayDiff(
    addedDate,
    currentDate
  );

  if (diff <= 0) {
    return null;
  }

  return {
    label: `등록 + ${diff}일`,
    color: '#c95b5b'
  };
};

/* =========================================================
   완료 표시
========================================================= */

const getCompletedBadge = (
  addedDate,
  completedDate
) => {
  if (!addedDate || !completedDate) {
    return null;
  }

  const diff = dayDiff(
    addedDate,
    completedDate
  );

  if (diff <= 0) {
    return {
      label: '당일 완료',
      color: 'var(--sub)'
    };
  }

  return {
    label: `등록 + ${diff}일`,
    color: '#c95b5b'
  };
};

/* =========================================================
   액션 바
========================================================= */

function ActionBar({
  onEdit,
  onUp,
  onDown,
  onDel,
  canUp,
  canDown
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--bg)',
        borderTop:
          '1px solid var(--border)'
      }}
    >
      <button
        onClick={e => {
          e.stopPropagation();
          onEdit();
        }}
        style={{
          flex: 1,
          padding: '10px 0',
          fontSize: 12,
          color: 'var(--accent)',
          fontWeight: 700,
          borderRight:
            '1px solid var(--border)',
          background: 'none',
          cursor: 'pointer'
        }}
      >
        ✎ 수정
      </button>

      <button
        onClick={e => {
          e.stopPropagation();
          onUp();
        }}
        disabled={!canUp}
        style={{
          flex: 1,
          padding: '10px 0',
          fontSize: 13,
          color: canUp
            ? 'var(--text)'
            : 'var(--border)',
          fontWeight: 700,
          borderRight:
            '1px solid var(--border)',
          background: 'none',
          cursor: canUp
            ? 'pointer'
            : 'default'
        }}
      >
        ↑
      </button>

      <button
        onClick={e => {
          e.stopPropagation();
          onDown();
        }}
        disabled={!canDown}
        style={{
          flex: 1,
          padding: '10px 0',
          fontSize: 13,
          color: canDown
            ? 'var(--text)'
            : 'var(--border)',
          fontWeight: 700,
          borderRight:
            '1px solid var(--border)',
          background: 'none',
          cursor: canDown
            ? 'pointer'
            : 'default'
        }}
      >
        ↓
      </button>

      <button
        onClick={e => {
          e.stopPropagation();
          onDel();
        }}
        style={{
          flex: 1,
          padding: '10px 0',
          fontSize: 12,
          color: 'var(--red)',
          fontWeight: 700,
          background: 'none',
          cursor: 'pointer'
        }}
      >
        🗑 삭제
      </button>
    </div>
  );
}

/* =========================================================
   위시리스트
========================================================= */

function WishRow({
  w,
  onEdit,
  onDel,
  onBuy,
  onUp,
  onDown,
  canUp,
  canDown
}) {
  const [open, setOpen] =
    useState(false);

  const bought = !!w.boughtDate;

  return (
    <div
      style={{
        borderBottom:
          '1px solid var(--border)'
      }}
    >
      <div
        onClick={() =>
          setOpen(o => !o)
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '13px 16px',
          cursor: 'pointer',
          gap: 12
        }}
      >
        <div
          style={{
            flex: 1
          }}
        >
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: bought
                ? 'var(--sub)'
                : 'var(--text)',
              textDecoration: bought
                ? 'line-through'
                : 'none'
            }}
          >
            {w.name}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 4,
              flexWrap: 'wrap'
            }}
          >
            {w.category && (
              <span
                style={{
                  fontSize: 10,
                  padding:
                    '2px 7px',
                  borderRadius: 10,
                  background:
                    'var(--bg)',
                  color:
                    'var(--sub)'
                }}
              >
                {w.category}
              </span>
            )}

            {w.priority && (
              <span
                style={{
                  fontSize: 10,
                  padding:
                    '2px 7px',
                  borderRadius: 10,
                  background:
                    'var(--accent-bg)',
                  color:
                    'var(--accent)',
                  fontWeight: 700
                }}
              >
                {w.priority}
              </span>
            )}
          </div>

          {w.memo && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--sub)',
                marginTop: 3
              }}
            >
              {w.memo}
            </div>
          )}
        </div>

        <button
          onClick={e => {
            e.stopPropagation();

            if (!bought) {
              onBuy();
            }
          }}
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: 8,
            border: `2px solid ${
              bought
                ? 'var(--accent)'
                : 'var(--border)'
            }`,
            background: bought
              ? 'var(--accent)'
              : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'center'
          }}
        >
          {bought && (
            <span
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              ✓
            </span>
          )}
        </button>
      </div>

      {open && (
        <ActionBar
          onEdit={() => {
            onEdit();
            setOpen(false);
          }}
          onUp={onUp}
          onDown={onDown}
          onDel={onDel}
          canUp={canUp}
          canDown={canDown}
        />
      )}
    </div>
  );
}

/* =========================================================
   TodoTab
========================================================= */

export default function TodoTab({
  data,
  setData,
  essItems,
  setEssItems
}) {
  const today = new Date();

  const [date, setDate] =
    useState(today);

  const [showCal, setShowCal] =
    useState(false);

  const [modal, setModal] =
    useState(null);

  const [editItem, setEditItem] =
    useState(null);

  const [form, setForm] =
    useState({});

  const [openEssId, setOpenEssId] =
    useState(null);

  const {
    y,
    m,
    day,
    dow,
    key
  } = fmtDate(date);

  const isToday =
    key === toKey(today);

  const routines =
    data.routines || [];

  const work =
    data.work || {};

  const daily =
    data.daily || {};

  const wish =
    data.wish || [];

  const completed =
    data.completed || {};

  /* =======================================================
     루틴
  ======================================================= */

  const visRoutines = useMemo(
    () => {
      return routines
        .filter(r => {
          if (!r) return false;

          if (
            r.addedDate &&
            r.addedDate > key
          ) {
            return false;
          }

          if (
            r.removed &&
            r.removed[key]
          ) {
            return false;
          }

          return true;
        })
        .slice()
        .sort(byOrder);
    },
    [routines, key]
  );

  /* =======================================================
     회사업무
     
     startDate 이후 계속 노출
     완료한 당일은 노출
     완료 다음날부터 숨김
  ======================================================= */

  const todayWork = useMemo(
    () => {
      const all =
        Object.values(work)
          .flat();

      return all.filter(t => {
        if (!t) return false;

        if (!t.startDate) {
          return false;
        }

        if (t.startDate > key) {
          return false;
        }

        if (
          t.removed &&
          t.removed[key]
        ) {
          return false;
        }

        const completionDate =
          getCompletionDate(
            completed,
            t.id,
            key
          ) ||
          t.doneDate ||
          t.completedDate ||
          null;

        if (
          completionDate &&
          completionDate < key
        ) {
          return false;
        }

        return true;
      });
    },
    [
      work,
      completed,
      key
    ]
  );

  /* =======================================================
     일상
     
     핵심 규칙:

     1. 등록일 이전에는 안 보임
     2. 미완료면 다음날 계속 이월
     3. 완료한 당일은 완료 상태로 표시
     4. 완료 다음날부터 숨김
     5. completed[key]가 아니라
        "실제 완료된 날짜"를 찾는다.
  ======================================================= */

  const todayDaily = useMemo(
    () => {
      const result = [];

      Object.keys(daily).forEach(
        dateKey => {
          if (dateKey > key) {
            return;
          }

          const items =
            Array.isArray(
              daily[dateKey]
            )
              ? daily[dateKey]
              : [];

          items.forEach(item => {
            if (!item) return;

            const addedDate =
              item.addedDate ||
              dateKey;

            /*
             * 실제 완료일 확인.
             *
             * 새 데이터:
             * completed[날짜][id]
             *
             * 구 데이터:
             * completedDate
             */
            const completionDate =
              getCompletionDate(
                completed,
                item.id,
                key
              ) ||
              item.completedDate ||
              null;

            /*
             * 완료한 다음날부터 숨김
             */
            if (
              completionDate &&
              completionDate < key
            ) {
              return;
            }

            /*
             * 등록일 이전에는
             * 절대 표시하지 않음
             */
            if (
              addedDate > key
            ) {
              return;
            }

            result.push({
              ...item,
              addedDate,
              _originalDate:
                dateKey,
              _completionDate:
                completionDate,
              _carried:
                addedDate < key
            });
          });
        }
      );

      /*
       * 같은 id가 여러 bucket에
       * 중복으로 존재할 수 있음.
       */
      const unique = [];

      result.forEach(item => {
        const existingIndex =
          unique.findIndex(
            x =>
              x.id === item.id
          );

        if (
          existingIndex === -1
        ) {
          unique.push(item);
          return;
        }

        /*
         * 같은 ID가 중복이라면
         * 실제 등록일이 빠른 쪽을 우선.
         */
        const existing =
          unique[
            existingIndex
          ];

        if (
          (
            item.addedDate ||
            ''
          ) <
          (
            existing.addedDate ||
            ''
          )
        ) {
          unique[
            existingIndex
          ] = item;
        }
      });

      return unique.sort(
        byOrder
      );
    },
    [
      daily,
      completed,
      key
    ]
  );

  /* =======================================================
     위시
  ======================================================= */

  const todayWish =
    useMemo(
      () =>
        wish
          .filter(
            w =>
              !w.boughtDate ||
              w.boughtDate === key
          )
          .slice()
          .sort(byOrder),
      [wish, key]
    );

  /* =======================================================
     회사업무 정렬
  ======================================================= */

  const sortedWork =
    useMemo(
      () => {
        return [...todayWork]
          .sort(
            (a, b) => {
              const pa =
                PORDER[
                  a.priority
                ] ?? 1;

              const pb =
                PORDER[
                  b.priority
                ] ?? 1;

              if (
                pa !== pb
              ) {
                return pa - pb;
              }

              return (
                (a.order ??
                  9999) -
                (b.order ??
                  9999)
              );
            }
          );
      },
      [todayWork]
    );

  /* =======================================================
     생필품 알림
  ======================================================= */

  const urgentEss =
    useMemo(
      () =>
        (essItems || [])
          .filter(e => {
            if (
              e.notifyOff
            ) {
              return false;
            }

            const h =
              e.history || [];

            if (
              h.length < 2
            ) {
              return false;
            }

            const sorted =
              [...h].sort(
                (a, b) =>
                  new Date(
                    a.date
                  ) -
                  new Date(
                    b.date
                  )
              );

            const gaps = [];

            for (
              let i = 1;
              i <
                sorted.length;
              i++
            ) {
              gaps.push(
                (
                  new Date(
                    sorted[i]
                      .date
                  ) -
                  new Date(
                    sorted[
                      i - 1
                    ].date
                  )
                ) / 864e5
              );
            }

            if (
              !gaps.length
            ) {
              return false;
            }

            const avg =
              Math.round(
                gaps.reduce(
                  (a, b) =>
                    a + b,
                  0
                ) /
                  gaps.length
              );

            const last =
              new Date(
                sorted[
                  sorted.length -
                    1
                ].date
              );

            last.setDate(
              last.getDate() +
                avg
            );

            const diff =
              Math.ceil(
                (last -
                  new Date()) /
                  864e5
              );

            return diff <= 10;
          }),
      [essItems]
    );

  /* =======================================================
     완료 상태
     
     선택된 날짜의 완료 여부만 확인
  ======================================================= */

  const isDone = id => {
    return !!(
      completed[key] &&
      completed[key][id]
    );
  };

  /* =======================================================
     진행률
     
     현재 화면에 실제 표시된 항목만 계산
     
     중복 ID 때문에 숫자가 꼬이지 않도록
     유형까지 포함해서 구성.
  ======================================================= */

  const progressItems =
    [
      ...visRoutines.map(
        item => ({
          type: 'routine',
          id: item.id
        })
      ),

      ...sortedWork.map(
        item => ({
          type: 'work',
          id: item.id
        })
      ),

      ...todayDaily.map(
        item => ({
          type: 'daily',
          id: item.id
        })
      )
    ];

  const doneCount =
    progressItems.filter(
      item => {
        if (
          item.type ===
          'work'
        ) {
          const workItem =
            sortedWork.find(
              x =>
                x.id ===
                item.id
            );

          if (
            !workItem
          ) {
            return false;
          }

          const completionDate =
            getCompletionDate(
              completed,
              item.id,
              key
            ) ||
            workItem.doneDate ||
            workItem.completedDate ||
            null;

          return (
            completionDate ===
            key
          );
        }

        const dailyItem =
          todayDaily.find(
            x =>
              x.id ===
              item.id
          );

        if (dailyItem) {
          return (
            dailyItem
              ._completionDate ===
              key
          );
        }

        return isDone(
          item.id
        );
      }
    ).length;

  const totalCount =
    progressItems.length;

  const progress =
    totalCount
      ? Math.round(
          (doneCount /
            totalCount) *
            100
        )
      : 0;

  /* =======================================================
     폼
  ======================================================= */

  const F = (
    k,
    v
  ) =>
    setForm(p => ({
      ...p,
      [k]: v
    }));

  const openModal = (
    type,
    item = null
  ) => {
    setModal(type);
    setEditItem(item);

    setForm(
      item
        ? {
            ...item
          }
        : {}
    );
  };

  const closeModal = () => {
    setModal(null);
    setEditItem(null);
    setForm({});
  };

  const nextOrder = list =>
    list.length
      ? Math.max(
          ...list.map(
            x =>
              x.order ?? 0
          )
        ) + 1
      : 0;

  /* =======================================================
     D-Day
  ======================================================= */

  const getDDay = due => {
    if (!due) return null;

    const diff =
      Math.ceil(
        (
          new Date(
            `${due}T00:00:00`
          ) -
          new Date(
            `${key}T00:00:00`
          )
        ) /
          864e5
      );

    if (diff < 0) {
      return {
        color:
          '#c0392b',
        label: `💀 D+${Math.abs(
          diff
        )}`,
        bold: true
      };
    }

    if (diff === 0) {
      return {
        color:
          '#e05252',
        label:
          '🚨 D-DAY',
        bold: true
      };
    }

    if (diff <= 2) {
      return {
        color:
          '#e05252',
        label:
          `D-${diff}`,
        bold: false
      };
    }

    if (diff <= 7) {
      return {
        color:
          '#e8a838',
        label:
          `D-${diff}`,
        bold: false
      };
    }

    return {
      color:
        '#52ae7a',
      label:
        `D-${diff}`,
      bold: false
    };
  };

  /* =======================================================
     저장 - 루틴
  ======================================================= */

  const saveRoutine = () => {
    if (
      !form.title?.trim()
    ) {
      return;
    }

    setData(p => {
      const list =
        p.routines || [];

      if (editItem) {
        return {
          ...p,
          routines:
            list.map(r =>
              r.id ===
              editItem.id
                ? {
                    ...r,
                    ...form,
                    title:
                      form.title.trim()
                  }
                : r
            )
        };
      }

      return {
        ...p,
        routines: [
          ...list,
          {
            id: uid(),
            title:
              form.title.trim(),
            addedDate:
              key,
            order:
              nextOrder(list),
            completed:
              false
          }
        ]
      };
    });

    closeModal();
  };

  /* =======================================================
     저장 - 회사업무
  ======================================================= */

  const saveWork = () => {
    if (
      !form.title?.trim() ||
      !form.startDate
    ) {
      return;
    }

    const due =
      form.due ||
      form.startDate;

    setData(p => {
      const w = {
        ...(p.work || {})
      };

      const item = {
        ...form,
        due,
        title:
          form.title.trim(),
        id:
          editItem?.id ||
          uid(),
        completed:
          editItem?.completed ||
          false
      };

      if (
        editItem?.id
      ) {
        Object.keys(
          w
        ).forEach(
          dk => {
            w[dk] = (
              w[dk] || []
            ).filter(
              t =>
                t.id !==
                editItem.id
            );
          }
        );

        w[
          form.startDate
        ] = [
          ...(
            w[
              form.startDate
            ] || []
          ),
          item
        ];
      } else {
        const bucket =
          w[
            form.startDate
          ] || [];

        w[
          form.startDate
        ] = [
          ...bucket,
          {
            ...item,
            order:
              nextOrder(
                bucket
              )
          }
        ];
      }

      return {
        ...p,
        work: w
      };
    });

    closeModal();
  };

  /* =======================================================
     저장 - 일상
  ======================================================= */

  const saveDaily = () => {
    if (
      !form.title?.trim()
    ) {
      return;
    }

    setData(p => {
      const d = {
        ...(p.daily || {})
      };

      if (
        editItem?.id
      ) {
        Object.keys(
          d
        ).forEach(
          dk => {
            d[dk] = (
              d[dk] || []
            ).map(t =>
              t.id ===
              editItem.id
                ? {
                    ...t,
                    ...form,
                    title:
                      form.title.trim()
                  }
                : t
            );
          }
        );
      } else {
        const bucket =
          d[key] || [];

        d[key] = [
          ...bucket,
          {
            id: uid(),
            ...form,
            title:
              form.title.trim(),
            addedDate:
              key,
            order:
              nextOrder(
                bucket
              ),
            completed:
              false
          }
        ];
      }

      return {
        ...p,
        daily: d
      };
    });

    closeModal();
  };

  /* =======================================================
     저장 - 위시
  ======================================================= */

  const saveWish = () => {
    if (
      !form.name?.trim()
    ) {
      return;
    }

    setData(p => {
      const list =
        p.wish || [];

      if (editItem) {
        return {
          ...p,
          wish:
            list.map(w =>
              w.id ===
              editItem.id
                ? {
                    ...w,
                    ...form,
                    name:
                      form.name.trim()
                  }
                : w
            )
        };
      }

      return {
        ...p,
        wish: [
          ...list,
          {
            id: uid(),
            ...form,
            name:
              form.name.trim(),
            addedDate:
              key,
            order:
              nextOrder(
                list
              )
          }
        ]
      };
    });

    closeModal();
  };

  /* =======================================================
     삭제
  ======================================================= */

  const delRoutine =
    id =>
      setData(p => ({
        ...p,
        routines: (
          p.routines || []
        ).map(r =>
          r.id === id
            ? {
                ...r,
                removed: {
                  ...(r.removed ||
                    {}),
                  [key]:
                    true
                }
              }
            : r
        )
      }));

  const delWork =
    id =>
      setData(p => {
        const w = {
          ...(p.work || {})
        };

        Object.keys(
          w
        ).forEach(
          dk => {
            w[dk] = (
              w[dk] || []
            ).filter(
              t =>
                t.id !== id
            );
          }
        );

        return {
          ...p,
          work: w
        };
      });

  const delDaily =
    id =>
      setData(p => {
        const d = {
          ...(p.daily || {})
        };

        Object.keys(
          d
        ).forEach(
          dk => {
            d[dk] = (
              d[dk] || []
            ).filter(
              t =>
                t.id !== id
            );
          }
        );

        return {
          ...p,
          daily: d
        };
      });

  const delWish =
    id =>
      setData(p => ({
        ...p,
        wish: (
          p.wish || []
        ).filter(
          w =>
            w.id !== id
        )
      }));

  const buyWish =
    id =>
      setData(p => ({
        ...p,
        wish: (
          p.wish || []
        ).map(w =>
          w.id === id
            ? {
                ...w,
                boughtDate:
                  key
              }
            : w
        )
      }));

  /* =======================================================
     순서 이동 - 공통
  ======================================================= */

  const swapOrder = (
    visibleList,
    idx,
    dir,
    applyNewList
  ) => {
    const target =
      idx + dir;

    if (
      target < 0 ||
      target >=
        visibleList.length
    ) {
      return;
    }

    const a =
      visibleList[idx];

    const b =
      visibleList[target];

    const ao =
      a.order ?? idx;

    const bo =
      b.order ?? target;

    applyNewList(
      a.id,
      bo,
      b.id,
      ao
    );
  };

  /* =======================================================
     루틴 이동
  ======================================================= */

  const moveRoutine = (
    idx,
    dir
  ) =>
    swapOrder(
      visRoutines,
      idx,
      dir,
      (
        aId,
        aNew,
        bId,
        bNew
      ) => {
        setData(p => ({
          ...p,
          routines:
            (
              p.routines ||
              []
            ).map(r =>
              r.id ===
              aId
                ? {
                    ...r,
                    order:
                      aNew
                  }
                : r.id ===
                    bId
                ? {
                    ...r,
                    order:
                      bNew
                  }
                : r
            )
        }));
      }
    );

  /* =======================================================
     일상 이동
  ======================================================= */

  const moveDaily = (
    idx,
    dir
  ) =>
    swapOrder(
      todayDaily,
      idx,
      dir,
      (
        aId,
        aNew,
        bId,
        bNew
      ) => {
        setData(p => {
          const d = {
            ...(p.daily || {})
          };

          Object.keys(
            d
          ).forEach(
            dk => {
              d[dk] = (
                d[dk] || []
              ).map(t =>
                t.id ===
                aId
                  ? {
                      ...t,
                      order:
                        aNew
                    }
                  : t.id ===
                      bId
                  ? {
                      ...t,
                      order:
                        bNew
                    }
                  : t
              );
            }
          );

          return {
            ...p,
            daily: d
          };
        });
      }
    );

  /* =======================================================
     위시 이동
  ======================================================= */

  const moveWish = (
    idx,
    dir
  ) =>
    swapOrder(
      todayWish,
      idx,
      dir,
      (
        aId,
        aNew,
        bId,
        bNew
      ) => {
        setData(p => ({
          ...p,
          wish:
            (
              p.wish || []
            ).map(w =>
              w.id ===
              aId
                ? {
                    ...w,
                    order:
                      aNew
                  }
                : w.id ===
                    bId
                ? {
                    ...w,
                    order:
                      bNew
                  }
                : w
            )
        }));
      }
    );

  /* =======================================================
     회사업무 이동
     
     우선순위 그룹 내부에서만 ↑↓
  ======================================================= */

  const moveWork = (
    idx,
    dir
  ) => {
    const item =
      sortedWork[idx];

    if (!item) {
      return;
    }

    const sameGroup =
      sortedWork.filter(
        t =>
          (
            t.priority ||
            '중간'
          ) ===
          (
            item.priority ||
            '중간'
          )
      );

    const gIdx =
      sameGroup.findIndex(
        t =>
          t.id ===
          item.id
      );

    const target =
      gIdx + dir;

    if (
      target < 0 ||
      target >=
        sameGroup.length
    ) {
      return;
    }

    const a =
      sameGroup[gIdx];

    const b =
      sameGroup[target];

    const ao =
      a.order ?? gIdx;

    const bo =
      b.order ?? target;

    setData(p => {
      const w = {
        ...(p.work || {})
      };

      Object.keys(
        w
      ).forEach(
        dk => {
          w[dk] = (
            w[dk] || []
          ).map(t =>
            t.id === a.id
              ? {
                  ...t,
                  order:
                    bo
                }
              : t.id === b.id
              ? {
                  ...t,
                  order:
                    ao
                }
              : t
          );
        }
      );

      return {
        ...p,
        work: w
      };
    });
  };

  const workMoveable =
    idx => {
      const item =
        sortedWork[idx];

      if (!item) {
        return {
          canUp:
            false,
          canDown:
            false
        };
      }

      const sameGroup =
        sortedWork.filter(
          t =>
            (
              t.priority ||
              '중간'
            ) ===
            (
              item.priority ||
              '중간'
            )
        );

      const gIdx =
        sameGroup.findIndex(
          t =>
            t.id ===
            item.id
        );

      return {
        canUp:
          gIdx > 0,
        canDown:
          gIdx <
          sameGroup.length -
            1
      };
    };

  /* =======================================================
     생필품 알림 끄기
  ======================================================= */

  const muteEss =
    id => {
      setEssItems(
        p =>
          (p || []).map(
            e =>
              e.id === id
                ? {
                    ...e,
                    notifyOff:
                      true
                  }
                : e
          )
      );

      setOpenEssId(
        null
      );
    };

  /* =======================================================
     완료 토글
     
     중요:
     완료의 기준은 completed[날짜][id]

     기존 work / daily에 남아있는
     completed / doneDate / completedDate는
     구버전 호환을 위해 함께 갱신.
  ======================================================= */

  const toggle = (
    id,
    type
  ) => {
    setData(p => {
      const nextCompleted =
        {
          ...(p.completed || {})
        };

      const todayCompleted =
        {
          ...(nextCompleted[key] ||
            {})
        };

      const currentlyDone =
        !!todayCompleted[id];

      if (
        currentlyDone
      ) {
        delete todayCompleted[id];
      } else {
        todayCompleted[id] =
          true;
      }

      nextCompleted[key] =
        todayCompleted;

      /*
       * 루틴
       */
      if (
        type ===
        'routine'
      ) {
        return {
          ...p,
          completed:
            nextCompleted
        };
      }

      /*
       * 일상
       *
       * 완료의 진짜 기준은
       * completed[key][id]
       *
       * 기존 데이터와의 호환을 위해
       * 완료일 정보도 갱신한다.
       */
      if (
        type ===
        'daily'
      ) {
        const d = {
          ...(p.daily || {})
        };

        Object.keys(
          d
        ).forEach(
          dk => {
            d[dk] = (
              d[dk] || []
            ).map(item =>
              item.id === id
                ? {
                    ...item,
                    completed:
                      !currentlyDone,
                    completedDate:
                      !currentlyDone
                        ? key
                        : null
                  }
                : item
            );
          }
        );

        return {
          ...p,
          daily: d,
          completed:
            nextCompleted
        };
      }

      return {
        ...p,
        completed:
          nextCompleted
      };
    });
  };

  /* =======================================================
     회사업무 완료
     
     오늘 완료 처리하면:
     - completed[key][id] = true
     - doneDate = key

     다음날:
     - 화면에서 숨김

     완료 취소:
     - 해당 날짜의 completed 삭제
     - doneDate도 제거
  ======================================================= */

  const toggleWork =
    id => {
      setData(p => {
        const workData = {
          ...(p.work || {})
        };

        let currentItem =
          null;

        Object.keys(
          workData
        ).forEach(
          dk => {
            const found =
              (
                workData[dk] ||
                []
              ).find(
                t =>
                  t.id ===
                  id
              );

            if (found) {
              currentItem =
                found;
            }
          }
        );

        const completedMap =
          {
            ...(p.completed ||
              {})
          };

        const todayCompleted =
          {
            ...(completedMap[
              key
            ] || {})
          };

        const mapDone =
          !!todayCompleted[
            id
          ];

        /*
         * 새 구조가 있으면 우선.
         * 없으면 기존 doneDate를 확인해서
         * 기존 데이터도 자연스럽게 처리.
         */
        const currentlyDone =
          mapDone ||
          currentItem?.doneDate ===
            key;

        if (
          currentlyDone
        ) {
          delete todayCompleted[
            id
          ];
        } else {
          todayCompleted[
            id
          ] = true;
        }

        completedMap[key] =
          todayCompleted;

        Object.keys(
          workData
        ).forEach(
          dk => {
            workData[dk] = (
              workData[dk] ||
              []
            ).map(t =>
              t.id === id
                ? {
                    ...t,
                    doneDate:
                      currentlyDone
                        ? null
                        : key,
                    completed:
                      !currentlyDone,
                    completedDate:
                      !currentlyDone
                        ? key
                        : null
                  }
                : t
            );
          }
        );

        return {
          ...p,
          work:
            workData,
          completed:
            completedMap
        };
      });
    };

  /* =======================================================
     할 일 행
  ======================================================= */

  const TaskRow = ({
    item,
    onToggle,
    onEdit,
    onDel,
    onUp,
    onDown,
    canUp,
    canDown,
    extra,
    badge,
    carryBadge,
    completedBadge
  }) => {
    const [open, setOpen] =
      useState(false);

    const done =
      item._done !==
      undefined
        ? item._done
        : isDone(item.id);

    return (
      <div
        style={{
          borderBottom:
            '1px solid var(--border)'
        }}
      >
        <div
          onClick={() =>
            setOpen(o => !o)
          }
          style={{
            display: 'flex',
            alignItems:
              'flex-start',
            padding:
              '13px 16px',
            cursor:
              'pointer',
            gap: 12,
            userSelect:
              'none'
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0
            }}
          >
            {item.timeText && (
              <div
                style={{
                  fontSize: 10,
                  color:
                    'var(--sub)',
                  marginBottom:
                    3
                }}
              >
                🕐{' '}
                {
                  item.timeText
                }
              </div>
            )}

            <div
              style={{
                fontSize:
                  13.5,
                fontWeight:
                  done
                    ? 400
                    : 600,
                color:
                  done
                    ? 'var(--sub)'
                    : 'var(--text)',
                textDecoration:
                  done
                    ? 'line-through'
                    : 'none',
                lineHeight:
                  1.45
              }}
            >
              {item.title ||
                item.name}
            </div>

            {extra}

            <div
              style={{
                display:
                  'flex',
                gap: 6,
                flexWrap:
                  'wrap',
                marginTop:
                  5
              }}
            >
              {!done &&
                carryBadge && (
                  <span
                    style={{
                      fontSize:
                        10,
                      color:
                        carryBadge.color,
                      fontWeight:
                        700
                    }}
                  >
                    {
                      carryBadge.label
                    }
                  </span>
                )}

              {done &&
                completedBadge && (
                  <span
                    style={{
                      fontSize:
                        10,
                      color:
                        completedBadge.color,
                      fontWeight:
                        700
                    }}
                  >
                    ✓{' '}
                    {
                      completedBadge.label
                    }
                  </span>
                )}
            </div>

            {item.memo && (
              <div
                style={{
                  fontSize:
                    11.5,
                  color:
                    'var(--sub)',
                  marginTop:
                    4,
                  lineHeight:
                    1.5
                }}
              >
                {
                  item.memo
                }
              </div>
            )}
          </div>

          <div
            style={{
              flexShrink:
                0,
              display:
                'flex',
              flexDirection:
                'column',
              alignItems:
                'flex-end',
              gap: 4
            }}
          >
            {badge && (
              <span
                style={{
                  fontSize:
                    11,
                  fontWeight:
                    badge.bold
                      ? 800
                      : 700,
                  color:
                    badge.color,
                  lineHeight:
                    1.2,
                  whiteSpace:
                    'nowrap'
                }}
              >
                {
                  badge.label
                }
              </span>
            )}

            <button
              onClick={e => {
                e.stopPropagation();
                onToggle();
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius:
                  8,
                marginTop: 1,
                border: `2px solid ${
                  done
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
                background:
                  done
                    ? 'var(--accent)'
                    : 'transparent',
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center'
              }}
            >
              {done && (
                <span
                  style={{
                    color:
                      '#fff',
                    fontSize:
                      12,
                    fontWeight:
                      700
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          </div>
        </div>

        {open && (
          <ActionBar
            onEdit={() => {
              onEdit();
              setOpen(false);
            }}
            onUp={onUp}
            onDown={onDown}
            onDel={onDel}
            canUp={canUp}
            canDown={
              canDown
            }
          />
        )}
      </div>
    );
  };

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
      {/* 날짜 헤더 */}

      <div
        style={{
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'space-between',
          marginBottom: 16
        }}
      >
        <button
          onClick={() =>
            setDate(d => {
              const n =
                new Date(d);

              n.setDate(
                n.getDate() -
                  1
              );

              return n;
            })
          }
          style={{
            fontSize: 26,
            color:
              'var(--accent)',
            padding:
              '2px 8px',
            background:
              'none',
            border: 'none',
            cursor:
              'pointer'
          }}
        >
          ‹
        </button>

        <button
          onClick={() =>
            setShowCal(true)
          }
          style={{
            textAlign:
              'center',
            flex: 1,
            background:
              'none',
            border: 'none',
            cursor:
              'pointer'
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight:
                800,
              color:
                'var(--text)',
              lineHeight: 1
            }}
          >
            {m}월 {day}일
          </div>

          <div
            style={{
              fontSize: 14,
              color:
                'var(--accent)',
              fontWeight:
                600,
              marginTop: 2
            }}
          >
            {y} {dow}요일{' '}
            {isToday
              ? '· 오늘'
              : ''}
          </div>
        </button>

        <button
          onClick={() =>
            setDate(d => {
              const n =
                new Date(d);

              n.setDate(
                n.getDate() +
                  1
              );

              return n;
            })
          }
          style={{
            fontSize: 26,
            color:
              'var(--accent)',
            padding:
              '2px 8px',
            background:
              'none',
            border: 'none',
            cursor:
              'pointer'
          }}
        >
          ›
        </button>
      </div>

      {/* 진행률 */}

      {totalCount > 0 && (
        <div
          style={{
            marginBottom:
              20
          }}
        >
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              fontSize: 11,
              color:
                'var(--sub)',
              marginBottom:
                5
            }}
          >
            <span>
              오늘의 진행률
            </span>

            <span
              style={{
                fontWeight:
                  700,
                color:
                  'var(--accent)'
              }}
            >
              {doneCount}/
              {totalCount}
              {' · '}
              {progress}%
            </span>
          </div>

          <div
            style={{
              height: 6,
              background:
                'var(--border)',
              borderRadius:
                6,
              overflow:
                'hidden'
            }}
          >
            <div
              style={{
                height:
                  '100%',
                borderRadius:
                  6,
                width: `${progress}%`,
                background:
                  'linear-gradient(90deg,var(--accent),var(--accent2))',
                transition:
                  'width 0.4s'
              }}
            />
          </div>
        </div>
      )}

      {/* ===================================================
          루틴
      =================================================== */}

      <div
        style={{
          marginBottom:
            20
        }}
      >
        <SectionHeader
          icon="🔄"
          title="루틴"
          color="var(--accent)"
          count={
            visRoutines.length
          }
        />

        <div
          style={{
            background:
              'var(--card)',
            borderRadius:
              14,
            overflow:
              'hidden',
            boxShadow:
              '0 2px 10px rgba(124,92,191,0.08)',
            border:
              '1px solid var(--border)'
          }}
        >
          {visRoutines.map(
            (r, i) => {
              const done =
                isDone(r.id);

              return (
                <TaskRow
                  key={r.id}
                  item={{
                    ...r,
                    _done:
                      done
                  }}
                  onToggle={() =>
                    toggle(
                      r.id,
                      'routine'
                    )
                  }
                  onEdit={() =>
                    openModal(
                      'routine',
                      r
                    )
                  }
                  onDel={() =>
                    delRoutine(
                      r.id
                    )
                  }
                  onUp={() =>
                    moveRoutine(
                      i,
                      -1
                    )
                  }
                  onDown={() =>
                    moveRoutine(
                      i,
                      1
                    )
                  }
                  canUp={
                    i > 0
                  }
                  canDown={
                    i <
                    visRoutines.length -
                      1
                  }
                />
              );
            }
          )}

          <AddRowBtn
            onClick={() =>
              openModal(
                'routine'
              )
            }
          />
        </div>
      </div>

      {/* ===================================================
          회사업무
      =================================================== */}

      <div
        style={{
          marginBottom:
            20
        }}
      >
        <SectionHeader
          icon="💼"
          title="회사업무"
          color="#e8a838"
          count={
            sortedWork.length
          }
        />

        <div
          style={{
            background:
              'var(--card)',
            borderRadius:
              14,
            overflow:
              'hidden',
            boxShadow:
              '0 2px 10px rgba(124,92,191,0.08)',
            border:
              '1px solid var(--border)'
          }}
        >
          {sortedWork.map(
            (t, i) => {
              const mv =
                workMoveable(
                  i
                );

              const completionDate =
                getCompletionDate(
                  completed,
                  t.id,
                  key
                ) ||
                t.doneDate ||
                t.completedDate ||
                null;

              const isWorkDone =
                completionDate ===
                key;

              const carry =
                !isWorkDone
                  ? getCarryBadge(
                      t.startDate,
                      key
                    )
                  : null;

              const completedBadge =
                isWorkDone
                  ? getCompletedBadge(
                      t.startDate,
                      completionDate
                    )
                  : null;

              return (
                <TaskRow
                  key={t.id}
                  item={{
                    ...t,
                    _done:
                      isWorkDone
                  }}
                  onToggle={() =>
                    toggleWork(
                      t.id
                    )
                  }
                  onEdit={() =>
                    openModal(
                      'work',
                      t
                    )
                  }
                  onDel={() =>
                    delWork(
                      t.id
                    )
                  }
                  badge={getDDay(
                    t.due
                  )}
                  carryBadge={
                    carry
                  }
                  completedBadge={
                    completedBadge
                  }
                  onUp={() =>
                    moveWork(
                      i,
                      -1
                    )
                  }
                  onDown={() =>
                    moveWork(
                      i,
                      1
                    )
                  }
                  canUp={
                    mv.canUp
                  }
                  canDown={
                    mv.canDown
                  }
                  extra={
                    <div
                      style={{
                        display:
                          'flex',
                        gap: 6,
                        marginTop:
                          4,
                        flexWrap:
                          'wrap'
                      }}
                    >
                      {t.priority && (
                        <span
                          style={{
                            fontSize:
                              10,
                            padding:
                              '2px 7px',
                            borderRadius:
                              10,
                            background:
                              `${
                                PC[
                                  t.priority
                                ]
                              }18`,
                            color:
                              PC[
                                t.priority
                              ],
                            fontWeight:
                              700
                          }}
                        >
                          {
                            t.priority
                          }
                        </span>
                      )}

                      {t.due && (
                        <span
                          style={{
                            fontSize:
                              10,
                            padding:
                              '2px 7px',
                            borderRadius:
                              10,
                            background:
                              'var(--bg)',
                            color:
                              'var(--sub)'
                          }}
                        >
                          ~
                          {t.due}
                        </span>
                      )}
                    </div>
                  }
                />
              );
            }
          )}

          <AddRowBtn
            onClick={() =>
              openModal(
                'work',
                {
                  startDate:
                    key
                }
              )
            }
          />
        </div>
      </div>

      {/* ===================================================
          일상
      =================================================== */}

      <div
        style={{
          marginBottom:
            20
        }}
      >
        <SectionHeader
          icon="🌿"
          title="일상"
          color="#3dbf6c"
          count={
            todayDaily.length
          }
        />

        <div
          style={{
            background:
              'var(--card)',
            borderRadius:
              14,
            overflow:
              'hidden',
            boxShadow:
              '0 2px 10px rgba(124,92,191,0.08)',
            border:
              '1px solid var(--border)'
          }}
        >
          {todayDaily.map(
            (t, i) => {
              const completionDate =
                t._completionDate ||
                null;

              const done =
                completionDate ===
                  key ||
                isDone(t.id);

              const carry =
                !done
                  ? getCarryBadge(
                      t.addedDate,
                      key
                    )
                  : null;

              const completedBadge =
                done
                  ? getCompletedBadge(
                      t.addedDate,
                      completionDate ||
                        key
                    )
                  : null;

              return (
                <TaskRow
                  key={t.id}
                  item={{
                    ...t,
                    _done:
                      done
                  }}
                  onToggle={() =>
                    toggle(
                      t.id,
                      'daily'
                    )
                  }
                  onEdit={() =>
                    openModal(
                      'daily',
                      t
                    )
                  }
                  onDel={() =>
                    delDaily(
                      t.id
                    )
                  }
                  onUp={() =>
                    moveDaily(
                      i,
                      -1
                    )
                  }
                  onDown={() =>
                    moveDaily(
                      i,
                      1
                    )
                  }
                  canUp={
                    i > 0
                  }
                  canDown={
                    i <
                    todayDaily.length -
                      1
                  }
                  carryBadge={
                    carry
                  }
                  completedBadge={
                    completedBadge
                  }
                />
              );
            }
          )}

          <AddRowBtn
            onClick={() =>
              openModal(
                'daily'
              )
            }
          />
        </div>

        {/* 구매 임박 생필품 */}

        {urgentEss.length >
          0 && (
          <div
            style={{
              marginTop:
                10,
              background:
                'var(--yellow-bg)',
              border:
                '1px solid var(--yellow)',
              borderRadius:
                12,
              padding:
                '10px 14px'
            }}
          >
            <div
              style={{
                fontSize:
                  11,
                fontWeight:
                  700,
                color:
                  'var(--yellow)',
                marginBottom:
                  6
              }}
            >
              🛒 구매 임박 생필품
            </div>

            {urgentEss.map(
              e => {
                const sorted =
                  [
                    ...(e.history ||
                      [])
                  ].sort(
                    (a, b) =>
                      new Date(
                        a.date
                      ) -
                      new Date(
                        b.date
                      )
                  );

                const gaps =
                  [];

                for (
                  let i = 1;
                  i <
                    sorted.length;
                  i++
                ) {
                  gaps.push(
                    (
                      new Date(
                        sorted[
                          i
                        ].date
                      ) -
                      new Date(
                        sorted[
                          i -
                            1
                        ].date
                      )
                    ) /
                      864e5
                  );
                }

                if (
                  !gaps.length
                ) {
                  return null;
                }

                const avg =
                  Math.round(
                    gaps.reduce(
                      (
                        a,
                        b
                      ) =>
                        a + b,
                      0
                    ) /
                      gaps.length
                  );

                const last =
                  new Date(
                    sorted[
                      sorted.length -
                        1
                    ].date
                  );

                last.setDate(
                  last.getDate() +
                    avg
                );

                const diff =
                  Math.ceil(
                    (last -
                      new Date()) /
                      864e5
                  );

                const isOpen =
                  openEssId ===
                  e.id;

                return (
                  <div
                    key={
                      e.id
                    }
                  >
                    <div
                      onClick={() =>
                        setOpenEssId(
                          isOpen
                            ? null
                            : e.id
                        )
                      }
                      style={{
                        fontSize:
                          12,
                        color:
                          'var(--text)',
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        padding:
                          '5px 0',
                        cursor:
                          'pointer'
                      }}
                    >
                      <span>
                        {
                          e.name
                        }
                      </span>

                      <span
                        style={{
                          color:
                            diff <
                            0
                              ? 'var(--red)'
                              : 'var(--yellow)',
                          fontWeight:
                            700
                        }}
                      >
                        {diff <
                        0
                          ? `${Math.abs(
                              diff
                            )}일 지남 🔴`
                          : diff ===
                            0
                          ? '오늘! 🔴'
                          : `${diff}일 후 🟡`}
                      </span>
                    </div>

                    {isOpen && (
                      <button
                        onClick={() =>
                          muteEss(
                            e.id
                          )
                        }
                        style={{
                          width:
                            '100%',
                          margin:
                            '2px 0 6px',
                          padding:
                            8,
                          borderRadius:
                            8,
                          border:
                            '1px solid var(--border)',
                          background:
                            'var(--card)',
                          color:
                            'var(--sub)',
                          fontSize:
                            12,
                          fontWeight:
                            700,
                          cursor:
                            'pointer'
                        }}
                      >
                        🔕 이 생필품 알림 끄기
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          위시리스트
      =================================================== */}

      <div
        style={{
          marginBottom:
            20
        }}
      >
        <SectionHeader
          icon="🛍"
          title="위시리스트"
          color="#af52de"
          count={
            todayWish.length
          }
        />

        <div
          style={{
            background:
              'var(--card)',
            borderRadius:
              14,
            overflow:
              'hidden',
            boxShadow:
              '0 2px 10px rgba(124,92,191,0.08)',
            border:
              '1px solid var(--border)'
          }}
        >
          {todayWish.map(
            (w, i) => (
              <WishRow
                key={
                  w.id
                }
                w={w}
                onEdit={() =>
                  openModal(
                    'wish',
                    w
                  )
                }
                onDel={() =>
                  delWish(
                    w.id
                  )
                }
                onBuy={() =>
                  buyWish(
                    w.id
                  )
                }
                onUp={() =>
                  moveWish(
                    i,
                    -1
                  )
                }
                onDown={() =>
                  moveWish(
                    i,
                    1
                  )
                }
                canUp={
                  i > 0
                }
                canDown={
                  i <
                  todayWish.length -
                    1
                }
              />
            )
          )}

          <AddRowBtn
            onClick={() =>
              openModal(
                'wish'
              )
            }
            label="+ 위시 추가"
          />
        </div>
      </div>

      {/* ===================================================
          달력
      =================================================== */}

      {showCal && (
        <CalendarOverlay
          current={{
            y,
            m,
            day
          }}
          onSelect={
            setDate
          }
          onClose={() =>
            setShowCal(false)
          }
        />
      )}

      {/* ===================================================
          루틴 모달
      =================================================== */}

      {modal ===
        'routine' && (
        <Modal
          title={`🔄 루틴 ${
            editItem
              ? '수정'
              : '추가'
          }`}
          onClose={
            closeModal
          }
        >
          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              제목 *
            </label>

            <input
              style={inp}
              placeholder="매일 반복할 일"
              value={
                form.title ||
                ''
              }
              onChange={e =>
                F(
                  'title',
                  e.target.value
                )
              }
            />
          </div>

          <SaveBtn
            onClick={
              saveRoutine
            }
          />
        </Modal>
      )}

      {/* ===================================================
          회사업무 모달
      =================================================== */}

      {modal ===
        'work' && (
        <Modal
          title={`💼 회사업무 ${
            editItem
              ? '수정'
              : '추가'
          }`}
          onClose={
            closeModal
          }
        >
          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              제목 *
            </label>

            <input
              style={inp}
              placeholder="업무 내용"
              value={
                form.title ||
                ''
              }
              onChange={e =>
                F(
                  'title',
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              display:
                'flex',
              gap: 8,
              marginBottom:
                14
            }}
          >
            <div
              style={{
                flex: 1
              }}
            >
              <label style={lbl}>
                시작일 *
              </label>

              <input
                style={inp}
                type="date"
                value={
                  form.startDate ||
                  key
                }
                onChange={e =>
                  F(
                    'startDate',
                    e.target.value
                  )
                }
              />
            </div>

            <div
              style={{
                flex: 1
              }}
            >
              <label style={lbl}>
                마감기한
              </label>

              <input
                style={inp}
                type="date"
                value={
                  form.due ||
                  ''
                }
                onChange={e =>
                  F(
                    'due',
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div
            style={{
              display:
                'flex',
              gap: 8,
              marginBottom:
                14
            }}
          >
            <div
              style={{
                flex: 1
              }}
            >
              <label style={lbl}>
                시간대
              </label>

              <input
                style={inp}
                placeholder="오전 10시 등"
                value={
                  form.timeText ||
                  ''
                }
                onChange={e =>
                  F(
                    'timeText',
                    e.target.value
                  )
                }
              />
            </div>

            <div
              style={{
                flex: 1
              }}
            >
              <label style={lbl}>
                우선순위
              </label>

              <select
                style={inp}
                value={
                  form.priority ||
                  '중간'
                }
                onChange={e =>
                  F(
                    'priority',
                    e.target.value
                  )
                }
              >
                <option>
                  높음
                </option>

                <option>
                  중간
                </option>

                <option>
                  낮음
                </option>
              </select>
            </div>
          </div>

          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              메모
            </label>

            <input
              style={inp}
              placeholder="참고 사항"
              value={
                form.memo ||
                ''
              }
              onChange={e =>
                F(
                  'memo',
                  e.target.value
                )
              }
            />
          </div>

          <SaveBtn
            onClick={
              saveWork
            }
          />
        </Modal>
      )}

      {/* ===================================================
          일상 모달
      =================================================== */}

      {modal ===
        'daily' && (
        <Modal
          title={`🌿 일상 ${
            editItem
              ? '수정'
              : '추가'
          }`}
          onClose={
            closeModal
          }
        >
          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              제목 *
            </label>

            <input
              style={inp}
              placeholder="할 일"
              value={
                form.title ||
                ''
              }
              onChange={e =>
                F(
                  'title',
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              시간대
            </label>

            <input
              style={inp}
              placeholder="저녁, 자기 전 등"
              value={
                form.timeText ||
                ''
              }
              onChange={e =>
                F(
                  'timeText',
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              메모
            </label>

            <input
              style={inp}
              placeholder="참고 사항"
              value={
                form.memo ||
                ''
              }
              onChange={e =>
                F(
                  'memo',
                  e.target.value
                )
              }
            />
          </div>

          <SaveBtn
            onClick={
              saveDaily
            }
          />
        </Modal>
      )}

      {/* ===================================================
          위시 모달
      =================================================== */}

      {modal ===
        'wish' && (
        <Modal
          title={`🛍 위시리스트 ${
            editItem
              ? '수정'
              : '추가'
          }`}
          onClose={
            closeModal
          }
        >
          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              상품명 *
            </label>

            <input
              style={inp}
              placeholder="뭘 살 거예요?"
              value={
                form.name ||
                ''
              }
              onChange={e =>
                F(
                  'name',
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              카테고리
            </label>

            <input
              style={inp}
              placeholder="뷰티, 패션, 생활 등"
              value={
                form.category ||
                ''
              }
              onChange={e =>
                F(
                  'category',
                  e.target.value
                )
              }
            />
          </div>

          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              우선순위
            </label>

            <div
              style={{
                display:
                  'flex',
                gap: 6
              }}
            >
              {[
                '필요',
                '가격 내려가면',
                '언젠가'
              ].map(
                p => (
                  <button
                    key={p}
                    onClick={() =>
                      F(
                        'priority',
                        p
                      )
                    }
                    style={{
                      flex: 1,
                      padding:
                        '8px 4px',
                      borderRadius:
                        8,
                      border: `1.5px solid ${
                        form.priority ===
                        p
                          ? 'var(--accent)'
                          : 'var(--border)'
                      }`,
                      background:
                        form.priority ===
                        p
                          ? 'var(--accent-bg)'
                          : 'var(--card)',
                      color:
                        form.priority ===
                        p
                          ? 'var(--accent)'
                          : 'var(--sub)',
                      fontSize:
                        11,
                      fontWeight:
                        600,
                      cursor:
                        'pointer'
                    }}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          </div>

          <div
            style={{
              marginBottom:
                14
            }}
          >
            <label style={lbl}>
              메모
            </label>

            <input
              style={inp}
              placeholder="참고 사항"
              value={
                form.memo ||
                ''
              }
              onChange={e =>
                F(
                  'memo',
                  e.target.value
                )
              }
            />
          </div>

          <SaveBtn
            onClick={
              saveWish
            }
          />
        </Modal>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { uid, fmtDate, toKey } from '../utils/helpers';
import { Card, Modal, CalendarOverlay, SaveBtn, AddRowBtn, SectionHeader } from '../components/UI';

const PC = { 높음: '#e05252', 중간: '#e8a838', 낮음: '#52ae7a' };
const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none', boxSizing: 'border-box' };

// order 필드로 정렬 (order 없으면 뒤로). 같으면 기존 순서 유지
const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999);

// ── 이동/수정/삭제 액션 바 (펼침) ────────────────────────────────────────
function ActionBar({ onEdit, onUp, onDown, onDel, canUp, canDown }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
      <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{ flex: 1, padding: '10px 0', fontSize: 12, color: 'var(--accent)', fontWeight: 700, borderRight: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>✎ 수정</button>
      <button onClick={e => { e.stopPropagation(); onUp(); }} disabled={!canUp} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: canUp ? 'var(--text)' : 'var(--border)', fontWeight: 700, borderRight: '1px solid var(--border)', background: 'none', cursor: canUp ? 'pointer' : 'default' }}>↑</button>
      <button onClick={e => { e.stopPropagation(); onDown(); }} disabled={!canDown} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: canDown ? 'var(--text)' : 'var(--border)', fontWeight: 700, borderRight: '1px solid var(--border)', background: 'none', cursor: canDown ? 'pointer' : 'default' }}>↓</button>
      <button onClick={e => { e.stopPropagation(); onDel(); }} style={{ flex: 1, padding: '10px 0', fontSize: 12, color: 'var(--red)', fontWeight: 700, background: 'none', cursor: 'pointer' }}>🗑 삭제</button>
    </div>
  );
}

function WishRow({ w, onEdit, onDel, onBuy, onUp, onDown, canUp, canDown }) {
  const [open, setOpen] = useState(false);
  const bought = !!w.boughtDate;
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', cursor: 'pointer', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: bought ? 'var(--sub)' : 'var(--text)', textDecoration: bought ? 'line-through' : 'none' }}>{w.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {w.category && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--bg)', color: 'var(--sub)' }}>{w.category}</span>}
            {w.priority && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700 }}>{w.priority}</span>}
          </div>
          {w.memo && <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 3 }}>{w.memo}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); if (!bought) onBuy(); }} style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: 8,
          border: `2px solid ${bought ? 'var(--accent)' : 'var(--border)'}`,
          background: bought ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {bought && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
        </button>
      </div>
      {open && (
        <ActionBar
          onEdit={() => { onEdit(); setOpen(false); }}
          onUp={onUp} onDown={onDown} onDel={onDel}
          canUp={canUp} canDown={canDown}
        />
      )}
    </div>
  );
}

export default function TodoTab({ data, setData, essItems, setEssItems }) {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [showCal, setShowCal] = useState(false);
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [openEssId, setOpenEssId] = useState(null); // 구매임박 항목 펼침

  const { y, m, day, dow, key } = fmtDate(date);
  const isToday = key === toKey(today);

  const routines  = data.routines  || [];
  const work      = data.work      || {};
  const daily     = data.daily     || {};
  const wish      = data.wish      || [];
  const completed = data.completed || {};

  // ── 표시용 목록 (order 정렬) ────────────────────────────────────────────
  const visRoutines = useMemo(
    () => routines.filter(r => r.addedDate <= key && !(r.removed && r.removed[key])).sort(byOrder),
    [routines, key]
  );

  const todayWork = useMemo(() => {
    const all = Object.values(work).flat();
    return all.filter(t => {
      if (t.startDate > key) return false;                    // 아직 시작 안 함
      if (t.removed && t.removed[key]) return false;          // 그날 삭제됨
      if (t.doneDate && t.doneDate < key) return false;       // 완료한 날보다 이후면 숨김
      return true;
    });
  }, [work, key]);

  const todayDaily = useMemo(() => (daily[key] || []).slice().sort(byOrder), [daily, key]);

  const todayWish = useMemo(
    () => wish.filter(w => !w.boughtDate || w.boughtDate === key).slice().sort(byOrder),
    [wish, key]
  );

  // 회사업무: 우선순위 그룹 → 그룹 안에서 order 정렬
  const PORDER = { 높음: 0, 중간: 1, 낮음: 2 };
  const sortedWork = useMemo(() => {
    return [...todayWork].sort((a, b) => {
      const pa = PORDER[a.priority] ?? 1, pb = PORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;            // 우선순위 먼저
      return (a.order ?? 9999) - (b.order ?? 9999); // 같은 우선순위 안에서 order
    });
  }, [todayWork]);

  // 구매임박 생필품 (알림 꺼진 건 제외)
  const urgentEss = useMemo(() => (essItems || []).filter(e => {
    if (e.notifyOff) return false;             // 🔕 알림 꺼진 항목 제외
    const h = e.history || [];
    if (h.length < 2) return false;
    const sorted = [...h].sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) gaps.push((new Date(sorted[i].date) - new Date(sorted[i-1].date)) / 864e5);
    const avg = Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
    const last = new Date(sorted[sorted.length-1].date); last.setDate(last.getDate() + avg);
    const diff = Math.ceil((last - new Date()) / 864e5);
    return diff <= 10;
  }), [essItems]);

  // ── 완료 토글 ────────────────────────────────────────────────────────────
  const isDone = id => !!(completed[key] && completed[key][id]);
  const toggle = id => {
    setData(p => {
      const c = { ...p.completed };
      c[key] = { ...(c[key] || {}) };
      if (c[key][id]) delete c[key][id];
      else c[key][id] = true;
      return { ...p, completed: c };
    });
  };

  // 회사업무 전용 완료 토글: 업무 자체에 doneDate 기록 (완료하면 다음날부터 사라짐)
  const toggleWork = (id, startDate) => {
    setData(p => {
      const w = { ...p.work };
      w[startDate] = (w[startDate] || []).map(t =>
        t.id === id ? { ...t, doneDate: t.doneDate ? null : key } : t
      );
      return { ...p, work: w };
    });
  };

  // ── 진행률 ────────────────────────────────────────────────────────────────
  const allIds = [...visRoutines.map(r=>r.id), ...sortedWork.map(t=>t.id), ...todayDaily.map(t=>t.id)];
  const doneCount = allIds.filter(id => isDone(id)).length;
  const progress = allIds.length ? Math.round((doneCount / allIds.length) * 100) : 0;

  // ── 폼 ────────────────────────────────────────────────────────────────────
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const openModal = (type, item = null) => { setModal(type); setEditItem(item); setForm(item ? { ...item } : {}); };
  const closeModal = () => { setModal(null); setEditItem(null); setForm({}); };

  // 새 항목 추가 시 order = 현재 목록 최대 +1
  const nextOrder = (list) => (list.length ? Math.max(...list.map(x => x.order ?? 0)) + 1 : 0);

  const saveRoutine = () => {
    if (!form.title?.trim()) return;
    setData(p => {
      const list = p.routines || [];
      if (editItem) return { ...p, routines: list.map(r => r.id === editItem.id ? { ...r, ...form } : r) };
      return { ...p, routines: [...list, { id: uid(), title: form.title.trim(), addedDate: key, order: nextOrder(list) }] };
    });
    closeModal();
  };

  const saveWork = () => {
    if (!form.title?.trim() || !form.startDate) return;
    // 마감일 비우면 시작일과 같은 날로 (form을 직접 고치지 않고 새 변수 사용)
    const due = form.due || form.startDate;
    setData(p => {
      const w = { ...p.work };
      const item = { ...form, due, title: form.title.trim(), id: editItem?.id || uid() };
      if (editItem?.id) {
        // 모든 날짜에서 이 업무를 빼고
        Object.keys(w).forEach(dk => { w[dk] = (w[dk] || []).filter(t => t.id !== editItem.id); });
        // 새 시작일에 다시 넣기 (order 유지)
        w[form.startDate] = [...(w[form.startDate] || []), item];
      } else {
        const bucket = w[form.startDate] || [];
        w[form.startDate] = [...bucket, { ...item, order: nextOrder(bucket) }];
      }
      return { ...p, work: w };
    });
    closeModal();
  };

  const saveDaily = () => {
    if (!form.title?.trim()) return;
    setData(p => {
      const d = { ...p.daily };
      if (editItem?.id) {
        d[key] = (d[key] || []).map(t => t.id === editItem.id ? { ...t, ...form, title: form.title.trim() } : t);
      } else {
        const bucket = d[key] || [];
        d[key] = [...bucket, { id: uid(), ...form, title: form.title.trim(), addedDate: key, order: nextOrder(bucket) }];
      }
      return { ...p, daily: d };
    });
    closeModal();
  };

  const saveWish = () => {
    if (!form.name?.trim()) return;
    setData(p => {
      const list = p.wish || [];
      if (editItem) return { ...p, wish: list.map(w => w.id === editItem.id ? { ...w, ...form } : w) };
      return { ...p, wish: [...list, { id: uid(), ...form, name: form.name.trim(), addedDate: key, order: nextOrder(list) }] };
    });
    closeModal();
  };

  // ── 삭제 ────────────────────────────────────────────────────────────────
  const delRoutine = id => setData(p => ({ ...p, routines: (p.routines || []).map(r => r.id === id ? { ...r, removed: { ...(r.removed||{}), [key]: true } } : r) }));
  const delWork = (id, startDate) => setData(p => {
    const w = { ...p.work };
    // 모든 날짜 묶음에서 이 id를 가진 업무를 완전히 제거
    Object.keys(w).forEach(dk => { w[dk] = (w[dk] || []).filter(t => t.id !== id); });
    return { ...p, work: w };
  });
  const delDaily = id => setData(p => { const d = { ...p.daily }; d[key] = (d[key] || []).filter(t => t.id !== id); return { ...p, daily: d }; });
  const delWish = id => setData(p => ({ ...p, wish: (p.wish || []).filter(w => w.id !== id) }));
  const buyWish = id => setData(p => ({ ...p, wish: (p.wish || []).map(w => w.id === id ? { ...w, boughtDate: key } : w) }));

  // ── 순서 이동 (order 맞바꾸기) ────────────────────────────────────────────
  // visibleList: 화면에 보이는 정렬된 목록, idx: 움직일 항목 위치, dir: -1(위)/+1(아래)
  const swapOrder = (visibleList, idx, dir, applyNewList) => {
    const target = idx + dir;
    if (target < 0 || target >= visibleList.length) return;
    const a = visibleList[idx], b = visibleList[target];
    const ao = a.order ?? idx, bo = b.order ?? target;
    applyNewList(a.id, bo, b.id, ao); // a는 b의 order로, b는 a의 order로
  };

  const moveRoutine = (idx, dir) => swapOrder(visRoutines, idx, dir, (aId, aNew, bId, bNew) => {
    setData(p => ({ ...p, routines: (p.routines||[]).map(r => r.id===aId?{...r,order:aNew}:r.id===bId?{...r,order:bNew}:r) }));
  });

  const moveDaily = (idx, dir) => swapOrder(todayDaily, idx, dir, (aId, aNew, bId, bNew) => {
    setData(p => { const d={...p.daily}; d[key]=(d[key]||[]).map(t=>t.id===aId?{...t,order:aNew}:t.id===bId?{...t,order:bNew}:t); return {...p,daily:d}; });
  });

  const moveWish = (idx, dir) => swapOrder(todayWish, idx, dir, (aId, aNew, bId, bNew) => {
    setData(p => ({ ...p, wish: (p.wish||[]).map(w => w.id===aId?{...w,order:aNew}:w.id===bId?{...w,order:bNew}:w) }));
  });

  // 회사업무: 같은 우선순위 그룹 안에서만 이동
  const moveWork = (idx, dir) => {
    const item = sortedWork[idx];
    const sameGroup = sortedWork.filter(t => (t.priority||'중간') === (item.priority||'중간'));
    const gIdx = sameGroup.findIndex(t => t.id === item.id);
    const target = gIdx + dir;
    if (target < 0 || target >= sameGroup.length) return;
    const a = sameGroup[gIdx], b = sameGroup[target];
    const ao = a.order ?? gIdx, bo = b.order ?? target;
    setData(p => {
      const w = { ...p.work };
      Object.keys(w).forEach(dk => {
        w[dk] = (w[dk]||[]).map(t => t.id===a.id?{...t,order:bo}:t.id===b.id?{...t,order:ao}:t);
      });
      return { ...p, work: w };
    });
  };

  // 회사업무 이동 가능 여부 (그룹 안에서)
  const workMoveable = (idx) => {
    const item = sortedWork[idx];
    const sameGroup = sortedWork.filter(t => (t.priority||'중간') === (item.priority||'중간'));
    const gIdx = sameGroup.findIndex(t => t.id === item.id);
    return { canUp: gIdx > 0, canDown: gIdx < sameGroup.length - 1 };
  };

  // ── 생필품 알림 끄기 (주기 탭과 연동) ──────────────────────────────────────
  const muteEss = (id) => {
    setEssItems(p => (p || []).map(e => e.id === id ? { ...e, notifyOff: true } : e));
    setOpenEssId(null);
  };

  // ── 할일 행 ────────────────────────────────────────────────────────────────
  const TaskRow = ({ item, onToggle, onEdit, onDel, onUp, onDown, canUp, canDown, extra }) => {
    const [open, setOpen] = useState(false);
    const done = item._done !== undefined ? item._done : isDone(item.id);
    return (
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'flex-start', padding: '13px 16px', cursor: 'pointer', gap: 12, userSelect: 'none' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {item.timeText && <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 3 }}>🕐 {item.timeText}</div>}
            <div style={{ fontSize: 13.5, fontWeight: done ? 400 : 600, color: done ? 'var(--sub)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.45 }}>{item.title || item.name}</div>
            {extra}
            {item.memo && <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 4, lineHeight: 1.5 }}>{item.memo}</div>}
          </div>
          <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: 8, marginTop: 1,
            border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
            background: done ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </button>
        </div>
        {open && (
          <ActionBar
            onEdit={() => { onEdit(); setOpen(false); }}
            onUp={onUp} onDown={onDown} onDel={onDel}
            canUp={canUp} canDown={canDown}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      {/* 날짜 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate()-1); return n; })} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 8px', background: 'none', border: 'none', cursor: 'pointer' }}>‹</button>
        <button onClick={() => setShowCal(true)} style={{ textAlign: 'center', flex: 1, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{m}월 {day}일</div>
          <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{y} {dow}요일 {isToday ? '· 오늘' : ''}</div>
        </button>
        <button onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate()+1); return n; })} style={{ fontSize: 26, color: 'var(--accent)', padding: '2px 8px', background: 'none', border: 'none', cursor: 'pointer' }}>›</button>
      </div>

      {/* 진행률 */}
      {allIds.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sub)', marginBottom: 5 }}>
            <span>오늘의 진행률</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{doneCount}/{allIds.length} · {progress}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 6, width: `${progress}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {/* 루틴 */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader icon="🔄" title="루틴" color="var(--accent)" count={visRoutines.length} />
        <div style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(124,92,191,0.08)', border: '1px solid var(--border)' }}>
          {visRoutines.map((r, i) => (
            <TaskRow key={r.id} item={r} onToggle={() => toggle(r.id)} onEdit={() => openModal('routine', r)} onDel={() => delRoutine(r.id)}
              onUp={() => moveRoutine(i, -1)} onDown={() => moveRoutine(i, +1)} canUp={i>0} canDown={i<visRoutines.length-1} />
          ))}
          <AddRowBtn onClick={() => openModal('routine')} />
        </div>
      </div>

      {/* 회사업무 */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader icon="💼" title="회사업무" color="#e8a838" count={sortedWork.length} />
        <div style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(124,92,191,0.08)', border: '1px solid var(--border)' }}>
          {sortedWork.map((t, i) => {
            const mv = workMoveable(i);
            return (
              <TaskRow key={t.id} item={{ ...t, _done: !!t.doneDate }} onToggle={() => toggleWork(t.id, t.startDate)} onEdit={() => openModal('work', t)} onDel={() => delWork(t.id, t.startDate)}
                onUp={() => moveWork(i, -1)} onDown={() => moveWork(i, +1)} canUp={mv.canUp} canDown={mv.canDown}
                extra={
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {t.priority && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${PC[t.priority]}18`, color: PC[t.priority], fontWeight: 700 }}>{t.priority}</span>}
                    {t.due && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'var(--bg)', color: 'var(--sub)' }}>~{t.due}</span>}
                  </div>
                }
              />
            );
          })}
          <AddRowBtn onClick={() => openModal('work', { startDate: key })} />
        </div>
      </div>

      {/* 일상 */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader icon="🌿" title="일상" color="#3dbf6c" count={todayDaily.length} />
        <div style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(124,92,191,0.08)', border: '1px solid var(--border)' }}>
          {todayDaily.map((t, i) => (
            <TaskRow key={t.id} item={t} onToggle={() => toggle(t.id)} onEdit={() => openModal('daily', t)} onDel={() => delDaily(t.id)}
              onUp={() => moveDaily(i, -1)} onDown={() => moveDaily(i, +1)} canUp={i>0} canDown={i<todayDaily.length-1} />
          ))}
          <AddRowBtn onClick={() => openModal('daily')} />
        </div>

        {/* 구매 임박 생필품 */}
        {urgentEss.length > 0 && (
          <div style={{ marginTop: 10, background: 'var(--yellow-bg)', border: '1px solid var(--yellow)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>🛒 구매 임박 생필품</div>
            {urgentEss.map(e => {
              const sorted = [...(e.history||[])].sort((a,b)=>new Date(a.date)-new Date(b.date));
              const gaps = [];
              for(let i=1;i<sorted.length;i++) gaps.push((new Date(sorted[i].date)-new Date(sorted[i-1].date))/864e5);
              const avg = Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
              const last = new Date(sorted[sorted.length-1].date); last.setDate(last.getDate()+avg);
              const diff = Math.ceil((last - new Date()) / 864e5);
              const isOpen = openEssId === e.id;
              return (
                <div key={e.id}>
                  <div onClick={() => setOpenEssId(isOpen ? null : e.id)} style={{ fontSize: 12, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', padding: '5px 0', cursor: 'pointer' }}>
                    <span>{e.name}</span>
                    <span style={{ color: diff < 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 700 }}>{diff < 0 ? `${Math.abs(diff)}일 지남 🔴` : diff === 0 ? '오늘! 🔴' : `${diff}일 후 🟡`}</span>
                  </div>
                  {isOpen && (
                    <button onClick={() => muteEss(e.id)} style={{ width: '100%', margin: '2px 0 6px', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      🔕 이 생필품 알림 끄기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 위시리스트 */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader icon="🛍" title="위시리스트" color="#af52de" />
        <div style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(124,92,191,0.08)', border: '1px solid var(--border)' }}>
          {todayWish.map((w, i) => (
            <WishRow key={w.id} w={w} onEdit={() => openModal('wish', w)} onDel={() => delWish(w.id)} onBuy={() => buyWish(w.id)}
              onUp={() => moveWish(i, -1)} onDown={() => moveWish(i, +1)} canUp={i>0} canDown={i<todayWish.length-1} />
          ))}
          <AddRowBtn onClick={() => openModal('wish')} label="+ 위시 추가" />
        </div>
      </div>

      {/* 달력 */}
      {showCal && <CalendarOverlay current={{ y, m, day }} onSelect={setDate} onClose={() => setShowCal(false)} />}

      {/* 모달들 */}
      {modal === 'routine' && (
        <Modal title={`🔄 루틴 ${editItem ? '수정' : '추가'}`} onClose={closeModal}>
          <div style={{ marginBottom: 14 }}><label style={lbl}>제목 *</label><input style={inp} placeholder="매일 반복할 일" value={form.title||''} onChange={e => F('title', e.target.value)} /></div>
          <SaveBtn onClick={saveRoutine} />
        </Modal>
      )}

      {modal === 'work' && (
        <Modal title={`💼 회사업무 ${editItem ? '수정' : '추가'}`} onClose={closeModal}>
          <div style={{ marginBottom: 14 }}><label style={lbl}>제목 *</label><input style={inp} placeholder="업무 내용" value={form.title||''} onChange={e => F('title', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}><label style={lbl}>시작일 *</label><input style={inp} type="date" value={form.startDate||key} onChange={e => F('startDate', e.target.value)} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>마감기한</label><input style={inp} type="date" value={form.due||''} onChange={e => F('due', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}><label style={lbl}>시간대</label><input style={inp} placeholder="오전 10시 등" value={form.timeText||''} onChange={e => F('timeText', e.target.value)} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>우선순위</label>
              <select style={inp} value={form.priority||'중간'} onChange={e => F('priority', e.target.value)}>
                <option>높음</option><option>중간</option><option>낮음</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>메모</label><input style={inp} placeholder="참고 사항" value={form.memo||''} onChange={e => F('memo', e.target.value)} /></div>
          <SaveBtn onClick={saveWork} />
        </Modal>
      )}

      {modal === 'daily' && (
        <Modal title={`🌿 일상 ${editItem ? '수정' : '추가'}`} onClose={closeModal}>
          <div style={{ marginBottom: 14 }}><label style={lbl}>제목 *</label><input style={inp} placeholder="할 일" value={form.title||''} onChange={e => F('title', e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>시간대</label><input style={inp} placeholder="저녁, 자기 전 등" value={form.timeText||''} onChange={e => F('timeText', e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>메모</label><input style={inp} placeholder="참고 사항" value={form.memo||''} onChange={e => F('memo', e.target.value)} /></div>
          <SaveBtn onClick={saveDaily} />
        </Modal>
      )}

      {modal === 'wish' && (
        <Modal title={`🛍 위시리스트 ${editItem ? '수정' : '추가'}`} onClose={closeModal}>
          <div style={{ marginBottom: 14 }}><label style={lbl}>상품명 *</label><input style={inp} placeholder="뭘 살 거예요?" value={form.name||''} onChange={e => F('name', e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>카테고리</label><input style={inp} placeholder="뷰티, 패션, 생활 등" value={form.category||''} onChange={e => F('category', e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>우선순위</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['필요','가격 내려가면','언젠가'].map(p => (
                <button key={p} onClick={() => F('priority', p)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8,
                  border: `1.5px solid ${form.priority===p ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.priority===p ? 'var(--accent-bg)' : 'var(--card)',
                  color: form.priority===p ? 'var(--accent)' : 'var(--sub)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>메모</label><input style={inp} placeholder="참고 사항" value={form.memo||''} onChange={e => F('memo', e.target.value)} /></div>
          <SaveBtn onClick={saveWish} />
        </Modal>
      )}
    </div>
  );
}

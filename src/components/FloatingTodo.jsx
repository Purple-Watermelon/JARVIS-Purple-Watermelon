import { useState } from 'react';
import { uid, fmtDate, toKey } from '../utils/helpers';

export default function FloatingTodo({ todoData, setTodoData }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const today = new Date();
  const { key } = fmtDate(today);

  // 오늘 할일 목록
  const routines = (todoData?.routines || []).filter(r => r.addedDate <= key && !(r.removed && r.removed[key]));
  const work = Object.values(todoData?.work || {}).flat().filter(t => t.startDate <= key && !(t.removed && t.removed[key]));
  const daily = (todoData?.daily || {})[key] || [];
  const completed = todoData?.completed || {};
  const isDone = id => !!(completed[key] && completed[key][id]);

  const toggle = id => {
    setTodoData(p => {
      const c = { ...p.completed };
      c[key] = { ...(c[key] || {}) };
      if (c[key][id]) delete c[key][id];
      else c[key][id] = true;
      return { ...p, completed: c };
    });
  };

  const addQuick = () => {
    if (!input.trim()) return;
    setTodoData(p => {
      const d = { ...p.daily };
      d[key] = [...(d[key] || []), { id: uid(), title: input.trim(), addedDate: key }];
      return { ...p, daily: d };
    });
    setInput('');
  };

  const allItems = [
    ...routines.map(r => ({ ...r, type: '루틴' })),
    ...work.map(t => ({ ...t, type: '업무' })),
    ...daily.map(t => ({ ...t, type: '일상' })),
  ];
  const doneCount = allItems.filter(t => isDone(t.id)).length;
  const progress = allItems.length ? Math.round(doneCount / allItems.length * 100) : 0;

  const typeColor = { 루틴: 'var(--accent)', 업무: 'var(--yellow)', 일상: 'var(--green)' };

  return (
    <>
      {/* PC에서만 보이게 */}
      <style>{`
        .floating-todo { display: none; }
        @media (min-width: 768px) { .floating-todo { display: flex; } }
      `}</style>

      <div className="floating-todo" style={{
        position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
        width: 280, flexDirection: 'column', zIndex: 150,
      }}>
        {/* 헤더 */}
        <div style={{
          background: 'var(--accent)', borderRadius: open ? '16px 16px 0 0' : 16,
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer',
        }} onClick={() => setOpen(o => !o)}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>✅ 오늘 할일</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>{doneCount}/{allItems.length} 완료 · {progress}%</div>
          </div>
          <span style={{ color: '#fff', fontSize: 18 }}>{open ? '▲' : '▼'}</span>
        </div>

        {open && (
          <div style={{
            background: 'var(--card)', borderRadius: '0 0 16px 16px',
            border: '1.5px solid var(--border)', borderTop: 'none',
            maxHeight: 400, overflowY: 'auto',
          }}>
            {/* 진행률 바 */}
            <div style={{ padding: '8px 12px 0' }}>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* 할일 목록 */}
            {allItems.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--sub)', fontSize: 13 }}>오늘 할일이 없어요</div>
              : allItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => toggle(item.id)}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${isDone(item.id) ? 'var(--accent)' : 'var(--border)'}`,
                    background: isDone(item.id) ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone(item.id) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isDone(item.id) ? 400 : 600, color: isDone(item.id) ? 'var(--sub)' : 'var(--text)', textDecoration: isDone(item.id) ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  </div>
                  <span style={{ fontSize: 10, color: typeColor[item.type], fontWeight: 700, flexShrink: 0 }}>{item.type}</span>
                </div>
              ))
            }

            {/* 빠른 추가 */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuick()}
                placeholder="빠른 할일 추가..."
                style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <button onClick={addQuick} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12 }}>+</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

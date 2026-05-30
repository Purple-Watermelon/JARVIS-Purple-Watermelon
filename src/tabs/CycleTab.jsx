import { useState } from 'react';
import { uid, fmt, calcInterval, getNextDiff } from '../utils/helpers';
import { Modal, SaveBtn } from '../components/UI';

const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none' };

const DEFAULT_CATEGORIES = ['생활용품', '식품', '뷰티', '건강', '기타'];

function statusInfo(diff) {
  if (diff === null) return { dot: '⚪', color: 'var(--sub)', label: '기록 2건 이상 시 자동계산' };
  if (diff < 0)   return { dot: '🔴', color: 'var(--red)',    label: `${Math.abs(diff)}일 지남` };
  if (diff <= 3)  return { dot: '🔴', color: 'var(--red)',    label: diff === 0 ? '오늘 구매 필요!' : '구매 필요' };
  if (diff <= 10) return { dot: '🟡', color: 'var(--yellow)', label: `${diff}일 후 구매` };
  return           { dot: '🟢', color: 'var(--green)',  label: `${diff}일 후 구매` };
}

function ItemDetail({ item, onClose, onAddHistory, onEditHistory, onDelHistory }) {
  const [showForm, setShowForm] = useState(false);
  const [editH, setEditH] = useState(null);
  const [hForm, setHForm] = useState({});
  const today = new Date().toISOString().slice(0, 10);
  const HF = (k, v) => setHForm(p => ({ ...p, [k]: v }));

  const history = [...(item.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allPrices = history.filter(h => h.qty).map(h => Math.round(h.totalAmount / h.qty));
  const minPrice = allPrices.length > 1 ? Math.min(...allPrices) : null;
  const interval = calcInterval(item.history || []);
  const diff = getNextDiff(item);
  const { dot, color, label } = statusInfo(diff);

  const openAdd = () => { setEditH(null); setHForm({ date: today, unit: '개', qty: '' }); setShowForm(true); };
  const openEdit = h => { setEditH(h); setHForm({ ...h }); setShowForm(true); };

  const save = () => {
    if (!hForm.date || !hForm.totalAmount) return;
    const entry = {
      id: editH?.id || uid(),
      date: hForm.date,
      totalAmount: Number(String(hForm.totalAmount).replace(/[^0-9]/g, '')),
      qty: Number(hForm.qty) || 1,
      unit: hForm.unit || '개',
      store: hForm.store || '',
      memo: hForm.memo || '',
    };
    if (editH) onEditHistory(entry);
    else onAddHistory(entry);
    setShowForm(false); setEditH(null); setHForm({});
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,40,0.5)', zIndex: 200, display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      <div style={{ flex: 1 }} />
      <div style={{ background: 'var(--card)', borderRadius: '22px 22px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{item.name}</div>
              {item.category && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>📁 {item.category}</div>}
              {interval !== null && <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>📅 평균 구매 주기 {interval}일 · 기록 {history.length}건</div>}
            </div>
            <button onClick={onClose} style={{ fontSize: 24, color: 'var(--sub)', padding: 4 }}>×</button>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12 }}>{dot} {label}</div>
          {minPrice && <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 12 }}>🏆 개당 최저가 {fmt(minPrice)}원</div>}

          {/* 추가 폼 */}
          {showForm ? (
            <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}><label style={lbl}>날짜 *</label><input style={inp} type="date" value={hForm.date||today} onChange={e => HF('date', e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>총 금액 *</label>
                  <input style={inp} inputMode="numeric" placeholder="0" value={hForm.totalAmount ? Number(hForm.totalAmount).toLocaleString('ko-KR') : ''} onChange={e => HF('totalAmount', e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
                <div style={{ flex: 1 }}><label style={lbl}>수량</label><input style={inp} inputMode="numeric" placeholder="1" value={hForm.qty||''} onChange={e => HF('qty', e.target.value)} /></div>
                <div style={{ flex: 1 }}><label style={lbl}>단위</label><input style={inp} placeholder="개" value={hForm.unit||''} onChange={e => HF('unit', e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}><label style={lbl}>구매처</label><input style={inp} placeholder="쿠팡, 이마트 등" value={hForm.store||''} onChange={e => HF('store', e.target.value)} /></div>
              </div>
              <div style={{ marginBottom: 10 }}><label style={lbl}>메모</label><input style={inp} value={hForm.memo||''} onChange={e => HF('memo', e.target.value)} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowForm(false); setEditH(null); setHForm({}); }} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid var(--border)', color: 'var(--sub)', fontWeight: 700, fontSize: 14 }}>취소</button>
                <SaveBtn onClick={save} disabled={!hForm.date || !hForm.totalAmount} label={editH ? '수정' : '저장'} />
              </div>
            </div>
          ) : (
            <button onClick={openAdd} style={{ width: '100%', borderRadius: 12, padding: '12px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>+ 구매 기록 추가</button>
          )}
        </div>

        {/* 표 헤더 */}
        {history.length > 0 && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 80px 80px 50px', gap: 4, padding: '8px 0', borderBottom: '2px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--sub)' }}>
              <span>날짜</span>
              <span>구매처</span>
              <span style={{ textAlign: 'center' }}>수량</span>
              <span style={{ textAlign: 'right' }}>총금액</span>
              <span style={{ textAlign: 'right' }}>개당가</span>
              <span></span>
            </div>
          </div>
        )}

        {/* 기록 목록 (표 형식) */}
        <div style={{ overflowY: 'auto', padding: '0 20px 40px' }}>
          {history.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--sub)', padding: '30px 0', fontSize: 13 }}>구매 기록이 없어요</div>
            : history.map((h, i) => {
                const unitPrice = h.qty ? Math.round(h.totalAmount / h.qty) : null;
                const isMin = unitPrice !== null && minPrice !== null && unitPrice === minPrice;
                const isLatest = i === 0;
                return (
                  <div key={h.id}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '90px 1fr 60px 80px 80px 50px',
                      gap: 4, padding: '10px 0', borderBottom: '1px solid var(--border)',
                      background: isMin ? 'rgba(61,191,108,0.05)' : 'transparent',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: isLatest ? 700 : 400 }}>{h.date}</div>
                        {isLatest && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>최신</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--sub)' }}>{h.store || '-'}</div>
                        {h.memo && <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 1 }}>📝 {h.memo}</div>}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 12 }}>{h.qty}{h.unit}</div>
                      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{fmt(h.totalAmount)}원</div>
                      <div style={{ textAlign: 'right' }}>
                        {unitPrice && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isMin ? 'var(--green)' : 'var(--text)' }}>{fmt(unitPrice)}원</div>
                            {isMin && <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>🏆최저</div>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(h)} style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--accent)' }}>✎</button>
                        <button onClick={() => onDelHistory(h.id)} style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--red-bg)', color: 'var(--red)' }}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

export default function CycleTab({ data, setData }) {
  const items = data || [];
  const [detail, setDetail] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('전체');
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saveItem = () => {
    if (!form.name?.trim()) return;
    if (editItem) {
      setData(p => p.map(e => e.id === editItem.id ? { ...e, name: form.name.trim(), category: form.category||'', memo: form.memo || '' } : e));
    } else {
      setData(p => [...p, { id: uid(), name: form.name.trim(), category: form.category||'', memo: form.memo || '', history: [] }]);
    }
    setShowItemModal(false); setEditItem(null); setForm({});
  };

  const delItem = id => { setData(p => p.filter(e => e.id !== id)); setDetail(null); };

  const addHistory = (itemId, entry) => {
    setData(p => p.map(e => e.id === itemId ? { ...e, history: [...(e.history || []), entry] } : e));
    setDetail(p => p && p.id === itemId ? { ...p, history: [...(p.history || []), entry] } : p);
  };
  const editHistory = (itemId, entry) => {
    setData(p => p.map(e => e.id === itemId ? { ...e, history: (e.history || []).map(h => h.id === entry.id ? entry : h) } : e));
    setDetail(p => p && p.id === itemId ? { ...p, history: (p.history || []).map(h => h.id === entry.id ? entry : h) } : p);
  };
  const delHistory = (itemId, hId) => {
    setData(p => p.map(e => e.id === itemId ? { ...e, history: (e.history || []).filter(h => h.id !== hId) } : e));
    setDetail(p => p && p.id === itemId ? { ...p, history: (p.history || []).filter(h => h.id !== hId) } : p);
  };

  // 카테고리 목록
  const usedCats = ['전체', ...new Set(items.map(e => e.category).filter(Boolean)), ...DEFAULT_CATEGORIES.filter(c => !items.map(e=>e.category).includes(c))];

  const sorted = [...items]
    .filter(e => {
      const matchSearch = !search || e.name.includes(search);
      const matchCat = filterCat === '전체' || e.category === filterCat;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      const da = getNextDiff(a), db = getNextDiff(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });

  const detailItem = detail ? (items.find(e => e.id === detail.id) || detail) : null;

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>🔄 생필품 트래커</div>

      {/* 검색 */}
      <input style={{ ...inp, marginBottom: 12 }} placeholder="🔍 생필품 검색" value={search} onChange={e => setSearch(e.target.value)} />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {usedCats.map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: filterCat===c ? 'var(--accent)' : 'var(--card)',
            color: filterCat===c ? '#fff' : 'var(--sub)',
            border: `1.5px solid ${filterCat===c ? 'var(--accent)' : 'var(--border)'}`,
          }}>{c}</button>
        ))}
      </div>

      {/* 아이템 목록 */}
      {sorted.map(item => {
        const diff = getNextDiff(item);
        const interval = calcInterval(item.history || []);
        const { dot, color, label } = statusInfo(diff);
        const lastH = [...(item.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        return (
          <div key={item.id} onClick={() => setDetail(item)} style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 10, cursor: 'pointer', border: '1.5px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</div>
                  {item.category && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 8, padding: '2px 7px', fontWeight: 600 }}>{item.category}</span>}
                </div>
                {interval !== null && <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 3 }}>평균 주기 {interval}일 · 기록 {(item.history || []).length}건</div>}
                {lastH && <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>마지막 구매 {lastH.date}</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 6 }}>{dot} {label}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); setEditItem(item); setForm({ name: item.name, category: item.category||'', memo: item.memo || '' }); setShowItemModal(true); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--accent)', background: 'var(--card)' }}>✎</button>
                <button onClick={e => { e.stopPropagation(); delItem(item.id); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--red-bg)', color: 'var(--red)', background: 'var(--red-bg)' }}>✕</button>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={() => { setEditItem(null); setForm({}); setShowItemModal(true); }} style={{ width: '100%', border: '1.5px dashed var(--accent2)', borderRadius: 14, padding: 14, fontSize: 14, color: 'var(--accent)', background: 'none', cursor: 'pointer', fontWeight: 600 }}>+ 생필품 추가</button>

      {/* 아이템 추가/수정 모달 */}
      {showItemModal && (
        <Modal title={editItem ? '생필품 수정' : '생필품 추가'} onClose={() => { setShowItemModal(false); setEditItem(null); setForm({}); }}>
          <div style={{ marginBottom: 14 }}><label style={lbl}>이름 *</label><input style={inp} placeholder="샴푸, 세제 등" value={form.name || ''} onChange={e => F('name', e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>카테고리</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEFAULT_CATEGORIES.map(c => (
                <button key={c} onClick={() => F('category', form.category===c ? '' : c)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: form.category===c ? 'var(--accent)' : 'var(--bg)',
                  color: form.category===c ? '#fff' : 'var(--sub)',
                  border: `1.5px solid ${form.category===c ? 'var(--accent)' : 'var(--border)'}`,
                }}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>메모</label><input style={inp} placeholder="참고 사항" value={form.memo || ''} onChange={e => F('memo', e.target.value)} /></div>
          <p style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 14 }}>💡 구매 주기는 기록 2건 이상 시 자동 계산됩니다</p>
          <SaveBtn onClick={saveItem} />
        </Modal>
      )}

      {detailItem && (
        <ItemDetail
          item={detailItem}
          onClose={() => setDetail(null)}
          onAddHistory={entry => addHistory(detailItem.id, entry)}
          onEditHistory={entry => editHistory(detailItem.id, entry)}
          onDelHistory={hId => delHistory(detailItem.id, hId)}
        />
      )}
    </div>
  );
}

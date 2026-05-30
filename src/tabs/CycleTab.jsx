import { useState } from 'react';
import { uid, fmt, calcInterval, getNextDiff } from '../utils/helpers';
import { Card, Modal, SaveBtn } from '../components/UI';

const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none' };

function statusInfo(diff) {
  if (diff === null) return { dot: '⚪', color: 'var(--sub)', label: '기록 2건 이상 시 자동계산' };
  if (diff < 0)  return { dot: '🔴', color: 'var(--red)', label: `${Math.abs(diff)}일 지남` };
  if (diff <= 3) return { dot: '🔴', color: 'var(--red)', label: diff===0?'오늘 구매 필요!':'구매 필요' };
  if (diff <= 10)return { dot: '🟡', color: 'var(--yellow)', label: `${diff}일 후 구매` };
  return { dot: '🟢', color: 'var(--green)', label: `${diff}일 후 구매` };
}

export default function CycleTab({ data, setData }) {
  const items = data || [];
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState(null); // 'item'|'history'
  const [editItem, setEditItem] = useState(null);
  const [editHist, setEditHist] = useState(null);
  const [form, setForm] = useState({});
  const [hForm, setHForm] = useState({});
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const HF = (k, v) => setHForm(p => ({ ...p, [k]: v }));

  const saveItem = () => {
    if (!form.name?.trim()) return;
    if (editItem) {
      setData(p => p.map(e => e.id===editItem.id ? { ...e, name:form.name.trim(), memo:form.memo||'' } : e));
    } else {
      setData(p => [...p, { id:uid(), name:form.name.trim(), memo:form.memo||'', history:[] }]);
    }
    setModal(null); setEditItem(null); setForm({});
  };

  const delItem = id => {
    setData(p => p.filter(e => e.id!==id));
    setDetail(null);
  };

  const saveHistory = () => {
    if (!hForm.date || !hForm.totalAmount) return;
    const entry = {
      id: editHist?.id || uid(),
      date: hForm.date,
      totalAmount: Number(String(hForm.totalAmount).replace(/[^0-9]/g,'')),
      qty: Number(hForm.qty)||1,
      unit: hForm.unit||'개',
      store: hForm.store||'',
      memo: hForm.memo||'',
    };
    setData(p => p.map(e => {
      if (e.id !== detail.id) return e;
      let history;
      if (editHist) history = (e.history||[]).map(h => h.id===editHist.id ? entry : h);
      else history = [...(e.history||[]), entry];
      const updated = { ...e, history };
      setDetail(updated);
      return updated;
    }));
    setModal(null); setEditHist(null); setHForm({});
  };

  const delHistory = hId => {
    setData(p => p.map(e => {
      if (e.id !== detail.id) return e;
      const updated = { ...e, history: (e.history||[]).filter(h=>h.id!==hId) };
      setDetail(updated);
      return updated;
    }));
  };

  const sorted = [...items].sort((a, b) => {
    const da = getNextDiff(a), db = getNextDiff(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  }).filter(e => !search || e.name.includes(search));

  const detailItem = detail ? (items.find(e=>e.id===detail.id)||detail) : null;

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>🔄 생필품 트래커</div>

      {/* Search */}
      <input style={{ ...inp, marginBottom: 16 }} placeholder="🔍 생필품 검색" value={search} onChange={e=>setSearch(e.target.value)} />

      {/* Items */}
      {sorted.map(item => {
        const diff = getNextDiff(item);
        const interval = calcInterval(item.history||[]);
        const { dot, color, label } = statusInfo(diff);
        const lastH = (item.history||[]).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];

        return (
          <div key={item.id} onClick={() => setDetail(item)} style={{ background:'var(--card)', borderRadius:16, padding:16, marginBottom:10, boxShadow:'0 2px 12px rgba(124,92,191,0.08)', cursor:'pointer', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{item.name}</div>
                {item.memo && <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{item.memo}</div>}
                {interval!==null && <div style={{ fontSize:10, color:'var(--sub)', marginTop:3 }}>평균 주기 {interval}일 · 기록 {(item.history||[]).length}건</div>}
                {lastH && <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>마지막 구매 {lastH.date}</div>}
                <div style={{ fontSize:12, fontWeight:700, color, marginTop:6 }}>{dot} {label}</div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={e=>{e.stopPropagation();setEditItem(item);setForm({name:item.name,memo:item.memo||''});setModal('item');}} style={{ fontSize:12, padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)', color:'var(--accent)', background:'var(--card)' }}>✎</button>
                <button onClick={e=>{e.stopPropagation();delItem(item.id);}} style={{ fontSize:12, padding:'5px 10px', borderRadius:8, border:'1px solid var(--red-bg)', color:'var(--red)', background:'var(--red-bg)' }}>✕</button>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={()=>{setEditItem(null);setForm({});setModal('item');}} style={{ width:'100%', border:'1.5px dashed var(--accent2)', borderRadius:14, padding:14, fontSize:14, color:'var(--accent)', background:'none', cursor:'pointer', fontWeight:600 }}>+ 생필품 추가</button>

      {/* Item add/edit modal */}
      {modal==='item' && (
        <Modal title={`${editItem?'수정':'생필품 추가'}`} onClose={()=>{setModal(null);setEditItem(null);setForm({});}}>
          <div style={{ marginBottom:14 }}><label style={lbl}>이름 *</label><input style={inp} placeholder="샴푸, 세제 등" value={form.name||''} onChange={e=>F('name',e.target.value)} /></div>
          <div style={{ marginBottom:14 }}><label style={lbl}>메모</label><input style={inp} placeholder="참고 사항" value={form.memo||''} onChange={e=>F('memo',e.target.value)} /></div>
          <p style={{ fontSize:11, color:'var(--sub)', marginBottom:14 }}>💡 구매 주기는 기록 2건 이상 시 자동 계산됩니다</p>
          <SaveBtn onClick={saveItem} />
        </Modal>
      )}

      {/* History add/edit modal */}
      {modal==='history' && (
        <Modal title={`구매 기록 ${editHist?'수정':'추가'}`} onClose={()=>{setModal(null);setEditHist(null);setHForm({});}}>
          <div style={{ marginBottom:14 }}><label style={lbl}>날짜 *</label><input style={inp} type="date" value={hForm.date||today} onChange={e=>HF('date',e.target.value)} /></div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <div style={{ flex:2 }}><label style={lbl}>총 금액 *</label><input style={inp} inputMode="numeric" placeholder="0" value={hForm.totalAmount ? Number(hForm.totalAmount).toLocaleString('ko-KR') : ''} onChange={e=>HF('totalAmount',e.target.value.replace(/[^0-9]/g,''))} /></div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <div style={{ flex:1 }}><label style={lbl}>수량 *</label><input style={inp} inputMode="numeric" placeholder="1" value={hForm.qty||''} onChange={e=>HF('qty',e.target.value)} /></div>
            <div style={{ flex:1 }}><label style={lbl}>단위</label><input style={inp} placeholder="개" value={hForm.unit||'개'} onChange={e=>HF('unit',e.target.value)} /></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={lbl}>구매처</label><input style={inp} placeholder="쿠팡, 이마트 등" value={hForm.store||''} onChange={e=>HF('store',e.target.value)} /></div>
          <div style={{ marginBottom:14 }}><label style={lbl}>메모</label><input style={inp} value={hForm.memo||''} onChange={e=>HF('memo',e.target.value)} /></div>
          <SaveBtn onClick={saveHistory} disabled={!hForm.date||!hForm.totalAmount} />
        </Modal>
      )}

      {/* Detail sheet */}
      {detailItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,20,40,0.5)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setDetail(null)}>
          <div style={{ background:'var(--card)', borderRadius:'22px 22px 0 0', padding:'20px 20px 40px', width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>{detailItem.name}</div>
                {calcInterval(detailItem.history||[])!==null && <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>평균 주기 {calcInterval(detailItem.history||[])}일</div>}
              </div>
              <button onClick={()=>setDetail(null)} style={{ fontSize:22, color:'var(--sub)', padding:4 }}>×</button>
            </div>

            <button onClick={()=>{setHForm({date:today,unit:'개'});setEditHist(null);setModal('history');}} style={{ width:'100%', borderRadius:12, padding:'12px', background:'var(--accent)', color:'#fff', fontWeight:700, fontSize:14, marginBottom:16 }}>+ 구매 기록 추가</button>

            {/* History list */}
            {(detailItem.history||[]).length===0
              ? <div style={{ textAlign:'center', color:'var(--sub)', padding:'20px 0', fontSize:13 }}>구매 기록이 없어요</div>
              : [...(detailItem.history||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((h, i, arr) => {
                  const unitPrice = h.qty ? Math.round(h.totalAmount/h.qty) : null;
                  const allPrices = arr.filter(x=>x.qty).map(x=>Math.round(x.totalAmount/x.qty));
                  const minPrice = Math.min(...allPrices);
                  const isMin = unitPrice===minPrice && allPrices.length>1;
                  return (
                    <div key={h.id} style={{ background:'var(--bg)', borderRadius:12, padding:'12px 14px', marginBottom:8, border:`1px solid ${isMin?'var(--green)':'var(--border)'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700 }}>{h.date} {isMin && <span style={{ fontSize:11,color:'var(--green)',fontWeight:700 }}>🏆 최저가</span>}</div>
                          <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>{fmt(h.totalAmount)}원 / {h.qty}{h.unit}</div>
                          {unitPrice && <div style={{ fontSize:11, color:'var(--accent)', marginTop:2 }}>{h.unit}당 {fmt(unitPrice)}원</div>}
                          {h.store && <div style={{ fontSize:11, color:'var(--sub)', marginTop:1 }}>📍 {h.store}</div>}
                          {h.memo && <div style={{ fontSize:11, color:'var(--sub)', marginTop:1 }}>{h.memo}</div>}
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>{setEditHist(h);setHForm({...h});setModal('history');}} style={{ fontSize:11, padding:'4px 8px', borderRadius:7, border:'1px solid var(--border)', color:'var(--accent)' }}>✎</button>
                          <button onClick={()=>delHistory(h.id)} style={{ fontSize:11, padding:'4px 8px', borderRadius:7, border:'1px solid var(--red-bg)', color:'var(--red)' }}>✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

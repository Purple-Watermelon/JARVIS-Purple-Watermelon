import { useState, useMemo } from 'react';
import { uid, toYM, toDay, fmt, parseAmount, fmtAmount, DEFAULT_CATS, SAVINGS_SET, PALETTE } from '../utils/helpers';
import { Card, Modal, MonthNav, SaveBtn, AmountInput, DonutChart } from '../components/UI';

const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none' };

export default function LedgerTab({ data, setData, cats, gTags, setGTags, essItems, setEssItems, discReasons, setDiscReasons }) {
  const [subTab, setSubTab] = useState('기록');
  const [ym, setYm] = useState(toYM(new Date().toISOString()));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
  discAmt: '',      // 할인 금액
  discReason: '',   // 할인 이유
});
  const [modalEntry, setModalEntry] = useState(null);
  const [aiResult, setAiResult] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);

  const entries = data || [];
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const monthEntries = useMemo(() => entries.filter(e => toYM(e.datetime) === ym), [entries, ym]);

  const totExp = monthEntries.filter(e => !e.isSaving).reduce((s, e) => s + e.amount, 0);
  const totSav = monthEntries.filter(e => e.isSaving).reduce((s, e) => s + e.amount, 0);

  // ── Time helpers ──────────────────────────────────────────────────────
  function nowTime() {
    const d = new Date(), h = d.getHours();
    return { date: d.toISOString().slice(0,10), ampm: h<12?'오전':'오후', hour: h%12||12, min: Math.floor(d.getMinutes()/10)*10 };
  }
  function timeToISO({ date, ampm, hour, min }) {
    let h = Number(hour) % 12;
    if (ampm === '오후') h += 12;
    return `${date}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }
  function dispTime(iso) {
    try {
      const d = new Date(iso), h = d.getHours();
      return `${h<12?'오전':'오후'} ${h%12||12}:${String(Math.floor(d.getMinutes()/10)*10).padStart(2,'0')}`;
    } catch(_) { return ''; }
  }

  // ── Open form ─────────────────────────────────────────────────────────
  const openNew = () => {
    const t = nowTime();
    setForm({ isSaving: false, cat: Object.keys(cats)[0], sub: (Object.values(cats)[0]||[])[0]||'', amount: '', tags: [], timeObj: t, essId: '' });
    setEditId(null); setShowForm(true);
  };
  const openEdit = entry => {
    const { datetime, ...rest } = entry;
    const d = new Date(datetime), h = d.getHours();
    setForm({ ...rest, timeObj: { date: datetime.slice(0,10), ampm: h<12?'오전':'오후', hour: h%12||12, min: Math.floor(d.getMinutes()/10)*10 } });
    setEditId(entry.id); setShowForm(true); setModalEntry(null);
  };

  const save = () => {
    if (!form.amount || !form.cat) return;
    const datetime = timeToISO(form.timeObj || nowTime());
    const entry = {
      id: editId || uid(),
      datetime,
      isSaving: !!form.isSaving,
      cat: form.cat,
      sub: form.sub || '',
      name: form.name || form.sub || form.cat,
      amount: Number(form.amount) || 0,
      discAmt: Number(form.discAmt) || 0,
      discReason: form.discReason || '',
      tags: form.tags || [],
      memo: form.memo || '',
      essId: form.essId || '',
      essQty: form.essQty || '',
      essUnit: form.essUnit || '개',
    };
    setData(p => {
      if (editId) return p.map(e => e.id === editId ? entry : e);
      return [entry, ...p];
    });
    // Sync to essentials if linked
    if (form.essId) {
      setEssItems(p => p.map(e => {
        if (e.id !== form.essId) return e;
        const histEntry = { id: uid(), date: datetime.slice(0,10), totalAmount: Number(form.amount), qty: Number(form.essQty)||1, unit: form.essUnit||'개', memo: form.memo||'' };
        return { ...e, history: [...(e.history||[]), histEntry] };
      }));
    }
    setShowForm(false); setEditId(null); setForm({});
  };

  const del = id => { setData(p => p.filter(e => e.id !== id)); setModalEntry(null); };

  // Discount calculator state
  const [disc, setDisc] = useState({ price: '', pct: '', reason: '' });
  const discResult = disc.price && disc.pct ? Math.round(parseAmount(disc.price) * (1 - Number(disc.pct) / 100)) : null;

  // ── AI Analysis ────────────────────────────────────────────────────────
  const analyzeAI = async () => {
    if (!monthEntries.length) return;
    setAiLoading(true);
    const summary = monthEntries.map(e =>
      `${toDay(e.datetime)} ${e.cat}/${e.sub} ${e.name||''} ${e.amount}원${e.isSaving?' (저축)':''}${e.tags?.length?' ['+e.tags.join(',')+']':''}`
    ).join('\n');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: `${ym} 가계부. 총 지출 ${totExp.toLocaleString()}원, 저축 ${totSav.toLocaleString()}원.\n\n${summary}\n\n아래 4가지를 반말로 분석해줘:\n1. 소비 패턴 분석 (2~3문장)\n2. 큰 지출 TOP 3 (금액 포함)\n3. 절약 포인트 2가지\n4. 다음 달 목표 1가지\n이모지 써서 읽기 쉽게.` }]
        })
      });
      const d = await res.json();
      setAiResult(p => ({ ...p, [ym]: d.content?.[0]?.text || '분석 실패' }));
    } catch(_) { setAiResult(p => ({ ...p, [ym]: 'API 호출 실패. 다시 시도해봐.' })); }
    setAiLoading(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  const expEntries = monthEntries.filter(e => !e.isSaving);
  const totalDisc = monthEntries.reduce((s, e) => s + (e.discAmt||0), 0);
  const byCat = Object.entries(
    expEntries.reduce((acc, e) => { acc[e.cat] = (acc[e.cat]||0) + e.amount; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const discByCat = Object.entries(
    monthEntries.filter(e => e.discAmt > 0).reduce((acc, e) => { acc[e.cat] = (acc[e.cat]||0) + (e.discAmt||0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const discByReason = Object.entries(
    monthEntries.filter(e => e.discAmt > 0).reduce((acc, e) => { const r = e.discReason||'기타'; acc[r] = (acc[r]||0) + (e.discAmt||0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const bySub = Object.entries(
    expEntries.reduce((acc, e) => { acc[e.sub||e.cat] = (acc[e.sub||e.cat]||0) + e.amount; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const byTag = Object.entries(
    monthEntries.reduce((acc, e) => {
      (e.tags||[]).forEach(t => {
        if (!acc[t]) acc[t] = { exp: 0, sav: 0, cnt: 0 };
        if (e.isSaving) acc[t].sav += e.amount; else acc[t].exp += e.amount;
        acc[t].cnt++;
      });
      return acc;
    }, {})
  );

  const donutData = [
    ...byCat.slice(0,8).map(([k,v],i) => ({ label: k, value: v, color: PALETTE[i%PALETTE.length] })),
  ];

  const subCats = (cats[form.cat] || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 57, zIndex: 90 }}>
        {['기록','통계','AI 분석'].map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: '11px 0', fontSize: 13,
            fontWeight: subTab===t ? 700 : 400,
            color: subTab===t ? 'var(--accent)' : 'var(--sub)',
            borderBottom: subTab===t ? '2px solid var(--accent)' : '2px solid transparent',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: 16, paddingBottom: 90 }}>
        {/* ── 기록 탭 ── */}
        {subTab === '기록' && (
          <>
            <MonthNav ym={ym} setYm={setYm} />
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>총 지출</div>
                <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 16 }}>{fmt(totExp)}원</div>
              </Card>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>총 저축</div>
                <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 16 }}>{fmt(totSav)}원</div>
              </Card>
            </div>

            {/* Entries */}
            {monthEntries.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--sub)', padding: '40px 0', fontSize: 14 }}>이달 기록이 없어요<br/>아래 버튼으로 추가하세요 💰</div>
              : Object.entries(
                  monthEntries.reduce((acc, e) => {
                    const d = toDay(e.datetime);
                    if (!acc[d]) acc[d] = [];
                    acc[d].push(e);
                    return acc;
                  }, {})
                ).sort((a,b)=>b[0]<a[0]?-1:1).map(([day, list]) => (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginBottom: 6 }}>{day}</div>
                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                      {list.map((e, i) => (
                        <div key={e.id} onClick={() => setModalEntry(e)} style={{
                          display: 'flex', alignItems: 'center', padding: '13px 16px', cursor: 'pointer',
                          borderBottom: i<list.length-1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{e.name||e.sub||e.cat}</div>
                            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>{e.cat} · {e.sub} {dispTime(e.datetime)}</div>
                            {e.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>{e.tags.map(t=><span key={t} style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:'var(--accent-bg)',color:'var(--accent)',fontWeight:700}}>{t}</span>)}</div>}
                            {e.memo && <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 3 }}>{e.memo}</div>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: e.isSaving ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                            {e.isSaving ? '+' : '-'}{fmt(e.amount)}
                          </div>
                        </div>
                      ))}
                    </Card>
                  </div>
                ))
            }

            {/* FAB */}
            <button onClick={openNew} style={{
              position: 'fixed', bottom: 80, right: 20,
              width: 56, height: 56, borderRadius: 28,
              background: 'var(--accent)', color: '#fff',
              fontSize: 28, boxShadow: '0 4px 16px rgba(124,92,191,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            }}>+</button>
          </>
        )}

        {/* ── 통계 탭 ── */}
        {subTab === '통계' && (
          <>
            <MonthNav ym={ym} setYm={setYm} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>총 지출</div>
                <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 15 }}>{fmt(totExp)}원</div>
              </Card>
              <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>총 저축</div>
                <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>{fmt(totSav)}원</div>
              </Card>
            </div>

            {donutData.length > 0 && (
              <Card style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <DonutChart data={donutData} size={160} />
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byCat.map(([cat, amt], i) => (
                    <div key={cat}>
                      <div onClick={() => setSelectedCat(selectedCat===cat ? null : cat)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i%PALETTE.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: selectedCat===cat ? 700 : 400 }}>{cat}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(amt)}원</span>
                        <span style={{ fontSize: 11, color: 'var(--sub)', width: 36, textAlign: 'right' }}>{totExp ? Math.round(amt/totExp*100) : 0}%</span>
                        <span style={{ fontSize: 12, color: 'var(--accent)' }}>{selectedCat===cat ? '▲' : '▶'}</span>
                      </div>
                      {selectedCat===cat && (
                        <div style={{ marginLeft: 18, marginBottom: 8 }}>
                          {Object.entries(
                            expEntries.filter(e=>e.cat===cat).reduce((acc,e)=>{ acc[e.sub||e.cat]=(acc[e.sub||e.cat]||0)+e.amount; return acc; },{})
                          ).sort((a,b)=>b[1]-a[1]).map(([sub, subAmt]) => (
                            <div key={sub}>
                              <div onClick={() => setSelectedSub(selectedSub===sub ? null : sub)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                                <span style={{ color: 'var(--sub)', fontWeight: selectedSub===sub ? 700 : 400 }}>{sub}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600 }}>{fmt(subAmt)}원</span>
                                  <span style={{ fontSize: 11, color: 'var(--accent)' }}>{selectedSub===sub ? '▲' : '▶'}</span>
                                </div>
                              </div>
                              {selectedSub===sub && (
                                <div style={{ marginLeft: 10, marginTop: 4, marginBottom: 4 }}>
                                  {expEntries.filter(e=>e.cat===cat&&(e.sub||e.cat)===sub).sort((a,b)=>new Date(b.datetime)-new Date(a.datetime)).map(e => (
                                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', color: 'var(--sub)' }}>
                                      <span>{toDay(e.datetime)} {e.name||e.sub||e.cat}</span>
                                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmt(e.amount)}원</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {byTag.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>태그별 통계</div>
                {byTag.map(([tag, { exp: e2, sav: sv, cnt }], i) => (
                  <div key={tag} style={{ padding: '10px 0', borderBottom: i<byTag.length-1?'1px solid var(--border)':'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>{tag}</span>
                      <span style={{ fontSize: 12, color: 'var(--sub)' }}>{cnt}건</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                      {e2>0 && <span style={{ color: 'var(--red)' }}>지출 {fmt(e2)}원</span>}
                      {sv>0 && <span style={{ color: 'var(--green)' }}>저축 {fmt(sv)}원</span>}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {totalDisc > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🏷️ 할인 통계</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', marginBottom: 12 }}>총 {fmtAmount(totalDisc)}원 절약!</div>
                {discByCat.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginBottom: 8 }}>카테고리별</div>
                    {discByCat.map(([cat, amt]) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{cat}</span>
                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>-{fmtAmount(amt)}원</span>
                      </div>
                    ))}
                  </div>
                )}
                {discByReason.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginBottom: 8 }}>할인 이유별</div>
                    {discByReason.map(([reason, amt]) => (
                      <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{reason}</span>
                        <span style={{ fontWeight: 700, color: 'var(--green)' }}>-{fmtAmount(amt)}원</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* ── AI 분석 탭 ── */}
        {subTab === 'AI 분석' && (
          <>
            <MonthNav ym={ym} setYm={setYm} />
            <button onClick={analyzeAI} disabled={aiLoading||!monthEntries.length} style={{
              width: '100%', borderRadius: 14, padding: '15px',
              fontWeight: 700, fontSize: 16, marginBottom: 20,
              background: aiLoading||!monthEntries.length ? 'var(--border)' : 'var(--accent)',
              color: aiLoading||!monthEntries.length ? 'var(--sub)' : '#fff',
            }}>{aiLoading ? '분석 중... 🤔' : aiResult[ym] ? '✨ 다시 분석' : '✨ AI 소비 분석 시작'}</button>
            {aiResult[ym] && <Card style={{ lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>{aiResult[ym]}</Card>}
            {!aiResult[ym] && !aiLoading && <div style={{ textAlign: 'center', color: 'var(--sub)', marginTop: 40, lineHeight: 2, fontSize: 14 }}>버튼을 누르면 AI가<br/>이번 달 소비를 분석해줄게요 💡</div>}
          </>
        )}
      </div>

      {/* Entry Detail Modal */}
      {modalEntry && (
        <Modal title="상세 내역" onClose={() => setModalEntry(null)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{modalEntry.name||modalEntry.sub||modalEntry.cat}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: modalEntry.isSaving?'var(--green)':'var(--red)' }}>{modalEntry.isSaving?'+':'-'}{fmt(modalEntry.amount)}원</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 2 }}>
            <div>카테고리: {modalEntry.cat} {modalEntry.sub && `· ${modalEntry.sub}`}</div>
            <div>일시: {dispTime(modalEntry.datetime)}</div>
            {modalEntry.tags?.length>0 && <div>태그: {modalEntry.tags.join(', ')}</div>}
            {modalEntry.memo && <div>메모: {modalEntry.memo}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => openEdit(modalEntry)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>수정</button>
            <button onClick={() => del(modalEntry.id)} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--red-bg)', fontWeight: 700, color: 'var(--red)', fontSize: 14 }}>삭제 🗑</button>
          </div>
        </Modal>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal title={editId ? '내역 수정' : '지출·저축 추가'} onClose={() => { setShowForm(false); setEditId(null); setForm({}); }}>
          {/* Saving toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[false, true].map(isSav => (
              <button key={String(isSav)} onClick={() => F('isSaving', isSav)} style={{
                flex: 1, padding: '10px', borderRadius: 10,
                border: `1.5px solid ${form.isSaving===isSav ? 'var(--accent)' : 'var(--border)'}`,
                background: form.isSaving===isSav ? 'var(--accent-bg)' : 'var(--card)',
                color: form.isSaving===isSav ? 'var(--accent)' : 'var(--sub)',
                fontWeight: form.isSaving===isSav ? 700 : 400, fontSize: 14,
              }}>{isSav ? '💚 저축' : '💸 지출'}</button>
            ))}
          </div>

          {/* Category */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>대분류 *</label>
              <select style={inp} value={form.cat||''} onChange={e => { F('cat', e.target.value); F('sub', (cats[e.target.value]||[])[0]||''); }}>
                {Object.keys(cats).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>소분류</label>
              <select style={inp} value={form.sub||''} onChange={e => F('sub', e.target.value)}>
                {subCats.map(s => <option key={s}>{s}</option>)}
                {!subCats.length && <option value="">-</option>}
              </select>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}><label style={lbl}>내역명</label><input style={inp} placeholder="직접 입력 (선택)" value={form.name||''} onChange={e => F('name', e.target.value)} /></div>

          {/* Amount */}
          <div style={{ marginBottom: 14 }}><label style={lbl}>금액 *</label><AmountInput value={form.amount} onChange={v => F('amount', v)} /></div>

          {/* 할인 */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>할인 금액 (선택)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <AmountInput value={form.discAmt} onChange={v => F('discAmt', v)} placeholder="0" />
              <select style={{...inp, flex:1}} value={form.discReason||''} onChange={e => F('discReason', e.target.value)}>
                <option value="">이유 선택</option>
                {(discReasons||[]).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.discAmt > 0 && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6 }}>
                실결제: {fmtAmount((Number(form.amount)||0) - (Number(form.discAmt)||0))}원
              </div>
            )}
          </div>

          {/* Discount calculator */}
          <details style={{ marginBottom: 14 }}>
            <summary style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', marginBottom: 8 }}>🏷️ 할인 계산기</summary>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap:'wrap' }}>
              <AmountInput value={disc.price} onChange={v => setDisc(p=>({...p,price:v}))} placeholder="정가" />
              <input style={{...inp,width:70}} placeholder="%" value={disc.pct} onChange={e => setDisc(p=>({...p,pct:e.target.value}))} inputMode="numeric" />
              <select style={{...inp}} value={disc.reason||''} onChange={e => setDisc(p=>({...p,reason:e.target.value}))}>
                <option value="">할인 이유</option>
                {(discReasons||[]).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {discResult && (
                <button onClick={() => { F('amount', discResult); F('discAmt', parseAmount(disc.price) - discResult); F('discReason', disc.reason); }} style={{ flexShrink:0, padding:'10px 12px', borderRadius:10, background:'var(--accent)', color:'#fff', fontWeight:700, fontSize:13 }}>
                  {fmtAmount(discResult)}원 적용
                </button>
              )}
            </div>
          </details>

{/* Date & Time */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>날짜</label>
            <input style={inp} type="date" value={form.timeObj?.date||new Date().toISOString().slice(0,10)} onChange={e => F('timeObj', {...(form.timeObj||{}), date:e.target.value})} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>시간</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{...inp}} value={form.timeObj?.ampm||'오전'} onChange={e => F('timeObj',{...(form.timeObj||{}),ampm:e.target.value})}>
                <option>오전</option><option>오후</option>
              </select>
              <select style={{...inp}} value={form.timeObj?.hour||9} onChange={e => F('timeObj',{...(form.timeObj||{}),hour:Number(e.target.value)})}>
                {Array.from({length:12},(_,i)=>i+1).map(h=><option key={h}>{h}</option>)}
              </select>
              <select style={{...inp}} value={form.timeObj?.min||0} onChange={e => F('timeObj',{...(form.timeObj||{}),min:Number(e.target.value)})}>
                {[0,10,20,30,40,50].map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>태그</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {gTags.map(t => {
                const sel = (form.tags||[]).includes(t);
                return (
                  <button key={t} onClick={() => F('tags', sel ? (form.tags||[]).filter(x=>x!==t) : [...(form.tags||[]),t])} style={{
                    padding:'5px 12px', borderRadius:20, fontSize:12,
                    background: sel?'var(--accent)':'var(--bg)',
                    color: sel?'#fff':'var(--sub)',
                    border:`1px solid ${sel?'var(--accent)':'var(--border)'}`,
                    fontWeight: sel?700:400,
                  }}>{t}</button>
                );
              })}
            </div>
          </div>

          {/* Ess link */}
          {essItems.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>생필품 연결 (선택)</label>
              <select style={inp} value={form.essId||''} onChange={e => F('essId', e.target.value)}>
                <option value="">연결 안함</option>
                {essItems.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {form.essId && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input style={{...inp, flex:1}} placeholder="수량" inputMode="numeric" value={form.essQty||''} onChange={e => F('essQty', e.target.value)} />
                  <input style={{...inp, width:80}} placeholder="단위(개)" value={form.essUnit||'개'} onChange={e => F('essUnit', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Memo */}
          <div style={{ marginBottom: 14 }}><label style={lbl}>메모</label><textarea style={inp} rows={2} placeholder="참고 사항" value={form.memo||''} onChange={e => F('memo', e.target.value)} /></div>

          <SaveBtn onClick={save} disabled={form.amount===''||form.amount===undefined||!form.cat} />
        </Modal>
      )}
    </div>
  );
}

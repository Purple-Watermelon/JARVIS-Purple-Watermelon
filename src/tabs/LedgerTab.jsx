import { useState, useMemo, useEffect } from 'react';
import { uid, toYM, toDay, fmt, parseAmount, fmtAmount, PALETTE } from '../utils/helpers';
import { Card, Modal, SaveBtn, AmountInput, DonutChart } from '../components/UI';

const lbl = { fontSize: 11, color: 'var(--sub)', display: 'block', marginBottom: 5, fontWeight: 600 };
const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', WebkitAppearance: 'none', boxSizing: 'border-box' };
const GREY = '#c8c0da'; // 미태그·미할인 회색
const DOW = ['일','월','화','수','목','금','토'];

export default function LedgerTab({ data, setData, cats, gTags, setGTags, essItems, setEssItems, discReasons, setDiscReasons }) {
  const [subTab, setSubTab] = useState('기록');
  const [ym, setYm] = useState(toYM(new Date().toISOString()));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [modalEntry, setModalEntry] = useState(null);
  const [aiResult, setAiResult] = useState({});
  const [aiLoading, setAiLoading] = useState(false);

  // 기록 탭: 선택된 날짜
  const todayKey = new Date().toISOString().slice(0,10);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [showMonthPick, setShowMonthPick] = useState(false);

  // 통계 탭: 지출/저축 모드 + 펼쳐진 트리 항목들(Set)
  const [statMode, setStatMode] = useState('exp'); // 'exp' | 'sav'
  const [openKeys, setOpenKeys] = useState(new Set());

  // 탭을 떠나면 트리 초기화 (피드백: 다른 탭 갔다 오면 초기화)
  useEffect(() => {
    if (subTab !== '통계') setOpenKeys(new Set());
  }, [subTab]);

  const entries = data || [];
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleKey = k => setOpenKeys(prev => {
    const n = new Set(prev);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });

  const monthEntries = useMemo(() => entries.filter(e => toYM(e.datetime) === ym), [entries, ym]);
  const totExp = monthEntries.filter(e => !e.isSaving).reduce((s, e) => s + e.amount, 0);
  const totSav = monthEntries.filter(e => e.isSaving).reduce((s, e) => s + e.amount, 0);

  // ── 시간 헬퍼 ──────────────────────────────────────────────────────────
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

  // ── 입력폼 열기 ────────────────────────────────────────────────────────
  const openNew = (dateStr) => {
    const t = nowTime();
    if (dateStr) t.date = dateStr;
    setForm({
      isSaving: false,
      cat: Object.keys(cats)[0],
      sub: (Object.values(cats)[0]||[])[0]||'',
      amount: '', originalAmount: '',
      discReason: '',
      tags: [], timeObj: t,
      essCat: '', essId: '', essQty: '', essUnit: '개', essStore: '',
    });
    setEditId(null); setShowForm(true);
  };
  const openEdit = entry => {
    const { datetime, ...rest } = entry;
    const d = new Date(datetime), h = d.getHours();
    setForm({
      ...rest,
      originalAmount: rest.originalAmount || '',
      essCat: '', // 수정 시엔 생필품 재연결 안 함(기존 history 유지)
      timeObj: { date: datetime.slice(0,10), ampm: h<12?'오전':'오후', hour: h%12||12, min: Math.floor(d.getMinutes()/10)*10 },
    });
    setEditId(entry.id); setShowForm(true); setModalEntry(null);
  };

  // ── 저장 ───────────────────────────────────────────────────────────────
  const save = () => {
    if (!form.amount || !form.cat) return;
    const datetime = timeToISO(form.timeObj || nowTime());
    const amt  = Number(form.amount) || 0;
    const orig = Number(form.originalAmount) || 0;
    // 정가 > 실지출 이면 할인액 자동계산, 아니면 0 (구버전 호환: 기존 discAmt 유지)
    const discAmt = orig > amt ? orig - amt : (editId ? (Number(form.discAmt)||0) : 0);

    const entry = {
      id: editId || uid(),
      datetime,
      isSaving: !!form.isSaving,
      cat: form.cat,
      sub: form.sub || '',
      name: form.name || form.sub || form.cat,
      amount: amt,
      originalAmount: orig || 0,
      discAmt,
      discReason: form.discReason || '',
      tags: form.tags || [],
      memo: form.memo || '',
      essId: form.essId || '',
      essQty: form.essQty || '',
      essUnit: form.essUnit || '개',
      essStore: form.essStore || '',
    };
    setData(p => editId ? p.map(e => e.id === editId ? entry : e) : [entry, ...p]);

    // 생필품 연동: 새 입력일 때만 history 추가
    if (form.essId && !editId) {
      setEssItems(p => p.map(e => {
        if (e.id !== form.essId) return e;
        const histEntry = {
          id: uid(), date: datetime.slice(0,10),
          totalAmount: amt, qty: Number(form.essQty)||1,
          unit: form.essUnit||'개', store: form.essStore||'', memo: form.memo||'',
        };
        return { ...e, history: [...(e.history||[]), histEntry] };
      }));
    }
    setShowForm(false); setEditId(null); setForm({});
  };

  const del = id => { setData(p => p.filter(e => e.id !== id)); setModalEntry(null); };

  // ── AI 분석 ─────────────────────────────────────────────────────────────
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

  // ── 월 이동 ─────────────────────────────────────────────────────────────
  const [yy, mm] = ym.split('-').map(Number);
  const moveMonth = (delta) => {
    const d = new Date(yy, mm-1+delta, 1);
    const nk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    setYm(nk);
    // 선택일을 그 달 1일로
    setSelectedDay(`${nk}-01`);
  };

  // ── 달력용: 날짜별 합계 ─────────────────────────────────────────────────
  const dayTotals = useMemo(() => {
    const map = {};
    monthEntries.forEach(e => {
      const dk = toDay(e.datetime);
      if (!map[dk]) map[dk] = { exp: 0, sav: 0 };
      if (e.isSaving) map[dk].sav += e.amount; else map[dk].exp += e.amount;
    });
    return map;
  }, [monthEntries]);

  // 선택된 날의 기록 (시간순)
  const selectedEntries = monthEntries
    .filter(e => toDay(e.datetime) === selectedDay)
    .sort((a,b) => new Date(a.datetime) - new Date(b.datetime));

  // ── 통계 계산 ───────────────────────────────────────────────────────────
  // 현재 모드(지출/저축)에 해당하는 항목들
  const statEntries = monthEntries.filter(e => statMode==='sav' ? e.isSaving : !e.isSaving);
  const statTotal = statEntries.reduce((s,e) => s + e.amount, 0);

  // 1) 대분류 그래프
  const byCat = Object.entries(
    statEntries.reduce((a,e) => { a[e.cat]=(a[e.cat]||0)+e.amount; return a; }, {})
  ).sort((a,b)=>b[1]-a[1]);

  // 2) 태그별 그래프 (미태그 포함)
  const tagAgg = {};
  let untagged = 0;
  statEntries.forEach(e => {
    if (e.tags?.length) e.tags.forEach(t => { tagAgg[t]=(tagAgg[t]||0)+e.amount; });
    else untagged += e.amount;
  });
  const byTag = Object.entries(tagAgg).sort((a,b)=>b[1]-a[1]);

  // 3) 할인 그래프 (지출 모드일 때만)
  const totalDisc = monthEntries.filter(e=>!e.isSaving).reduce((s,e)=>s+(e.discAmt||0),0);
  const totalPaid = totExp; // 실제 낸 지출
  const discByCat = Object.entries(
    monthEntries.filter(e=>!e.isSaving && e.discAmt>0).reduce((a,e)=>{ a[e.cat]=(a[e.cat]||0)+(e.discAmt||0); return a; },{})
  ).sort((a,b)=>b[1]-a[1]);

  // 도넛 데이터
  const catDonut = byCat.slice(0,8).map(([k,v],i)=>({ label:k, value:v, color:PALETTE[i%PALETTE.length] }));
  const tagDonut = [
    ...byTag.map(([k,v],i)=>({ label:k.replace('#',''), value:v, color:PALETTE[i%PALETTE.length] })),
    ...(untagged>0 ? [{ label:'미태그', value:untagged, color:GREY }] : []),
  ];
  const discDonut = [
    ...(totalDisc>0 ? [{ label:'할인', value:totalDisc, color:'#3dbf6c' }] : []),
    ...(totalPaid>0 ? [{ label:'미할인', value:totalPaid, color:GREY }] : []),
  ];

  // ── 트리 헬퍼: 주어진 항목들을 대분류>소분류>내역으로 펼침 ───────────────
  const renderTree = (treeEntries, prefix) => {
    const grpCat = Object.entries(
      treeEntries.reduce((a,e)=>{ a[e.cat]=(a[e.cat]||0)+e.amount; return a; },{})
    ).sort((a,b)=>b[1]-a[1]);
    const grpTotal = treeEntries.reduce((s,e)=>s+e.amount,0);

    return grpCat.map(([cat, catAmt], ci) => {
      const ck = `${prefix}:cat:${cat}`;
      const catOpen = openKeys.has(ck);
      const catEntries = treeEntries.filter(e=>e.cat===cat);
      const grpSub = Object.entries(
        catEntries.reduce((a,e)=>{ const s=e.sub||e.cat; a[s]=(a[s]||0)+e.amount; return a; },{})
      ).sort((a,b)=>b[1]-a[1]);

      return (
        <div key={ck}>
          {/* 대분류 행 */}
          <div onClick={()=>toggleKey(ck)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ width:10, height:10, borderRadius:3, background:PALETTE[ci%PALETTE.length], flexShrink:0 }} />
            <span style={{ flex:1, fontSize:13, fontWeight: catOpen?700:500 }}>{cat}</span>
            <span style={{ fontSize:13, fontWeight:600 }}>{fmt(catAmt)}원</span>
            <span style={{ fontSize:11, color:'var(--sub)', width:34, textAlign:'right' }}>{grpTotal?Math.round(catAmt/grpTotal*100):0}%</span>
          </div>

          {/* 소분류 */}
          {catOpen && grpSub.map(([sub, subAmt]) => {
            const sk = `${ck}:sub:${sub}`;
            const subOpen = openKeys.has(sk);
            const subEntries = catEntries.filter(e=>(e.sub||e.cat)===sub).sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
            return (
              <div key={sk} style={{ marginLeft:18 }}>
                <div onClick={()=>toggleKey(sk)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, padding:'6px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
                  <span style={{ color:'var(--sub)', fontWeight: subOpen?700:400 }}>{sub}</span>
                  <span style={{ fontWeight:600 }}>{fmt(subAmt)}원</span>
                </div>
                {/* 개별 내역 */}
                {subOpen && (
                  <div style={{ marginLeft:10, marginBottom:4 }}>
                    {subEntries.map(e => (
                      <div key={e.id} onClick={()=>setModalEntry(e)} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'4px 0', color:'var(--sub)', cursor:'pointer' }}>
                        <span>{toDay(e.datetime)} {e.name||e.sub||e.cat}</span>
                        <span style={{ fontWeight:600, color:'var(--text)' }}>{fmt(e.amount)}원</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  };

  const subCats = (cats[form.cat] || []);
  // 생필품 카테고리별 그룹 (2단계 선택용)
  const essByCat = useMemo(() => {
    const m = {};
    (essItems||[]).forEach(e => { const c = e.category||'기타'; (m[c]=m[c]||[]).push(e); });
    return m;
  }, [essItems]);

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      {/* 서브탭 바 */}
      <div style={{ display:'flex', background:'var(--card)', borderBottom:'1px solid var(--border)', position:'sticky', top:57, zIndex:90 }}>
        {['기록','통계','AI 분석'].map(t => (
          <button key={t} onClick={()=>setSubTab(t)} style={{
            flex:1, padding:'11px 0', fontSize:13,
            fontWeight: subTab===t?700:400,
            color: subTab===t?'var(--accent)':'var(--sub)',
            borderBottom: subTab===t?'2px solid var(--accent)':'2px solid transparent',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding:16, paddingBottom:90 }}>

        {/* ━━━━━━━━━━ 기록 탭 ━━━━━━━━━━ */}
        {subTab === '기록' && (
          <>
            {/* 월 네비 */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:14, position:'relative' }}>
              <button onClick={()=>moveMonth(-1)} style={{ fontSize:24, color:'var(--accent)', padding:'2px 10px', background:'none', border:'none', cursor:'pointer' }}>‹</button>
              <button onClick={()=>setShowMonthPick(s=>!s)} style={{ fontWeight:800, fontSize:17, background:'none', border:'none', color:'var(--text)', cursor:'pointer' }}>
                {yy}년 {mm}월 ▾
              </button>
              <button onClick={()=>moveMonth(1)} style={{ fontSize:24, color:'var(--accent)', padding:'2px 10px', background:'none', border:'none', cursor:'pointer' }}>›</button>

              {/* 월 선택 패널 */}
              {showMonthPick && (
                <div style={{ position:'absolute', top:'110%', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:14, padding:14, zIndex:60, boxShadow:'0 8px 24px rgba(124,92,191,0.2)', width:240 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <button onClick={()=>setYm(`${yy-1}-${String(mm).padStart(2,'0')}`)} style={{ fontSize:18, color:'var(--accent)', background:'none', border:'none', cursor:'pointer' }}>‹</button>
                    <b style={{ fontSize:15 }}>{yy}년</b>
                    <button onClick={()=>setYm(`${yy+1}-${String(mm).padStart(2,'0')}`)} style={{ fontSize:18, color:'var(--accent)', background:'none', border:'none', cursor:'pointer' }}>›</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {Array.from({length:12},(_,i)=>i+1).map(M => (
                      <button key={M} onClick={()=>{ setYm(`${yy}-${String(M).padStart(2,'0')}`); setSelectedDay(`${yy}-${String(M).padStart(2,'0')}-01`); setShowMonthPick(false); }} style={{
                        padding:'8px 0', borderRadius:8, fontSize:13,
                        background: M===mm?'var(--accent)':'var(--bg)',
                        color: M===mm?'#fff':'var(--text)',
                        border:'1px solid var(--border)', cursor:'pointer', fontWeight:M===mm?700:400,
                      }}>{M}월</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 합계 카드 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <Card style={{ textAlign:'center', padding:'12px' }}>
                <div style={{ fontSize:11, color:'var(--sub)', marginBottom:4 }}>총 지출</div>
                <div style={{ fontWeight:700, color:'var(--red)', fontSize:16 }}>{fmt(totExp)}원</div>
              </Card>
              <Card style={{ textAlign:'center', padding:'12px' }}>
                <div style={{ fontSize:11, color:'var(--sub)', marginBottom:4 }}>총 저축</div>
                <div style={{ fontWeight:700, color:'var(--green)', fontSize:16 }}>{fmt(totSav)}원</div>
              </Card>
            </div>

            {/* 미니 달력 */}
            <Card style={{ padding:'10px 8px', marginBottom:14 }}>
              {/* 요일 헤더 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
                {DOW.map((d,i)=>(
                  <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, padding:'2px 0', color:i===0?'var(--red)':i===6?'#5b8dee':'var(--sub)' }}>{d}</div>
                ))}
              </div>
              {/* 날짜 그리드 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                {Array(new Date(yy, mm-1, 1).getDay()).fill(null).map((_,i)=><div key={`emp${i}`} />)}
                {Array(new Date(yy, mm, 0).getDate()).fill(null).map((_,i)=>{
                  const day = i+1;
                  const dk = `${ym}-${String(day).padStart(2,'0')}`;
                  const tot = dayTotals[dk];
                  const isSel = dk===selectedDay;
                  const isToday = dk===todayKey;
                  return (
                    <div key={day} onClick={()=>setSelectedDay(dk)} style={{
                      minHeight:46, borderRadius:8, padding:'3px 2px', cursor:'pointer',
                      background: isSel?'var(--accent-bg)':'transparent',
                      border: isToday?'1.5px solid var(--accent)':'1.5px solid transparent',
                      display:'flex', flexDirection:'column', alignItems:'center',
                    }}>
                      <span style={{ fontSize:11, fontWeight:isSel?800:500, color:isSel?'var(--accent)':'var(--text)' }}>{day}</span>
                      {tot?.exp>0 && <span style={{ fontSize:8, color:'var(--red)', lineHeight:1.3, fontWeight:600 }}>-{fmt(tot.exp)}</span>}
                      {tot?.sav>0 && <span style={{ fontSize:8, color:'var(--green)', lineHeight:1.3, fontWeight:600 }}>+{fmt(tot.sav)}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 선택된 날 기록 */}
            <div style={{ fontSize:13, fontWeight:700, marginBottom:8, color:'var(--text)' }}>
              {Number(selectedDay.slice(5,7))}월 {Number(selectedDay.slice(8,10))}일
              <span style={{ fontSize:11, color:'var(--sub)', fontWeight:400, marginLeft:6 }}>{selectedEntries.length}건</span>
            </div>
            {selectedEntries.length === 0
              ? <div style={{ textAlign:'center', color:'var(--sub)', padding:'24px 0', fontSize:13 }}>이 날 기록이 없어요</div>
              : <Card style={{ padding:0, overflow:'hidden', marginBottom:12 }}>
                  {selectedEntries.map((e,i)=>(
                    <div key={e.id} onClick={()=>setModalEntry(e)} style={{ display:'flex', alignItems:'center', padding:'12px 14px', cursor:'pointer', borderBottom:i<selectedEntries.length-1?'1px solid var(--border)':'none' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13.5, fontWeight:600 }}>{e.name||e.sub||e.cat}</div>
                        <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{e.cat} · {e.sub} {dispTime(e.datetime)}</div>
                        {e.tags?.length>0 && <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>{e.tags.map(t=><span key={t} style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:'var(--accent-bg)',color:'var(--accent)',fontWeight:700}}>{t}</span>)}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:e.isSaving?'var(--green)':'var(--red)' }}>{e.isSaving?'+':'-'}{fmt(e.amount)}</div>
                        {e.discAmt>0 && <div style={{ fontSize:10, color:'var(--green)' }}>🏷️-{fmt(e.discAmt)}</div>}
                      </div>
                    </div>
                  ))}
                </Card>
            }

            {/* 이 날에 추가 */}
            <button onClick={()=>openNew(selectedDay)} style={{
              width:'100%', padding:'13px', borderRadius:14, border:'1.5px dashed var(--accent)',
              background:'var(--accent-bg)', color:'var(--accent)', fontWeight:700, fontSize:14, cursor:'pointer',
            }}>+ 이 날에 추가하기</button>
          </>
        )}

        {/* ━━━━━━━━━━ 통계 탭 ━━━━━━━━━━ */}
        {subTab === '통계' && (
          <>
            {/* 월 네비 (간단) */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:14 }}>
              <button onClick={()=>moveMonth(-1)} style={{ fontSize:24, color:'var(--accent)', padding:'2px 10px', background:'none', border:'none', cursor:'pointer' }}>‹</button>
              <b style={{ fontSize:17 }}>{yy}년 {mm}월</b>
              <button onClick={()=>moveMonth(1)} style={{ fontSize:24, color:'var(--accent)', padding:'2px 10px', background:'none', border:'none', cursor:'pointer' }}>›</button>
            </div>

            {/* 지출/저축 토글 */}
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[['exp','💸 지출',totExp,'var(--red)'],['sav','💚 저축',totSav,'var(--green)']].map(([mode,label,val,col])=>(
                <button key={mode} onClick={()=>{ setStatMode(mode); setOpenKeys(new Set()); }} style={{
                  flex:1, padding:'12px', borderRadius:12,
                  border:`1.5px solid ${statMode===mode?col:'var(--border)'}`,
                  background: statMode===mode?(mode==='exp'?'var(--red-bg)':'rgba(61,191,108,0.12)'):'var(--card)',
                  cursor:'pointer',
                }}>
                  <div style={{ fontSize:12, color:'var(--sub)', marginBottom:2 }}>{label}</div>
                  <div style={{ fontWeight:700, fontSize:15, color: statMode===mode?col:'var(--sub)' }}>{fmt(val)}원</div>
                </button>
              ))}
            </div>

            {statTotal === 0 ? (
              <div style={{ textAlign:'center', color:'var(--sub)', padding:'40px 0', fontSize:14 }}>이달 {statMode==='exp'?'지출':'저축'} 기록이 없어요</div>
            ) : (
              <>
                {/* ① 대분류 그래프 */}
                {catDonut.length>0 && (
                  <Card style={{ marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>📊 대분류별</div>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                      <DonutChart data={catDonut} size={190} showLabels centerLabel={`${fmt(statTotal)}`} centerSub="원" />
                    </div>
                    {renderTree(statEntries, 'g1')}
                  </Card>
                )}

                {/* ② 태그별 그래프 */}
                {tagDonut.length>0 && (
                  <Card style={{ marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>🏷️ 태그별</div>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                      <DonutChart data={tagDonut} size={190} showLabels centerLabel={`${fmt(statTotal)}`} centerSub="원" />
                    </div>
                    {/* 태그별 트리: 태그 누르면 그 태그 항목들의 대분류>소분류>내역 */}
                    {byTag.map(([tag, amt], ti) => {
                      const tk = `g2:tag:${tag}`;
                      const tOpen = openKeys.has(tk);
                      const tagEntries = statEntries.filter(e=>e.tags?.includes(tag));
                      return (
                        <div key={tk}>
                          <div onClick={()=>toggleKey(tk)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ width:10, height:10, borderRadius:3, background:PALETTE[ti%PALETTE.length], flexShrink:0 }} />
                            <span style={{ flex:1, fontSize:13, fontWeight:tOpen?700:500 }}>{tag}</span>
                            <span style={{ fontSize:13, fontWeight:600 }}>{fmt(amt)}원</span>
                            <span style={{ fontSize:11, color:'var(--sub)', width:34, textAlign:'right' }}>{statTotal?Math.round(amt/statTotal*100):0}%</span>
                          </div>
                          {tOpen && <div style={{ marginLeft:8 }}>{renderTree(tagEntries, tk)}</div>}
                        </div>
                      );
                    })}
                    {untagged>0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:GREY, flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:13, color:'var(--sub)' }}>미태그</span>
                        <span style={{ fontSize:13, fontWeight:600 }}>{fmt(untagged)}원</span>
                        <span style={{ fontSize:11, color:'var(--sub)', width:34, textAlign:'right' }}>{statTotal?Math.round(untagged/statTotal*100):0}%</span>
                      </div>
                    )}
                  </Card>
                )}

                {/* ③ 할인 그래프 (지출 모드만) */}
                {statMode==='exp' && totalDisc>0 && (
                  <Card style={{ marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>🏷️ 할인 (절약)</div>
                    <div style={{ fontSize:17, fontWeight:800, color:'var(--green)', marginBottom:8 }}>총 {fmt(totalDisc)}원 절약!</div>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                      <DonutChart data={discDonut} size={190} showLabels centerLabel={`${fmt(totalDisc)}`} centerSub="절약" />
                    </div>
                    {/* 할인 트리: 카테고리별 할인액 → 누르면 그 카테고리 할인 내역 */}
                    {discByCat.map(([cat, amt], di) => {
                      const dk = `g3:disc:${cat}`;
                      const dOpen = openKeys.has(dk);
                      const discEntries = monthEntries.filter(e=>!e.isSaving && e.cat===cat && e.discAmt>0).sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
                      return (
                        <div key={dk}>
                          <div onClick={()=>toggleKey(dk)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ width:10, height:10, borderRadius:3, background:PALETTE[di%PALETTE.length], flexShrink:0 }} />
                            <span style={{ flex:1, fontSize:13, fontWeight:dOpen?700:500 }}>{cat}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>-{fmt(amt)}원</span>
                            <span style={{ fontSize:11, color:'var(--sub)', width:34, textAlign:'right' }}>{totalDisc?Math.round(amt/totalDisc*100):0}%</span>
                          </div>
                          {dOpen && (
                            <div style={{ marginLeft:18, marginBottom:4 }}>
                              {discEntries.map(e=>(
                                <div key={e.id} onClick={()=>setModalEntry(e)} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'4px 0', color:'var(--sub)', cursor:'pointer' }}>
                                  <span>{toDay(e.datetime)} {e.name||e.sub||e.cat} {e.discReason?`(${e.discReason})`:''}</span>
                                  <span style={{ fontWeight:600, color:'var(--green)' }}>-{fmt(e.discAmt)}원</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* ━━━━━━━━━━ AI 분석 탭 ━━━━━━━━━━ */}
        {subTab === 'AI 분석' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:14 }}>
              <button onClick={()=>moveMonth(-1)} style={{ fontSize:24, color:'var(--accent)', padding:'2px 10px', background:'none', border:'none', cursor:'pointer' }}>‹</button>
              <b style={{ fontSize:17 }}>{yy}년 {mm}월</b>
              <button onClick={()=>moveMonth(1)} style={{ fontSize:24, color:'var(--accent)', padding:'2px 10px', background:'none', border:'none', cursor:'pointer' }}>›</button>
            </div>
            <button onClick={analyzeAI} disabled={aiLoading||!monthEntries.length} style={{
              width:'100%', borderRadius:14, padding:'15px', fontWeight:700, fontSize:16, marginBottom:20,
              background: aiLoading||!monthEntries.length?'var(--border)':'var(--accent)',
              color: aiLoading||!monthEntries.length?'var(--sub)':'#fff',
            }}>{aiLoading?'분석 중... 🤔':aiResult[ym]?'✨ 다시 분석':'✨ AI 소비 분석 시작'}</button>
            {aiResult[ym] && <Card style={{ lineHeight:1.8, fontSize:14, whiteSpace:'pre-wrap' }}>{aiResult[ym]}</Card>}
            {!aiResult[ym] && !aiLoading && <div style={{ textAlign:'center', color:'var(--sub)', marginTop:40, lineHeight:2, fontSize:14 }}>버튼을 누르면 AI가<br/>이번 달 소비를 분석해줄게요 💡</div>}
          </>
        )}
      </div>

      {/* ━━━━━━━━━━ 상세 모달 ━━━━━━━━━━ */}
      {modalEntry && (
        <Modal title="상세 내역" onClose={()=>setModalEntry(null)}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>{modalEntry.name||modalEntry.sub||modalEntry.cat}</div>
            <div style={{ fontSize:24, fontWeight:800, color:modalEntry.isSaving?'var(--green)':'var(--red)' }}>{modalEntry.isSaving?'+':'-'}{fmt(modalEntry.amount)}원</div>
            {modalEntry.discAmt>0 && (
              <div style={{ fontSize:13, color:'var(--green)', marginTop:4 }}>
                🏷️ {fmt(modalEntry.discAmt)}원 할인{modalEntry.discReason?` (${modalEntry.discReason})`:''}
                {modalEntry.originalAmount>0 && <span style={{ color:'var(--sub)' }}> · 정가 {fmt(modalEntry.originalAmount)}원</span>}
              </div>
            )}
          </div>
          <div style={{ fontSize:13, color:'var(--sub)', lineHeight:2 }}>
            <div>카테고리: {modalEntry.cat} {modalEntry.sub && `· ${modalEntry.sub}`}</div>
            <div>일시: {toDay(modalEntry.datetime)} {dispTime(modalEntry.datetime)}</div>
            {modalEntry.tags?.length>0 && <div>태그: {modalEntry.tags.join(', ')}</div>}
            {modalEntry.essStore && <div>구매처: {modalEntry.essStore}</div>}
            {modalEntry.memo && <div>메모: {modalEntry.memo}</div>}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:20 }}>
            <button onClick={()=>openEdit(modalEntry)} style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid var(--border)', fontWeight:700, color:'var(--accent)', fontSize:14 }}>수정</button>
            <button onClick={()=>del(modalEntry.id)} style={{ flex:1, padding:'12px', borderRadius:12, background:'var(--red-bg)', fontWeight:700, color:'var(--red)', fontSize:14 }}>삭제 🗑</button>
          </div>
        </Modal>
      )}

      {/* ━━━━━━━━━━ 입력 폼 ━━━━━━━━━━ */}
      {showForm && (
        <Modal title={editId?'내역 수정':'지출·저축 추가'} onClose={()=>{ setShowForm(false); setEditId(null); setForm({}); }}>
          {/* 지출/저축 */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[false,true].map(isSav=>(
              <button key={String(isSav)} onClick={()=>F('isSaving',isSav)} style={{
                flex:1, padding:'10px', borderRadius:10,
                border:`1.5px solid ${form.isSaving===isSav?'var(--accent)':'var(--border)'}`,
                background: form.isSaving===isSav?'var(--accent-bg)':'var(--card)',
                color: form.isSaving===isSav?'var(--accent)':'var(--sub)',
                fontWeight: form.isSaving===isSav?700:400, fontSize:14,
              }}>{isSav?'💚 저축':'💸 지출'}</button>
            ))}
          </div>

          {/* 대분류/소분류 */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <label style={lbl}>대분류 *</label>
              <select style={inp} value={form.cat||''} onChange={e=>{ F('cat',e.target.value); F('sub',(cats[e.target.value]||[])[0]||''); }}>
                {Object.keys(cats).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label style={lbl}>소분류</label>
              <select style={inp} value={form.sub||''} onChange={e=>F('sub',e.target.value)}>
                {subCats.map(s=><option key={s}>{s}</option>)}
                {!subCats.length && <option value="">-</option>}
              </select>
            </div>
          </div>

          {/* 내역명 */}
          <div style={{ marginBottom:14 }}><label style={lbl}>내역명</label><input style={inp} placeholder="직접 입력 (선택)" value={form.name||''} onChange={e=>F('name',e.target.value)} /></div>

          {/* 실지출 금액 */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>{form.isSaving?'저축액 *':'실제 지출액 *'}</label>
            <AmountInput value={form.amount} onChange={v=>F('amount',v)} />
          </div>

          {/* 할인: 정가 입력 → 할인액 자동 (지출만) */}
          {!form.isSaving && (
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>정가 (할인 전 금액, 선택)</label>
              <div style={{ display:'flex', gap:8 }}>
                <AmountInput value={form.originalAmount} onChange={v=>F('originalAmount',v)} placeholder="정가 입력" />
                <select style={{...inp, flex:1}} value={form.discReason||''} onChange={e=>F('discReason',e.target.value)}>
                  <option value="">할인 이유</option>
                  {(discReasons||[]).map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {Number(form.originalAmount)>Number(form.amount||0) && (
                <div style={{ fontSize:13, color:'var(--green)', marginTop:6, fontWeight:600 }}>
                  🏷️ {fmt(Number(form.originalAmount)-Number(form.amount||0))}원 할인됨!
                </div>
              )}
            </div>
          )}

          {/* 날짜/시간 */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>날짜</label>
            <input style={inp} type="date" value={form.timeObj?.date||todayKey} onChange={e=>F('timeObj',{...(form.timeObj||{}),date:e.target.value})} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>시간</label>
            <div style={{ display:'flex', gap:8 }}>
              <select style={inp} value={form.timeObj?.ampm||'오전'} onChange={e=>F('timeObj',{...(form.timeObj||{}),ampm:e.target.value})}><option>오전</option><option>오후</option></select>
              <select style={inp} value={form.timeObj?.hour||9} onChange={e=>F('timeObj',{...(form.timeObj||{}),hour:Number(e.target.value)})}>{Array.from({length:12},(_,i)=>i+1).map(h=><option key={h}>{h}</option>)}</select>
              <select style={inp} value={form.timeObj?.min||0} onChange={e=>F('timeObj',{...(form.timeObj||{}),min:Number(e.target.value)})}>{[0,10,20,30,40,50].map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}</select>
            </div>
          </div>

          {/* 태그 */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>태그</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {gTags.map(t=>{
                const sel=(form.tags||[]).includes(t);
                return <button key={t} onClick={()=>F('tags',sel?(form.tags||[]).filter(x=>x!==t):[...(form.tags||[]),t])} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:12,
                  background:sel?'var(--accent)':'var(--bg)', color:sel?'#fff':'var(--sub)',
                  border:`1px solid ${sel?'var(--accent)':'var(--border)'}`, fontWeight:sel?700:400,
                }}>{t}</button>;
              })}
            </div>
          </div>

          {/* 생필품 연동: 카테고리 → 항목 2단계 (새 입력일 때만) */}
          {!editId && (essItems||[]).length>0 && (
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>생필품 연결 (선택)</label>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                {/* 1단계: 카테고리 */}
                <select style={{...inp, flex:1}} value={form.essCat||''} onChange={e=>{ F('essCat',e.target.value); F('essId',''); }}>
                  <option value="">카테고리 선택</option>
                  {Object.keys(essByCat).map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {/* 2단계: 항목 */}
                <select style={{...inp, flex:1}} value={form.essId||''} onChange={e=>F('essId',e.target.value)} disabled={!form.essCat}>
                  <option value="">항목 선택</option>
                  {(essByCat[form.essCat]||[]).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              {form.essId && (
                <div style={{ display:'flex', gap:8 }}>
                  <input style={{...inp, flex:1}} placeholder="수량" inputMode="numeric" value={form.essQty||''} onChange={e=>F('essQty',e.target.value)} />
                  <input style={{...inp, width:70}} placeholder="단위" value={form.essUnit||'개'} onChange={e=>F('essUnit',e.target.value)} />
                  <input style={{...inp, flex:1}} placeholder="구매처" value={form.essStore||''} onChange={e=>F('essStore',e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* 메모 */}
          <div style={{ marginBottom:14 }}><label style={lbl}>메모</label><textarea style={{...inp, resize:'none'}} rows={2} placeholder="참고 사항" value={form.memo||''} onChange={e=>F('memo',e.target.value)} /></div>

          <SaveBtn onClick={save} disabled={!form.amount||!form.cat} />
        </Modal>
      )}
    </div>
  );
}

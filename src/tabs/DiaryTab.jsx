import { useState, useRef, useEffect } from 'react';
import { uid, fmtDate, toKey, Store } from '../utils/helpers';
import { CalendarOverlay, Modal, SaveBtn } from '../components/UI';

const EMOTIONS = [
  { emoji: '🐷❤️', label: '행복' },
  { emoji: '😊', label: '좋음' },
  { emoji: '😐', label: '평범' },
  { emoji: '😢', label: '슬픔' },
  { emoji: '😤', label: '화남' },
  { emoji: '😴', label: '지침' },
];

export default function DiaryTab({ data, setData, saveDiaryEntry, unlocked, setUnlocked }) {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [showCal, setShowCal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const { y, m, day, dow, key } = fmtDate(date);
  const entries = data || {};
  const savedEntry = entries[key] || null;

  const savedPin = Store.get('jarvis-pin');

  // ── 편집용 임시 상태 ────────────────────────────────────────────────
  // 저장 버튼을 누르기 전까지 Firebase에는 반영하지 않는다.
  const [draft, setDraft] = useState({
    title: '',
    emotion: '',
    text: '',
    photos: []
  });

  // 날짜가 바뀌거나 저장된 데이터가 바뀌면 해당 날짜 데이터를 다시 불러온다.
  useEffect(() => {
    const e = entries[key] || null;

    setDraft({
      title: e?.title || '',
      emotion: e?.emotion || '',
      text: e?.text || '',
      photos: (e?.photos || []).map(p => ({
        id: p.id,
        src: p.src,
        comment: p.comment || ''
      })),
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, savedEntry]);

  // ── PIN 잠금 ────────────────────────────────────────────────────────
  const tapPin = d => {
    if (pin.length >= 4) return;

    const next = pin + d;
    setPin(next);

    if (next.length === 4) {
      const sp = Store.get('jarvis-pin');

      if (!sp || next === sp) {
        setTimeout(() => {
          setUnlocked(true);
          setPin('');
        }, 150);
      } else {
        setTimeout(() => {
          setPin('');
          setPinError(true);
          setTimeout(() => setPinError(false), 800);
        }, 300);
      }
    }
  };

  if (!unlocked) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: 20
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📓</div>

        <div style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 6
        }}>
          일기장 잠금
        </div>

        <div style={{
          fontSize: 13,
          color: 'var(--sub)',
          marginBottom: 32
        }}>
          {savedPin
            ? 'PIN을 입력하세요'
            : '처음 사용 시 아무 PIN이나 입력하면 설정돼요'}
        </div>

        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 40
        }}>
          {[0,1,2,3].map(i => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background:
                  pin.length > i
                    ? (pinError ? 'var(--red)' : 'var(--accent)')
                    : 'var(--border)',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,72px)',
          gap: 12
        }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
            <button
              key={i}
              onClick={() =>
                d === '⌫'
                  ? setPin(p => p.slice(0, -1))
                  : d !== ''
                    ? tapPin(String(d))
                    : null
              }
              style={{
                height: 72,
                borderRadius: 16,
                fontSize: d === '⌫' ? 20 : 24,
                fontWeight: 600,
                background: d === '' ? 'transparent' : 'var(--card)',
                color: d === '⌫' ? 'var(--sub)' : 'var(--text)',
                boxShadow:
                  d === ''
                    ? 'none'
                    : '0 2px 8px rgba(124,92,191,0.1)',
                border:
                  d === ''
                    ? 'none'
                    : '1.5px solid var(--border)'
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── 입력 헬퍼 ──────────────────────────────────────────────────────
  const D = (k, v) =>
    setDraft(p => ({
      ...p,
      [k]: v
    }));

  // 사진 압축
  const compressImage = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = e => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const MAX = 1600;

        let { width, height } = img;

        if (width > height && width > MAX) {
          height = height * MAX / width;
          width = MAX;
        } else if (height > MAX) {
          width = width * MAX / height;
          height = MAX;
        }

        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        canvas
          .getContext('2d')
          .drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => resolve(blob || file),
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => resolve(file);

      reader.readAsDataURL(file);
    });

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();

    formData.append('file', file);
    formData.append(
      'upload_preset',
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      throw new Error('사진 업로드에 실패했습니다.');
    }

    return data.secure_url;
  };

  // 사진 선택
  const pickPhotos = (files) => {
    const added = Array.from(files).map(file => ({
      id: uid(),
      file,
      preview: URL.createObjectURL(file),
      comment: '',
    }));

    setDraft(p => ({
      ...p,
      photos: [...p.photos, ...added]
    }));
  };

  // 사진 삭제
  const removeDraftPhoto = (photoId) => {
    if (!window.confirm(
      '이 사진을 삭제하시겠습니까?\n(저장하면 영구 삭제됩니다)'
    )) {
      return;
    }

    setDraft(p => ({
      ...p,
      photos: p.photos.filter(ph => ph.id !== photoId)
    }));
  };

  const setPhotoComment = (photoId, comment) => {
    setDraft(p => ({
      ...p,
      photos: p.photos.map(ph =>
        ph.id === photoId
          ? { ...ph, comment }
          : ph
      )
    }));
  };

  // ── 저장 ────────────────────────────────────────────────────────────
  // 핵심 변경:
  // 기존에는 setData() → App의 전체 diary 저장
  // 이제는 saveDiaryEntry() → 현재 날짜 하나만 Firebase에 저장
  const handleSave = async () => {
    setUploading(true);

    try {
      // 새 사진만 업로드
      const finalPhotos = await Promise.all(
        draft.photos.map(async ph => {
          if (ph.src) {
            return {
              id: ph.id,
              src: ph.src,
              comment: ph.comment || ''
            };
          }

          const compressed = await compressImage(ph.file);
          const url = await uploadToCloudinary(compressed);

          return {
            id: ph.id,
            src: url,
            comment: ph.comment || ''
          };
        })
      );

      const entry = {
        date: key,
        title: draft.title || '',
        emotion: draft.emotion || '',
        text: draft.text || '',
        photos: finalPhotos,
      };

      // ★★★ 가장 중요한 부분 ★★★
      // 전체 diaryData를 저장하지 않고
      // 현재 날짜의 entry만 Firebase에 저장한다.
      await saveDiaryEntry(key, entry);

      alert('저장됐어요! 🐷');

    } catch (err) {
      console.error('Diary 저장 실패:', err);

      alert(
        '저장에 실패했어요.\n\n' +
        '기존 일기는 변경되지 않았어요.\n' +
        '다시 시도해주세요.'
      );
    } finally {
      setUploading(false);
    }
  };

  // 화면에 보일 사진 주소
  const photoSrc = (ph) => ph.src || ph.preview;

  const hasContent =
    draft.title ||
    draft.emotion ||
    draft.text ||
    draft.photos.length > 0;

  return (
    <div style={{
      padding: 16,
      paddingBottom: 90
    }}>

      {/* 업로드 중 */}
      {uploading && (
        <div style={{
          position:'fixed',
          inset:0,
          background:'rgba(0,0,0,0.4)',
          zIndex:500,
          display:'flex',
          alignItems:'center',
          justifyContent:'center'
        }}>
          <div style={{
            background:'var(--card)',
            borderRadius:16,
            padding:'24px 32px',
            textAlign:'center'
          }}>
            <div style={{
              fontSize:32,
              marginBottom:8
            }}>
              💾
            </div>

            <div style={{
              fontSize:14,
              fontWeight:700,
              color:'var(--text)'
            }}>
              저장하는 중...
            </div>

            <div style={{
              fontSize:12,
              color:'var(--sub)',
              marginTop:4
            }}>
              사진 올리는 중이에요 🐷
            </div>
          </div>
        </div>
      )}

      {/* 날짜 헤더 */}
      <div style={{
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        marginBottom:16
      }}>
        <button
          onClick={() => setDate(d => {
            const n = new Date(d);
            n.setDate(n.getDate() - 1);
            return n;
          })}
          style={{
            fontSize:26,
            color:'var(--accent)',
            padding:'2px 8px',
            background:'none',
            border:'none',
            cursor:'pointer'
          }}
        >
          ‹
        </button>

        <button
          onClick={() => setShowCal(true)}
          style={{
            textAlign:'center',
            flex:1,
            background:'none',
            border:'none',
            cursor:'pointer'
          }}
        >
          <div style={{
            fontSize:26,
            fontWeight:800,
            color:'var(--text)'
          }}>
            {m}월 {day}일
          </div>

          <div style={{
            fontSize:13,
            color:'var(--accent)',
            fontWeight:600,
            marginTop:2
          }}>
            {y} {dow}요일
          </div>
        </button>

        <button
          onClick={() => setDate(d => {
            const n = new Date(d);
            n.setDate(n.getDate() + 1);
            return n;
          })}
          style={{
            fontSize:26,
            color:'var(--accent)',
            padding:'2px 8px',
            background:'none',
            border:'none',
            cursor:'pointer'
          }}
        >
          ›
        </button>
      </div>

      {/* PIN 변경 */}
      <div style={{
        display:'flex',
        justifyContent:'flex-end',
        marginBottom:12
      }}>
        <button
          onClick={() => setShowSetPin(true)}
          style={{
            fontSize:12,
            color:'var(--sub)',
            display:'flex',
            alignItems:'center',
            gap:4,
            background:'none',
            border:'none',
            cursor:'pointer'
          }}
        >
          🔒 PIN 변경
        </button>
      </div>

      {/* 제목 */}
      <input
        value={draft.title}
        onChange={e => D('title', e.target.value)}
        placeholder="제목을 입력하세요"
        style={{
          width:'100%',
          border:'none',
          borderBottom:'2px solid var(--border)',
          background:'transparent',
          color:'var(--text)',
          fontSize:20,
          fontWeight:800,
          padding:'8px 2px',
          marginBottom:18,
          outline:'none',
          boxSizing:'border-box'
        }}
      />

      {/* 감정 */}
      <div style={{ marginBottom:18 }}>
        <div style={{
          fontSize:12,
          color:'var(--sub)',
          marginBottom:8,
          fontWeight:600
        }}>
          오늘의 감정
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gap:8
        }}>
          {EMOTIONS.map(e => (
            <button
              key={e.label}
              onClick={() =>
                D(
                  'emotion',
                  draft.emotion === e.label
                    ? ''
                    : e.label
                )
              }
              style={{
                padding:'10px 6px',
                borderRadius:12,
                textAlign:'center',
                cursor:'pointer',
                border:`2px solid ${
                  draft.emotion === e.label
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
                background:
                  draft.emotion === e.label
                    ? 'var(--accent-bg)'
                    : 'var(--card)'
              }}
            >
              <div style={{ fontSize:22 }}>
                {e.emoji}
              </div>

              <div style={{
                fontSize:11,
                color:
                  draft.emotion === e.label
                    ? 'var(--accent)'
                    : 'var(--sub)',
                marginTop:3,
                fontWeight:
                  draft.emotion === e.label
                    ? 700
                    : 400
              }}>
                {e.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ marginBottom:18 }}>
        <div style={{
          fontSize:12,
          color:'var(--sub)',
          marginBottom:8,
          fontWeight:600
        }}>
          오늘 하루
        </div>

        <textarea
          value={draft.text}
          onChange={e => D('text', e.target.value)}
          placeholder="오늘은 어떤 하루였나요? ✍️"
          style={{
            width:'100%',
            border:'1.5px solid var(--border)',
            borderRadius:12,
            padding:'12px',
            fontSize:14,
            lineHeight:1.8,
            minHeight:150,
            outline:'none',
            background:'var(--card)',
            color:'var(--text)',
            resize:'none',
            boxSizing:'border-box'
          }}
        />
      </div>

      {/* 사진 */}
      {draft.photos.length > 0 && (
        <div style={{
          display:'flex',
          flexDirection:'column',
          gap:12,
          marginBottom:16
        }}>
          {draft.photos.map(photo => (
            <div
              key={photo.id}
              style={{
                position:'relative',
                background:'#fff',
                borderRadius:4,
                padding:'12px 12px 8px',
                boxShadow:'0 4px 16px rgba(0,0,0,0.12)'
              }}
            >
              <button
                onClick={() => removeDraftPhoto(photo.id)}
                style={{
                  position:'absolute',
                  top:6,
                  right:6,
                  zIndex:2,
                  width:26,
                  height:26,
                  borderRadius:'50%',
                  border:'none',
                  background:'rgba(0,0,0,0.55)',
                  color:'#fff',
                  fontSize:15,
                  fontWeight:700,
                  cursor:'pointer',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  lineHeight:1
                }}
              >
                ×
              </button>

              <img
                src={photoSrc(photo)}
                alt=""
                onClick={() => setViewPhoto(photo)}
                style={{
                  width:'100%',
                  aspectRatio:'4/3',
                  objectFit:'cover',
                  borderRadius:2,
                  cursor:'pointer',
                  display:'block'
                }}
              />

              <textarea
                ref={el => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height =
                      el.scrollHeight + 'px';
                  }
                }}
                value={photo.comment || ''}
                onChange={e => {
                  setPhotoComment(
                    photo.id,
                    e.target.value
                  );

                  e.target.style.height = 'auto';
                  e.target.style.height =
                    e.target.scrollHeight + 'px';
                }}
                placeholder="코멘트..."
                rows={1}
                style={{
                  width:'100%',
                  border:'none',
                  outline:'none',
                  fontSize:12,
                  color:'#555',
                  marginTop:8,
                  background:'transparent',
                  textAlign:'center',
                  fontStyle:'italic',
                  resize:'none',
                  fontFamily:'inherit',
                  lineHeight:1.6,
                  boxSizing:'border-box',
                  overflow:'hidden',
                  display:'block'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 사진 추가 */}
      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width:'100%',
          marginBottom:16,
          padding:'12px',
          borderRadius:12,
          border:'1.5px dashed var(--border)',
          color:'var(--sub)',
          fontSize:13,
          background:'none',
          cursor:'pointer'
        }}
      >
        📸 사진 추가
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display:'none' }}
        onChange={e => {
          pickPhotos(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 저장 */}
      <SaveBtn
        onClick={handleSave}
        disabled={!hasContent || uploading}
        label="저장하기"
      />

      {/* 달력 */}
      {showCal && (
        <CalendarOverlay
          current={{ y, m, day }}
          onSelect={setDate}
          onClose={() => setShowCal(false)}
          dotKeys={Object.keys(entries)}
        />
      )}

      {/* 사진 전체화면 */}
      {viewPhoto && (
        <div
          onClick={() => setViewPhoto(null)}
          style={{
            position:'fixed',
            inset:0,
            background:'rgba(0,0,0,0.92)',
            zIndex:400,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            padding:20
          }}
        >
          <img
            src={photoSrc(viewPhoto)}
            alt=""
            style={{
              maxWidth:'100%',
              maxHeight:'80vh',
              borderRadius:8,
              objectFit:'contain'
            }}
          />
        </div>
      )}

      {/* PIN 변경 */}
      {showSetPin && (
        <Modal
          title="🔒 PIN 변경"
          onClose={() => {
            setShowSetPin(false);
            setNewPin('');
            setNewPinConfirm('');
          }}
        >
          <div style={{ marginBottom:12 }}>
            <label style={{
              fontSize:11,
              color:'var(--sub)',
              fontWeight:600,
              display:'block',
              marginBottom:5
            }}>
              새 PIN (4자리)
            </label>

            <input
              style={{
                width:'100%',
                border:'1.5px solid var(--border)',
                borderRadius:10,
                padding:'10px 12px',
                fontSize:14,
                background:'var(--card)',
                outline:'none',
                letterSpacing:8,
                boxSizing:'border-box'
              }}
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              placeholder="••••"
            />
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{
              fontSize:11,
              color:'var(--sub)',
              fontWeight:600,
              display:'block',
              marginBottom:5
            }}>
              PIN 확인
            </label>

            <input
              style={{
                width:'100%',
                border:'1.5px solid var(--border)',
                borderRadius:10,
                padding:'10px 12px',
                fontSize:14,
                background:'var(--card)',
                outline:'none',
                letterSpacing:8,
                boxSizing:'border-box'
              }}
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={newPinConfirm}
              onChange={e => setNewPinConfirm(e.target.value)}
              placeholder="••••"
            />
          </div>

          {newPin &&
            newPinConfirm &&
            newPin !== newPinConfirm && (
              <div style={{
                color:'var(--red)',
                fontSize:12,
                marginBottom:8
              }}>
                PIN이 일치하지 않아요
              </div>
            )}

          <SaveBtn
            onClick={() => {
              if (
                newPin.length === 4 &&
                newPin === newPinConfirm
              ) {
                Store.set(
                  'jarvis-pin',
                  newPin
                );

                setShowSetPin(false);
                setNewPin('');
                setNewPinConfirm('');

                alert('PIN이 변경됐어요!');
              }
            }}
            disabled={
              newPin.length !== 4 ||
              newPin !== newPinConfirm
            }
            label="PIN 저장"
          />
        </Modal>
      )}
    </div>
  );
}

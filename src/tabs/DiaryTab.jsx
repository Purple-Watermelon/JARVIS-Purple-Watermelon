import { useState, useRef, useEffect } from 'react';
import { uid, fmtDate, Store } from '../utils/helpers';
import { CalendarOverlay, Modal, SaveBtn } from '../components/UI';

const EMOTIONS = [
  { emoji: '🐷❤️', label: '행복' },
  { emoji: '😊', label: '좋음' },
  { emoji: '😐', label: '평범' },
  { emoji: '😢', label: '슬픔' },
  { emoji: '😤', label: '화남' },
  { emoji: '😴', label: '지침' },
];

export default function DiaryTab({
  data,
  setData,
  saveDiaryEntry,
  unlocked,
  setUnlocked
}) {
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

  // ============================================================
  // 편집용 임시 상태
  // ============================================================

  const [draft, setDraft] = useState({
    title: '',
    emotion: '',
    text: '',
    photos: []
  });

  // 날짜가 바뀌거나 저장된 데이터가 바뀌면
  // 해당 날짜의 데이터를 다시 불러온다.
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
      }))
    });

    setViewPhoto(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, savedEntry]);

  // ============================================================
  // PIN
  // ============================================================

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

          setTimeout(() => {
            setPinError(false);
          }, 800);
        }, 300);
      }
    }
  };

  // ============================================================
  // 잠금 화면
  // ============================================================

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: '70vh',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: 'var(--accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            marginBottom: 16
          }}
        >
          📓
        </div>

        <div
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 6
          }}
        >
          일기장 잠금
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--sub)',
            textAlign: 'center',
            lineHeight: 1.6,
            marginBottom: 30,
            whiteSpace: 'pre-line'
          }}
        >
          {savedPin
            ? 'PIN 4자리를 입력하세요'
            : '처음 사용 시 아무 PIN이나 입력하면\n그 번호가 PIN으로 설정돼요'}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            marginBottom: 34
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                background:
                  pin.length > i
                    ? pinError
                      ? 'var(--red)'
                      : 'var(--accent)'
                    : 'var(--border)',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,72px)',
            gap: 12
          }}
        >
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
            <button
              key={i}
              onClick={() => {
                if (d === '⌫') {
                  setPin(p => p.slice(0, -1));
                } else if (d !== '') {
                  tapPin(String(d));
                }
              }}
              style={{
                height: 68,
                borderRadius: 16,
                border:
                  d === ''
                    ? 'none'
                    : '1.5px solid var(--border)',
                background:
                  d === ''
                    ? 'transparent'
                    : 'var(--card)',
                color:
                  d === '⌫'
                    ? 'var(--sub)'
                    : 'var(--text)',
                fontSize:
                  d === '⌫'
                    ? 20
                    : 23,
                fontWeight: 600,
                boxShadow:
                  d === ''
                    ? 'none'
                    : '0 2px 8px rgba(124,92,191,0.08)',
                cursor:
                  d === ''
                    ? 'default'
                    : 'pointer'
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // 입력 helper
  // ============================================================

  const D = (k, v) => {
    setDraft(prev => ({
      ...prev,
      [k]: v
    }));
  };

  // ============================================================
  // 이미지 압축
  // ============================================================

  const compressImage = file =>
    new Promise(resolve => {
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

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          blob => resolve(blob || file),
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => resolve(file);

      reader.readAsDataURL(file);
    });

  // ============================================================
  // Cloudinary 업로드
  // ============================================================

  const uploadToCloudinary = async file => {
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
        body: formData
      }
    );

    const result = await res.json();

    if (!res.ok || !result.secure_url) {
      throw new Error(
        result?.error?.message ||
        '사진 업로드에 실패했습니다.'
      );
    }

    return result.secure_url;
  };

  // ============================================================
  // 사진 선택
  // ============================================================

  const pickPhotos = files => {
    if (!files || !files.length) return;

    const added = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: uid(),
        file,
        preview: URL.createObjectURL(file),
        comment: ''
      }));

    setDraft(prev => ({
      ...prev,
      photos: [
        ...prev.photos,
        ...added
      ]
    }));
  };

  // ============================================================
  // 사진 삭제
  // ============================================================

  const removeDraftPhoto = photoId => {
    const target = draft.photos.find(
      ph => ph.id === photoId
    );

    if (!target) return;

    if (
      !window.confirm(
        '이 사진을 삭제하시겠습니까?\n\n저장하면 해당 사진은 일기에서 사라집니다.'
      )
    ) {
      return;
    }

    if (target.preview) {
      URL.revokeObjectURL(target.preview);
    }

    setDraft(prev => ({
      ...prev,
      photos: prev.photos.filter(
        ph => ph.id !== photoId
      )
    }));
  };

  // ============================================================
  // 사진 코멘트
  // ============================================================

  const setPhotoComment = (photoId, comment) => {
    setDraft(prev => ({
      ...prev,
      photos: prev.photos.map(ph =>
        ph.id === photoId
          ? {
              ...ph,
              comment
            }
          : ph
      )
    }));
  };

  // ============================================================
  // 저장
  // ============================================================

  const handleSave = async () => {
    if (uploading) return;

    setUploading(true);

    try {
      const finalPhotos = await Promise.all(
        draft.photos.map(async ph => {

          // 기존 사진
          if (ph.src) {
            return {
              id: ph.id,
              src: ph.src,
              comment: ph.comment || ''
            };
          }

          // 새 사진
          if (!ph.file) {
            return null;
          }

          const compressed =
            await compressImage(ph.file);

          const url =
            await uploadToCloudinary(compressed);

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
        photos: finalPhotos.filter(Boolean)
      };

      // ⭐ 핵심:
      // 전체 diary를 덮어쓰지 않고
      // 현재 날짜 하나만 저장한다.
      await saveDiaryEntry(
        key,
        entry
      );

      alert('저장됐어요! 🐷');

    } catch (err) {
      console.error(
        'Diary 저장 실패:',
        err
      );

      alert(
        '저장에 실패했어요.\n\n' +
        '기존 일기는 변경되지 않았어요.\n' +
        '인터넷 연결을 확인하고 다시 시도해주세요.'
      );

    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // 날짜 이동
  // ============================================================

  const moveDate = amount => {
    const next = new Date(date);

    next.setDate(
      next.getDate() + amount
    );

    setDate(next);
  };

  const goToday = () => {
    setDate(new Date());
  };

  const photoSrc = ph =>
    ph.src || ph.preview;

  const hasContent =
    draft.title.trim() ||
    draft.emotion ||
    draft.text.trim() ||
    draft.photos.length > 0;

  const todayKey =
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

  const isToday = key === todayKey;

  // ============================================================
  // 화면
  // ============================================================

  return (
    <div
      style={{
        padding: 16,
        paddingBottom: 100
      }}
    >

      {/* 저장 중 */}
      {uploading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 18,
              padding: '26px 34px',
              textAlign: 'center',
              boxShadow:
                '0 10px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 8
              }}
            >
              💾
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 800
              }}
            >
              저장하는 중...
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                marginTop: 5
              }}
            >
              사진이 있다면 조금만 기다려주세요 🐷
            </div>
          </div>
        </div>
      )}

      {/* 날짜 */}
      <div
        style={{
          background: 'var(--card)',
          border: '1.5px solid var(--border)',
          borderRadius: 18,
          padding: '12px 10px',
          marginBottom: 14
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center'
          }}
        >

          <button
            onClick={() => moveDate(-1)}
            style={{
              width: 42,
              height: 42,
              border: 'none',
              borderRadius: 12,
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              fontSize: 27,
              cursor: 'pointer'
            }}
          >
            ‹
          </button>

          <button
            onClick={() => setShowCal(true)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--text)',
                lineHeight: 1.2
              }}
            >
              {m}월 {day}일
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--accent)',
                fontWeight: 700,
                marginTop: 4
              }}
            >
              {y} · {dow}요일
            </div>
          </button>

          <button
            onClick={() => moveDate(1)}
            style={{
              width: 42,
              height: 42,
              border: 'none',
              borderRadius: 12,
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              fontSize: 27,
              cursor: 'pointer'
            }}
          >
            ›
          </button>

        </div>

        {!isToday && (
          <button
            onClick={goToday}
            style={{
              display: 'block',
              margin: '8px auto 0',
              border: 'none',
              background: 'none',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            오늘로 돌아가기
          </button>
        )}

        {savedEntry && (
          <div
            style={{
              marginTop: 9,
              textAlign: 'center',
              fontSize: 10,
              color: 'var(--sub)'
            }}
          >
            ● 저장된 일기가 있어요
          </div>
        )}
      </div>

      {/* PIN 변경 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 10
        }}
      >
        <button
          onClick={() => setShowSetPin(true)}
          style={{
            fontSize: 12,
            color: 'var(--sub)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔒 PIN 변경
        </button>
      </div>

      {/* 제목 */}
      <input
        value={draft.title}
        onChange={e =>
          D('title', e.target.value)
        }
        placeholder="오늘의 제목을 적어보세요"
        style={{
          width: '100%',
          border: 'none',
          borderBottom:
            '2px solid var(--border)',
          background: 'transparent',
          color: 'var(--text)',
          fontSize: 21,
          fontWeight: 800,
          padding: '9px 2px',
          marginBottom: 20,
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {/* 감정 */}
      <div
        style={{
          marginBottom: 20
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--sub)',
            marginBottom: 9,
            fontWeight: 700
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent)'
            }}
          />
          오늘의 감정
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3, 1fr)',
            gap: 8
          }}
        >
          {EMOTIONS.map(e => {
            const active =
              draft.emotion === e.label;

            return (
              <button
                key={e.label}
                onClick={() =>
                  D(
                    'emotion',
                    active
                      ? ''
                      : e.label
                  )
                }
                style={{
                  padding:
                    '10px 6px',
                  borderRadius: 13,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border:
                    active
                      ? '2px solid var(--accent)'
                      : '1.5px solid var(--border)',
                  background:
                    active
                      ? 'var(--accent-bg)'
                      : 'var(--card)',
                  transition:
                    'all 0.15s'
                }}
              >
                <div
                  style={{
                    fontSize: 21
                  }}
                >
                  {e.emoji}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      active
                        ? 'var(--accent)'
                        : 'var(--sub)',
                    marginTop: 3,
                    fontWeight:
                      active
                        ? 800
                        : 400
                  }}
                >
                  {e.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 본문 */}
      <div
        style={{
          marginBottom: 20
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--sub)',
            marginBottom: 9,
            fontWeight: 700
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent)'
            }}
          />
          오늘 하루
        </div>

        <textarea
          value={draft.text}
          onChange={e =>
            D('text', e.target.value)
          }
          placeholder="오늘은 어떤 하루였나요? ✍️"
          style={{
            width: '100%',
            border:
              '1.5px solid var(--border)',
            borderRadius: 14,
            padding: 13,
            fontSize: 14,
            lineHeight: 1.85,
            minHeight: 170,
            outline: 'none',
            background: 'var(--card)',
            color: 'var(--text)',
            resize: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* 사진 */}
      {draft.photos.length > 0 && (
        <div
          style={{
            marginBottom: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--sub)',
              marginBottom: 9,
              fontWeight: 700
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent)'
              }}
            />

            오늘의 사진

            <span
              style={{
                fontSize: 10,
                color: 'var(--sub)'
              }}
            >
              {draft.photos.length}장
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            {draft.photos.map(photo => (
              <div
                key={photo.id}
                style={{
                  position: 'relative',
                  background: '#fff',
                  borderRadius: 5,
                  padding:
                    '12px 12px 9px',
                  boxShadow:
                    '0 4px 16px rgba(0,0,0,0.12)'
                }}
              >

                <button
                  onClick={() =>
                    removeDraftPhoto(
                      photo.id
                    )
                  }
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 7,
                    zIndex: 2,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background:
                      'rgba(0,0,0,0.58)',
                    color: '#fff',
                    fontSize: 17,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>

                <img
                  src={photoSrc(photo)}
                  alt=""
                  onClick={() =>
                    setViewPhoto(photo)
                  }
                  style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    objectFit: 'cover',
                    borderRadius: 3,
                    cursor: 'pointer',
                    display: 'block'
                  }}
                />

                <textarea
                  value={
                    photo.comment || ''
                  }
                  onChange={e =>
                    setPhotoComment(
                      photo.id,
                      e.target.value
                    )
                  }
                  placeholder="사진에 코멘트를 남겨보세요..."
                  rows={1}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    color: '#555',
                    marginTop: 8,
                    background:
                      'transparent',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    resize: 'none',
                    fontFamily:
                      'inherit',
                    lineHeight: 1.6,
                    boxSizing:
                      'border-box',
                    overflow: 'hidden',
                    display: 'block'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사진 추가 */}
      <button
        onClick={() =>
          fileRef.current?.click()
        }
        style={{
          width: '100%',
          marginBottom: 16,
          padding: 13,
          borderRadius: 13,
          border:
            '1.5px dashed var(--border)',
          color: 'var(--sub)',
          fontSize: 13,
          background: 'transparent',
          cursor: 'pointer'
        }}
      >
        📸 사진 추가하기
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{
          display: 'none'
        }}
        onChange={e => {
          pickPhotos(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 저장 */}
      <SaveBtn
        onClick={handleSave}
        disabled={
          !hasContent ||
          uploading
        }
        label={
          uploading
            ? '저장하는 중...'
            : '저장하기'
        }
      />

      {/* 달력 */}
      {showCal && (
        <CalendarOverlay
          current={{
            y,
            m,
            day
          }}
          onSelect={setDate}
          onClose={() =>
            setShowCal(false)
          }
          dotKeys={
            Object.keys(entries)
          }
        />
      )}

      {/* 사진 확대 */}
      {viewPhoto && (
        <div
          onClick={() =>
            setViewPhoto(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,0.92)',
            zIndex: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={photoSrc(viewPhoto)}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '82vh',
              borderRadius: 8,
              objectFit: 'contain'
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
          <div
            style={{
              marginBottom: 12
            }}
          >
            <label
              style={{
                fontSize: 11,
                color: 'var(--sub)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 5
              }}
            >
              새 PIN (4자리)
            </label>

            <input
              style={{
                width: '100%',
                border:
                  '1.5px solid var(--border)',
                borderRadius: 10,
                padding:
                  '10px 12px',
                fontSize: 14,
                background:
                  'var(--card)',
                color:
                  'var(--text)',
                outline: 'none',
                letterSpacing: 8,
                boxSizing:
                  'border-box'
              }}
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={newPin}
              onChange={e =>
                setNewPin(
                  e.target.value.replace(
                    /[^0-9]/g,
                    ''
                  )
                )
              }
              placeholder="••••"
            />
          </div>

          <div
            style={{
              marginBottom: 12
            }}
          >
            <label
              style={{
                fontSize: 11,
                color: 'var(--sub)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 5
              }}
            >
              PIN 확인
            </label>

            <input
              style={{
                width: '100%',
                border:
                  '1.5px solid var(--border)',
                borderRadius: 10,
                padding:
                  '10px 12px',
                fontSize: 14,
                background:
                  'var(--card)',
                color:
                  'var(--text)',
                outline: 'none',
                letterSpacing: 8,
                boxSizing:
                  'border-box'
              }}
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={newPinConfirm}
              onChange={e =>
                setNewPinConfirm(
                  e.target.value.replace(
                    /[^0-9]/g,
                    ''
                  )
                )
              }
              placeholder="••••"
            />
          </div>

          {newPin &&
            newPinConfirm &&
            newPin !==
              newPinConfirm && (
              <div
                style={{
                  color:
                    'var(--red)',
                  fontSize: 12,
                  marginBottom: 8
                }}
              >
                PIN이 일치하지 않아요
              </div>
            )}

          <SaveBtn
            onClick={() => {
              if (
                newPin.length === 4 &&
                newPin ===
                  newPinConfirm
              ) {
                Store.set(
                  'jarvis-pin',
                  newPin
                );

                setShowSetPin(false);
                setNewPin('');
                setNewPinConfirm('');

                alert(
                  'PIN이 변경됐어요!'
                );
              }
            }}
            disabled={
              newPin.length !== 4 ||
              newPin !==
                newPinConfirm
            }
            label="PIN 저장"
          />
        </Modal>
      )}
    </div>
  );
}

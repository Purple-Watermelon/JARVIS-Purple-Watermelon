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

const HAND_FONT = "'Gaegu', 'Nanum Pen Script', cursive";
const PAPER_FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

/* ─────────────────────────────────────────
   기존 일기 데이터 → blocks 구조
───────────────────────────────────────── */

const convertLegacyEntry = entry => {
  if (!entry) {
    return {
      title: '',
      emotion: '',
      blocks: [
        {
          id: uid(),
          type: 'text',
          content: '',
        },
      ],
    };
  }

  if (Array.isArray(entry.blocks)) {
    const blocks = entry.blocks.map(block => {
      if (block.type === 'image') {
        return {
          id: block.id || uid(),
          type: 'image',
          src: block.src || '',
          comment: block.comment || '',
        };
      }

      return {
        id: block.id || uid(),
        type: 'text',
        content: block.content || '',
      };
    });

    return {
      title: entry.title || '',
      emotion: entry.emotion || '',
      blocks:
        blocks.length > 0
          ? blocks
          : [
              {
                id: uid(),
                type: 'text',
                content: '',
              },
            ],
    };
  }

  const blocks = [];

  if (entry.text) {
    blocks.push({
      id: uid(),
      type: 'text',
      content: entry.text,
    });
  }

  if (Array.isArray(entry.photos)) {
    entry.photos.forEach(photo => {
      if (!photo?.src) return;

      blocks.push({
        id: photo.id || uid(),
        type: 'image',
        src: photo.src,
        comment: photo.comment || '',
      });
    });
  }

  if (!blocks.length) {
    blocks.push({
      id: uid(),
      type: 'text',
      content: '',
    });
  }

  return {
    title: entry.title || '',
    emotion: entry.emotion || '',
    blocks,
  };
};

/* ─────────────────────────────────────────
   자동 높이
───────────────────────────────────────── */

const resizeTextarea = el => {
  if (!el) return;

  el.style.height = 'auto';
  el.style.height = `${Math.max(42, el.scrollHeight)}px`;
};

/* ─────────────────────────────────────────
   Diary
───────────────────────────────────────── */

export default function DiaryTab({
  data,
  setData,
  saveDiaryEntry,
  unlocked,
  setUnlocked,
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

  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fileRef = useRef(null);
  const pendingPhotoIndex = useRef(null);

  const { y, m, day, dow, key } = fmtDate(date);

  const entries = data || {};
  const savedEntry = entries[key] || null;
  const savedPin = Store.get('jarvis-pin');

  const [draft, setDraft] = useState({
    title: '',
    emotion: '',
    blocks: [],
  });

  /* ─────────────────────────────────────────
     날짜 변경
  ───────────────────────────────────────── */

  useEffect(() => {
    const converted = convertLegacyEntry(entries[key]);

    setDraft(converted);

    /*
      AI 결과는 현재 실제 API 연결 전이므로
      날짜가 바뀌면 임시 결과를 초기화한다.
    */
    setAiReview(null);
  }, [key, savedEntry]);

  /* ─────────────────────────────────────────
     PIN
  ───────────────────────────────────────── */

  const tapPin = digit => {
    if (pin.length >= 4) return;

    const next = pin + digit;
    setPin(next);

    if (next.length !== 4) return;

    const saved = Store.get('jarvis-pin');

    if (!saved || next === saved) {
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
  };

  /* ─────────────────────────────────────────
     PIN 잠금 화면
  ───────────────────────────────────────── */

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg)',
        }}
      >
        <div
          style={{
            fontFamily: HAND_FONT,
            fontSize: 52,
            color: 'var(--accent)',
            marginBottom: 4,
            transform: 'rotate(-3deg)',
          }}
        >
          Dear, me.
        </div>

        <div
          style={{
            fontFamily: HAND_FONT,
            fontSize: 21,
            color: 'var(--text)',
            marginBottom: 8,
          }}
        >
          오늘의 일기
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'var(--sub)',
            marginBottom: 30,
          }}
        >
          {savedPin
            ? '조용히 문을 열어주세요.'
            : '처음이라면 아무 4자리 PIN을 입력해주세요.'}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 15,
            marginBottom: 34,
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background:
                  pin.length > i
                    ? pinError
                      ? 'var(--red)'
                      : 'var(--accent)'
                    : 'var(--border)',
                transition: 'all .2s',
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 72px)',
            gap: 12,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(
            (digit, index) => (
              <button
                key={index}
                onClick={() => {
                  if (digit === '⌫') {
                    setPin(p => p.slice(0, -1));
                  } else if (digit !== '') {
                    tapPin(String(digit));
                  }
                }}
                style={{
                  height: 68,
                  borderRadius: 18,
                  border:
                    digit === ''
                      ? 'none'
                      : '1px solid var(--border)',
                  background:
                    digit === ''
                      ? 'transparent'
                      : 'rgba(255,255,255,.72)',
                  color:
                    digit === '⌫'
                      ? 'var(--sub)'
                      : 'var(--text)',
                  fontSize:
                    digit === '⌫'
                      ? 20
                      : 23,
                  fontWeight: 600,
                  boxShadow:
                    digit === ''
                      ? 'none'
                      : '0 3px 12px rgba(70,50,90,.06)',
                }}
              >
                {digit}
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     Draft
  ───────────────────────────────────────── */

  const updateDraft = changes => {
    setDraft(prev => ({
      ...prev,
      ...changes,
    }));
  };

  const updateTextBlock = (id, content) => {
    setDraft(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === id
          ? {
              ...block,
              content,
            }
          : block
      ),
    }));
  };

  const updateImageComment = (id, comment) => {
    setDraft(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === id
          ? {
              ...block,
              comment,
            }
          : block
      ),
    }));
  };

  /* ─────────────────────────────────────────
     글 블록 추가
  ───────────────────────────────────────── */

  const addTextAfter = index => {
    const newBlock = {
      id: uid(),
      type: 'text',
      content: '',
    };

    setDraft(prev => {
      const blocks = [...prev.blocks];

      blocks.splice(index + 1, 0, newBlock);

      return {
        ...prev,
        blocks,
      };
    });

    setTimeout(() => {
      const el = document.querySelector(
        `[data-block-id="${newBlock.id}"]`
      );

      if (el) {
        el.focus();
        resizeTextarea(el);
      }
    }, 50);
  };

  /* ─────────────────────────────────────────
     사진 위치 선택
  ───────────────────────────────────────── */

  const requestPhotoAt = index => {
    pendingPhotoIndex.current = index;
    fileRef.current?.click();
  };

  /* ─────────────────────────────────────────
     이미지 압축
  ───────────────────────────────────────── */

  const compressImage = file =>
    new Promise(resolve => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = e => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const MAX = 1800;

        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX) {
          height = (height * MAX) / width;
          width = MAX;
        } else if (height > MAX) {
          width = (width * MAX) / height;
          height = MAX;
        }

        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

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
          0.82
        );
      };

      img.onerror = () => resolve(file);

      reader.readAsDataURL(file);
    });

  /* ─────────────────────────────────────────
     Cloudinary
  ───────────────────────────────────────── */

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
        body: formData,
      }
    );

    const result = await res.json();

    if (!res.ok || !result.secure_url) {
      throw new Error(
        '사진 업로드에 실패했습니다.'
      );
    }

    return result.secure_url;
  };

  /* ─────────────────────────────────────────
     사진 추가
  ───────────────────────────────────────── */

  const addPhotos = async files => {
    const selected = Array.from(files || []);

    if (!selected.length) return;

    setUploading(true);

    try {
      const uploaded = [];

      for (const file of selected) {
        const compressed = await compressImage(file);
        const src = await uploadToCloudinary(compressed);

        uploaded.push({
          id: uid(),
          type: 'image',
          src,
          comment: '',
        });
      }

      setDraft(prev => {
        const blocks = [...prev.blocks];

        let insertIndex =
          pendingPhotoIndex.current;

        if (
          insertIndex === null ||
          insertIndex === undefined
        ) {
          insertIndex = blocks.length - 1;
        }

        blocks.splice(
          insertIndex + 1,
          0,
          ...uploaded
        );

        const lastImageIndex =
          insertIndex + uploaded.length;

        const nextBlock = {
          id: uid(),
          type: 'text',
          content: '',
        };

        blocks.splice(
          lastImageIndex + 1,
          0,
          nextBlock
        );

        return {
          ...prev,
          blocks,
        };
      });

      pendingPhotoIndex.current = null;

      setTimeout(() => {
        const textBlocks =
          document.querySelectorAll(
            '[data-block-id]'
          );

        const last =
          textBlocks[textBlocks.length - 1];

        if (last) {
          last.focus();
        }
      }, 80);
    } catch (error) {
      console.error(
        '사진 업로드 실패:',
        error
      );

      alert(
        '사진을 추가하지 못했어요.\n다시 시도해주세요.'
      );
    } finally {
      setUploading(false);
    }
  };

  /* ─────────────────────────────────────────
     사진 삭제
  ───────────────────────────────────────── */

  const removeImageBlock = id => {
    if (
      !window.confirm(
        '이 사진을 삭제할까요?\n저장하면 영구적으로 삭제됩니다.'
      )
    ) {
      return;
    }

    setDraft(prev => {
      const blocks = prev.blocks.filter(
        block => block.id !== id
      );

      const hasText = blocks.some(
        block => block.type === 'text'
      );

      if (!hasText) {
        blocks.push({
          id: uid(),
          type: 'text',
          content: '',
        });
      }

      return {
        ...prev,
        blocks,
      };
    });
  };

  /* ─────────────────────────────────────────
     저장
  ───────────────────────────────────────── */

  const hasContent =
    Boolean(draft.title?.trim()) ||
    Boolean(draft.emotion) ||
    draft.blocks.some(block => {
      if (block.type === 'image') {
        return Boolean(block.src);
      }

      return Boolean(block.content?.trim());
    });

  const handleSave = async () => {
    if (!hasContent) {
      alert('오늘의 기록을 조금만 남겨주세요.');
      return;
    }

    setUploading(true);

    try {
      const blocks = draft.blocks
        .filter(block => {
          if (block.type === 'image') {
            return Boolean(block.src);
          }

          return true;
        })
        .map(block => {
          if (block.type === 'image') {
            return {
              id: block.id,
              type: 'image',
              src: block.src,
              comment: block.comment || '',
            };
          }

          return {
            id: block.id,
            type: 'text',
            content: block.content || '',
          };
        });

      const entry = {
        date: key,
        title: draft.title || '',
        emotion: draft.emotion || '',
        blocks,
      };

      await saveDiaryEntry(key, entry);

      alert('오늘의 페이지를 저장했어요. 🐷');
    } catch (error) {
      console.error(
        'Diary 저장 실패:',
        error
      );

      alert(
        '저장에 실패했어요.\n\n' +
          '기존 일기는 변경되지 않았어요.\n' +
          '다시 시도해주세요.'
      );
    } finally {
      setUploading(false);
    }
  };

  /* ─────────────────────────────────────────
     오늘 마무리
  ───────────────────────────────────────── */

  const handleAiReview = async () => {
    if (!hasContent) {
      alert(
        '먼저 오늘의 기록을 남겨주세요.'
      );
      return;
    }

    setAiLoading(true);

    /*
      현재는 실제 AI 연결 전.
      다음 단계에서 이 부분을 실제 AI 호출로 교체한다.
    */

    setTimeout(() => {
      setAiReview({
        review:
          '오늘의 마무리 기능은 준비되어 있어요.\n\n현재는 AI 연결 전 단계예요. 다음 단계에서 오늘의 일기와 가계부 기록을 함께 읽고, 객관적이지만 따뜻한 하루의 총평을 만들어줄게요.',
        createdAt:
          new Date().toISOString(),
      });

      setAiLoading(false);
    }, 500);
  };

  /* ─────────────────────────────────────────
     날짜 이동
  ───────────────────────────────────────── */

  const moveDate = amount => {
    setDate(prev => {
      const next = new Date(prev);
      next.setDate(
        next.getDate() + amount
      );
      return next;
    });
  };

  /* ─────────────────────────────────────────
     화면
  ───────────────────────────────────────── */

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '16px 13px 110px',
        background: 'var(--bg)',
      }}
    >
      {/* 저장 / 업로드 중 */}
      {uploading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'rgba(35,28,42,.28)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              width: 190,
              padding: '24px 18px',
              borderRadius: 20,
              background: 'var(--card)',
              textAlign: 'center',
              boxShadow:
                '0 15px 45px rgba(30,20,40,.16)',
            }}
          >
            <div
              style={{
                fontFamily: HAND_FONT,
                fontSize: 30,
                marginBottom: 5,
              }}
            >
              잠깐만
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                lineHeight: 1.7,
              }}
            >
              사진과 오늘의 기록을
              <br />
              일기장에 정리하고 있어요.
            </div>
          </div>
        </div>
      )}

      {/* 날짜 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <button
          onClick={() => moveDate(-1)}
          style={{
            width: 40,
            height: 40,
            color: 'var(--accent)',
            fontSize: 28,
          }}
        >
          ‹
        </button>

        <button
          onClick={() => setShowCal(true)}
          style={{
            flex: 1,
            background: 'transparent',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: HAND_FONT,
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1,
              color: 'var(--text)',
            }}
          >
            {m}월 {day}일
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 11,
              color: 'var(--sub)',
              letterSpacing: 1,
            }}
          >
            {y} · {dow}요일
          </div>
        </button>

        <button
          onClick={() => moveDate(1)}
          style={{
            width: 40,
            height: 40,
            color: 'var(--accent)',
            fontSize: 28,
          }}
        >
          ›
        </button>
      </div>

      {/* 작은 상단 장식 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          padding: '0 7px',
        }}
      >
        <div
          style={{
            height: 1,
            flex: 1,
            background:
              'rgba(120,95,135,.15)',
          }}
        />

        <span
          style={{
            fontFamily: HAND_FONT,
            fontSize: 14,
            color: 'var(--sub)',
          }}
        >
          today
        </span>

        <div
          style={{
            height: 1,
            flex: 1,
            background:
              'rgba(120,95,135,.15)',
          }}
        />
      </div>

      {/* PIN */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 8,
        }}
      >
        <button
          onClick={() =>
            setShowSetPin(true)
          }
          style={{
            fontSize: 11,
            color: 'var(--sub)',
          }}
        >
          🔒 PIN 변경
        </button>
      </div>

      {/* ───────────────────────────────
          종이
      ─────────────────────────────── */}

      <div
        style={{
          position: 'relative',
          background:
            'linear-gradient(90deg,#fdfbf7,#fffdf9 4%,#fffdf9 96%,#faf6ee)',
          border:
            '1px solid rgba(115,95,110,.13)',
          borderRadius: 4,
          padding: '25px 21px 32px',
          boxShadow:
            '0 8px 28px rgba(75,55,75,.09)',
          overflow: 'hidden',
        }}
      >
        {/* 종이 질감 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: .35,
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(115,105,125,.055) 32px)',
          }}
        />

        {/* 왼쪽 세로선 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 13,
            width: 1,
            background:
              'rgba(190,100,115,.11)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* 제목 */}
          <input
            value={draft.title}
            onChange={e =>
              updateDraft({
                title: e.target.value,
              })
            }
            placeholder="오늘의 제목"
            style={{
              width: '100%',
              padding: '0 0 8px',
              border: 'none',
              borderBottom:
                '1px solid rgba(120,100,120,.12)',
              borderRadius: 0,
              outline: 'none',
              background: 'transparent',
              color: 'var(--text)',
              fontFamily: HAND_FONT,
              fontSize: 28,
              fontWeight: 700,
            }}
          />

          {/* 기분 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding:
                '10px 0 13px',
              marginBottom: 13,
              borderBottom:
                '1px dashed rgba(120,100,120,.16)',
            }}
          >
            <span
              style={{
                fontFamily: HAND_FONT,
                fontSize: 15,
                color: 'var(--sub)',
                marginRight: 5,
              }}
            >
              오늘은
            </span>

            {EMOTIONS.map(emotion => {
              const selected =
                draft.emotion ===
                emotion.label;

              return (
                <button
                  key={emotion.label}
                  onClick={() =>
                    updateDraft({
                      emotion: selected
                        ? ''
                        : emotion.label,
                    })
                  }
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: '50%',
                    border: selected
                      ? '1px solid var(--accent)'
                      : '1px solid transparent',
                    background: selected
                      ? 'rgba(155,109,221,.10)'
                      : 'transparent',
                    fontSize: 17,
                    transform: selected
                      ? 'scale(1.08)'
                      : 'scale(1)',
                    transition:
                      'all .15s',
                  }}
                >
                  {emotion.emoji}
                </button>
              );
            })}
          </div>

          {/* 블록 */}
          {draft.blocks.map(
            (block, index) => {
              if (block.type === 'text') {
                return (
                  <div
                    key={block.id}
                    style={{
                      position: 'relative',
                      marginBottom: 2,
                    }}
                  >
                    <textarea
                      data-block-id={
                        block.id
                      }
                      value={
                        block.content || ''
                      }
                      rows={1}
                      onChange={e => {
                        updateTextBlock(
                          block.id,
                          e.target.value
                        );
                        resizeTextarea(
                          e.target
                        );
                      }}
                      onFocus={e =>
                        resizeTextarea(
                          e.target
                        )
                      }
                      placeholder={
                        index === 0
                          ? '오늘 있었던 일을 천천히 적어보세요.'
                          : '그리고 또 어떤 일이 있었나요?'
                      }
                      style={{
                        display: 'block',
                        width: '100%',
                        minHeight: 42,
                        padding:
                          '3px 2px 5px',
                        border: 'none',
                        borderRadius: 0,
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        background:
                          'transparent',
                        color:
                          'rgba(48,39,53,.92)',
                        fontFamily: HAND_FONT,
                        fontSize: 19,
                        lineHeight: 1.75,
                        letterSpacing: .2,
                      }}
                    />

                    {/* 블록 도구 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'center',
                        gap: 7,
                        padding:
                          '3px 0 9px',
                        opacity: .55,
                      }}
                    >
                      <button
                        onClick={() =>
                          addTextAfter(index)
                        }
                        style={{
                          padding:
                            '3px 10px',
                          borderRadius: 20,
                          border:
                            '1px solid rgba(120,100,130,.15)',
                          background:
                            'rgba(255,255,255,.45)',
                          color:
                            'var(--sub)',
                          fontFamily:
                            HAND_FONT,
                          fontSize: 14,
                        }}
                      >
                        ＋ 글
                      </button>

                      <button
                        onClick={() =>
                          requestPhotoAt(
                            index
                          )
                        }
                        style={{
                          padding:
                            '3px 10px',
                          borderRadius: 20,
                          border:
                            '1px solid rgba(120,100,130,.15)',
                          background:
                            'rgba(255,255,255,.45)',
                          color:
                            'var(--sub)',
                          fontFamily:
                            HAND_FONT,
                          fontSize: 14,
                        }}
                      >
                        📷 사진
                      </button>
                    </div>
                  </div>
                );
              }

              if (block.type === 'image') {
                if (!block.src) {
                  return null;
                }

                return (
                  <div
                    key={block.id}
                    style={{
                      position:
                        'relative',
                      margin:
                        '12px 4px 13px',
                      padding:
                        '9px 9px 11px',
                      background:
                        '#fffefa',
                      boxShadow:
                        '0 5px 18px rgba(55,45,55,.13)',
                      transform:
                        index % 2 === 0
                          ? 'rotate(-0.45deg)'
                          : 'rotate(0.45deg)',
                    }}
                  >
                    {/* 테이프 느낌 */}
                    <div
                      style={{
                        position:
                          'absolute',
                        top: -7,
                        left: '50%',
                        transform:
                          'translateX(-50%) rotate(-1deg)',
                        width: 58,
                        height: 14,
                        background:
                          'rgba(215,198,170,.48)',
                      }}
                    />

                    <button
                      onClick={() =>
                        removeImageBlock(
                          block.id
                        )
                      }
                      style={{
                        position:
                          'absolute',
                        top: 5,
                        right: 5,
                        width: 24,
                        height: 24,
                        borderRadius:
                          '50%',
                        background:
                          'rgba(35,30,40,.48)',
                        color: '#fff',
                        fontSize: 15,
                        zIndex: 2,
                      }}
                    >
                      ×
                    </button>

                    <img
                      src={block.src}
                      alt=""
                      onClick={() =>
                        setViewPhoto(block)
                      }
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        cursor: 'pointer',
                      }}
                    />

                    <textarea
                      value={
                        block.comment || ''
                      }
                      rows={1}
                      onChange={e => {
                        updateImageComment(
                          block.id,
                          e.target.value
                        );
                        resizeTextarea(
                          e.target
                        );
                      }}
                      onFocus={e =>
                        resizeTextarea(
                          e.target
                        )
                      }
                      placeholder="이 사진에는 어떤 기억이 있나요?"
                      style={{
                        display: 'block',
                        width: '100%',
                        minHeight: 30,
                        marginTop: 7,
                        padding: '1px 2px',
                        border: 'none',
                        borderRadius: 0,
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        background:
                          'transparent',
                        textAlign: 'center',
                        color:
                          'rgba(85,73,85,.85)',
                        fontFamily:
                          HAND_FONT,
                        fontSize: 16,
                        lineHeight: 1.5,
                      }}
                    />

                    {/* 사진 뒤에 글 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'center',
                        gap: 7,
                        marginTop: 3,
                      }}
                    >
                      <button
                        onClick={() =>
                          addTextAfter(index)
                        }
                        style={{
                          padding:
                            '2px 10px',
                          borderRadius: 18,
                          border:
                            '1px solid rgba(120,100,130,.13)',
                          background:
                            'rgba(245,240,235,.65)',
                          color:
                            'var(--sub)',
                          fontFamily:
                            HAND_FONT,
                          fontSize: 13,
                        }}
                      >
                        ＋ 이어쓰기
                      </button>

                      <button
                        onClick={() =>
                          requestPhotoAt(
                            index
                          )
                        }
                        style={{
                          padding:
                            '2px 10px',
                          borderRadius: 18,
                          border:
                            '1px solid rgba(120,100,130,.13)',
                          background:
                            'rgba(245,240,235,.65)',
                          color:
                            'var(--sub)',
                          fontFamily:
                            HAND_FONT,
                          fontSize: 13,
                        }}
                      >
                        📷 또 한 장
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            }
          )}

          {/* 처음부터 사진 */}
          <button
            onClick={() =>
              requestPhotoAt(
                draft.blocks.length - 1
              )
            }
            style={{
              width: '100%',
              marginTop: 5,
              padding: '10px',
              border:
                '1px dashed rgba(120,100,130,.20)',
              borderRadius: 10,
              background:
                'rgba(255,255,255,.35)',
              color: 'var(--sub)',
              fontFamily: HAND_FONT,
              fontSize: 15,
            }}
          >
            📷 사진 한 장 남기기
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              addPhotos(e.target.files);
              e.target.value = '';
            }}
          />

          {/* 페이지 끝 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 22,
              color:
                'rgba(120,100,130,.35)',
              fontFamily: HAND_FONT,
              fontSize: 14,
            }}
          >
            — 끝 —
          </div>
        </div>
      </div>

      {/* 저장 */}
      <div style={{ marginTop: 13 }}>
        <SaveBtn
          onClick={handleSave}
          disabled={!hasContent || uploading}
          label="오늘의 페이지 저장"
        />
      </div>

      {/* ───────────────────────────────
          오늘 마무리
      ─────────────────────────────── */}

      <div
        style={{
          position: 'relative',
          marginTop: 28,
          padding: '21px 19px',
          borderRadius: 5,
          background:
            'rgba(250,247,241,.88)',
          border:
            '1px solid rgba(120,100,130,.13)',
          boxShadow:
            '0 5px 20px rgba(70,55,80,.05)',
        }}
      >
        <div
          style={{
            fontFamily: HAND_FONT,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          오늘의 마무리
        </div>

        <div
          style={{
            marginTop: 2,
            marginBottom: 15,
            fontFamily: HAND_FONT,
            fontSize: 15,
            color: 'var(--sub)',
            lineHeight: 1.5,
          }}
        >
          오늘 하루를 천천히 돌아보는 시간.
        </div>

        {aiReview ? (
          <div
            style={{
              padding: '16px 15px',
              borderRadius: 4,
              background:
                'rgba(255,255,255,.72)',
              border:
                '1px solid rgba(120,100,130,.12)',
            }}
          >
            <div
              style={{
                fontFamily: HAND_FONT,
                fontSize: 17,
                color: 'var(--accent)',
                marginBottom: 7,
              }}
            >
              JARVIS
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: HAND_FONT,
                fontSize: 17,
                lineHeight: 1.7,
                color: 'var(--text)',
              }}
            >
              {aiReview.review}
            </div>
          </div>
        ) : (
          <button
            onClick={handleAiReview}
            disabled={
              aiLoading || !hasContent
            }
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              border:
                '1px solid rgba(120,100,130,.15)',
              background:
                'rgba(255,255,255,.65)',
              color:
                aiLoading || !hasContent
                  ? 'var(--sub)'
                  : 'var(--accent)',
              fontFamily: HAND_FONT,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            {aiLoading
              ? '오늘을 정리하는 중...'
              : '✦ 오늘 마무리하기'}
          </button>
        )}
      </div>

      {/* 캘린더 */}
      {showCal && (
        <CalendarOverlay
          current={{
            y,
            m,
            day,
          }}
          onSelect={setDate}
          onClose={() =>
            setShowCal(false)
          }
          dotKeys={Object.keys(entries)}
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
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 15,
            background:
              'rgba(25,20,30,.93)',
          }}
        >
          <img
            src={viewPhoto.src}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '92vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
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
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--sub)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 5,
              }}
            >
              새 PIN (4자리)
            </label>

            <input
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
              style={{
                width: '100%',
                border:
                  '1.5px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                background: 'var(--card)',
                letterSpacing: 8,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--sub)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 5,
              }}
            >
              PIN 확인
            </label>

            <input
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
              style={{
                width: '100%',
                border:
                  '1.5px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                background: 'var(--card)',
                letterSpacing: 8,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {newPin &&
            newPinConfirm &&
            newPin !== newPinConfirm && (
              <div
                style={{
                  color: 'var(--red)',
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                PIN이 일치하지 않아요.
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

                alert(
                  'PIN이 변경됐어요!'
                );
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

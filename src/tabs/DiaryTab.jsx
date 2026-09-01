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

const EMPTY_ENTRY = {
  title: '',
  emotion: '',
  blocks: [],
};

// ─────────────────────────────────────────────
// 기존 일기 데이터 → 새 blocks 구조
// 기존 데이터는 절대 버리지 않는다.
// ─────────────────────────────────────────────
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

  // 이미 새 구조
  if (Array.isArray(entry.blocks)) {
    const blocks = entry.blocks.map(block => ({
      ...block,
      id: block.id || uid(),
    }));

    if (!blocks.some(block => block.type === 'text')) {
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
  }

  // 예전 text + photos 구조
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
      if (!photo || !photo.src) return;

      blocks.push({
        id: photo.id || uid(),
        type: 'image',
        src: photo.src,
        comment: photo.comment || '',
      });
    });
  }

  if (!blocks.some(block => block.type === 'text')) {
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

  // PIN
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');

  // 저장 / 사진
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // AI
  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { y, m, day, dow, key } = fmtDate(date);

  const entries = data || {};
  const savedEntry = entries[key] || null;
  const savedPin = Store.get('jarvis-pin');

  const [draft, setDraft] = useState(EMPTY_ENTRY);

  // ─────────────────────────────────────────────
  // 날짜 변경
  // ─────────────────────────────────────────────
  useEffect(() => {
    setDraft(convertLegacyEntry(savedEntry));
    setAiReview(null);
  }, [key, savedEntry]);

  // ─────────────────────────────────────────────
  // PIN 입력
  // ─────────────────────────────────────────────
  const tapPin = digit => {
    if (pin.length >= 4) return;

    const next = `${pin}${digit}`;
    setPin(next);
    setPinError(false);

    if (next.length === 4) {
      const stored = Store.get('jarvis-pin');

      setTimeout(() => {
        // 처음 사용하는 경우
        if (!stored) {
          Store.set('jarvis-pin', next);
          setPin('');
          setUnlocked(true);
          return;
        }

        // 기존 PIN과 일치
        if (next === stored) {
          setPin('');
          setUnlocked(true);
          return;
        }

        // 틀린 PIN
        setPin('');
        setPinError(true);

        setTimeout(() => {
          setPinError(false);
        }, 1000);
      }, 180);
    }
  };

  const deletePinDigit = () => {
    setPin(p => p.slice(0, -1));
    setPinError(false);
  };

  // ─────────────────────────────────────────────
  // 잠금 화면
  // ─────────────────────────────────────────────
  if (!unlocked) {
    const keypad = [
      '1', '2', '3',
      '4', '5', '6',
      '7', '8', '9',
      '', '0', '⌫',
    ];

    return (
      <div
        style={{
          minHeight: 'calc(100vh - 90px)',
          padding: '36px 22px 110px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          color: 'var(--text)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            padding: '36px 22px 30px',
            borderRadius: 22,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 35px rgba(70,55,90,0.08)',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: 40,
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            🌷
          </div>

          <div
            style={{
              fontFamily: "'Noto Serif KR','Batang',serif",
              fontSize: 25,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 8,
            }}
          >
            나의 작은 일기장
          </div>

          <div
            style={{
              fontFamily: "'Noto Serif KR','Batang',serif",
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--sub)',
              marginBottom: 28,
            }}
          >
            {savedPin
              ? '소중한 기록을 위해 PIN을 입력해주세요.'
              : '처음이라면 아무 PIN이나 입력해 주세요.'}
          </div>

          {/* PIN 점 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 15,
              marginBottom: 26,
            }}
          >
            {[0, 1, 2, 3].map(index => (
              <div
                key={index}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background:
                    pin.length > index
                      ? pinError
                        ? 'var(--red)'
                        : 'var(--accent)'
                      : 'transparent',
                  border: `1.5px solid ${
                    pinError
                      ? 'var(--red)'
                      : pin.length > index
                        ? 'var(--accent)'
                        : 'var(--border)'
                  }`,
                  boxSizing: 'border-box',
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </div>

          {pinError && (
            <div
              style={{
                height: 22,
                marginBottom: 8,
                color: 'var(--red)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              PIN이 맞지 않아요.
            </div>
          )}

          {!pinError && (
            <div style={{ height: 22, marginBottom: 8 }} />
          )}

          {/* 숫자 키패드 */}
          <div
            style={{
              width: '100%',
              maxWidth: 285,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 11,
            }}
          >
            {keypad.map((digit, index) => {
              const isEmpty = digit === '';
              const isDelete = digit === '⌫';

              return (
                <button
                  key={`${digit}-${index}`}
                  type="button"
                  disabled={isEmpty}
                  onClick={() => {
                    if (isDelete) {
                      deletePinDigit();
                    } else if (!isEmpty) {
                      tapPin(digit);
                    }
                  }}
                  style={{
                    height: 58,
                    borderRadius: 16,
                    border: isEmpty
                      ? 'none'
                      : `1px solid ${
                          isDelete
                            ? 'var(--border)'
                            : 'rgba(124,92,191,0.16)'
                        }`,
                    background: isEmpty
                      ? 'transparent'
                      : isDelete
                        ? 'rgba(124,92,191,0.06)'
                        : 'rgba(255,255,255,0.72)',
                    color: isDelete
                      ? 'var(--sub)'
                      : 'var(--text)',
                    fontSize: isDelete ? 19 : 21,
                    fontWeight: isDelete ? 500 : 600,
                    fontFamily: 'inherit',
                    cursor: isEmpty ? 'default' : 'pointer',
                    boxSizing: 'border-box',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {digit}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Draft 수정
  // ─────────────────────────────────────────────
  const updateDraft = patch => {
    setDraft(prev => ({
      ...prev,
      ...patch,
    }));
  };

  const updateTextBlock = (blockId, content) => {
    setDraft(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId
          ? { ...block, content }
          : block
      ),
    }));
  };

  const updateImageComment = (blockId, comment) => {
    setDraft(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId
          ? { ...block, comment }
          : block
      ),
    }));
  };

  // ─────────────────────────────────────────────
  // 글 뒤에 사진/글 추가
  // ─────────────────────────────────────────────
  const insertPhotoAfterText = blockId => {
    setDraft(prev => {
      const index = prev.blocks.findIndex(
        block => block.id === blockId
      );

      if (index === -1) return prev;

      const imageBlock = {
        id: uid(),
        type: 'image',
        src: '',
        file: null,
        comment: '',
      };

      const textBlock = {
        id: uid(),
        type: 'text',
        content: '',
      };

      const blocks = [...prev.blocks];

      blocks.splice(
        index + 1,
        0,
        imageBlock,
        textBlock
      );

      return {
        ...prev,
        blocks,
      };
    });

    setTimeout(() => {
      fileRef.current?.click();
    }, 50);
  };

  // ─────────────────────────────────────────────
  // 사진 압축
  // ─────────────────────────────────────────────
  const compressImage = file =>
    new Promise(resolve => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = e => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const MAX = 1600;

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

        const context = canvas.getContext('2d');

        if (context) {
          context.drawImage(
            img,
            0,
            0,
            width,
            height
          );
        }

        canvas.toBlob(
          blob => resolve(blob || file),
          'image/jpeg',
          0.82
        );
      };

      img.onerror = () => resolve(file);

      reader.readAsDataURL(file);
    });

  // ─────────────────────────────────────────────
  // Cloudinary 업로드
  // ─────────────────────────────────────────────
  const uploadToCloudinary = async file => {
    const cloudName =
      process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        'Cloudinary 설정이 없습니다.'
      );
    }

    const formData = new FormData();

    formData.append('file', file);
    formData.append(
      'upload_preset',
      uploadPreset
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await response.json();

    if (
      !response.ok ||
      !result.secure_url
    ) {
      throw new Error(
        result?.error?.message ||
        '사진 업로드에 실패했습니다.'
      );
    }

    return result.secure_url;
  };

  // ─────────────────────────────────────────────
  // 사진 추가
  // ─────────────────────────────────────────────
  const addPhotos = async fileList => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const files = Array.from(fileList);

      for (const originalFile of files) {
        const compressed =
          await compressImage(
            originalFile
          );

        const src =
          await uploadToCloudinary(
            compressed
          );

        const imageBlock = {
          id: uid(),
          type: 'image',
          src,
          comment: '',
        };

        const textBlock = {
          id: uid(),
          type: 'text',
          content: '',
        };

        setDraft(prev => ({
          ...prev,
          blocks: [
            ...prev.blocks,
            imageBlock,
            textBlock,
          ],
        }));
      }
    } catch (error) {
      console.error(
        '사진 업로드 실패:',
        error
      );

      alert(
        '사진을 추가하지 못했어요.\n\n' +
        '잠시 후 다시 시도해주세요.'
      );
    } finally {
      setUploading(false);
    }
  };

 // ─────────────────────────────────────────────
// 사진 삭제
// ─────────────────────────────────────────────
const removeImageBlock = blockId => {
  const confirmed = window.confirm(
    '이 사진을 일기에서 삭제할까요?\n\n저장하면 일기에서도 사라져요.'
  );

  if (!confirmed) return;

  setDraft(prev => {
    const imageIndex = prev.blocks.findIndex(
      block => block.id === blockId
    );

    if (imageIndex === -1) {
      return prev;
    }

    const blocks = [...prev.blocks];

    // 사진 삭제
    blocks.splice(imageIndex, 1);

    // 사진 바로 뒤에 자동으로 만들어진
    // 빈 글 입력칸이 있으면 같이 삭제
    const nextBlock = blocks[imageIndex];

    if (
      nextBlock &&
      nextBlock.type === 'text' &&
      !(nextBlock.content || '').trim()
    ) {
      blocks.splice(imageIndex, 1);
    }

    // 글 입력칸이 하나도 없으면 하나만 만들어준다.
    if (
      !blocks.some(
        block => block.type === 'text'
      )
    ) {
      blocks.push({
        id: uid(),
        type: 'text',
        content: ''
      });
    }

    return {
      ...prev,
      blocks
    };
  });
};

  // ─────────────────────────────────────────────
  // 저장
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    const cleanBlocks = draft.blocks
      .filter(block => {
        if (block.type === 'text') {
          return true;
        }

        if (block.type === 'image') {
          return !!block.src;
        }

        return false;
      })
      .map(block => {
        if (block.type === 'text') {
          return {
            id: block.id,
            type: 'text',
            content: block.content || '',
          };
        }

        return {
          id: block.id,
          type: 'image',
          src: block.src,
          comment: block.comment || '',
        };
      });

    const hasRealContent =
      !!draft.title ||
      !!draft.emotion ||
      cleanBlocks.some(block => {
        if (block.type === 'image') {
          return true;
        }

        return !!block.content?.trim();
      });

    if (!hasRealContent) {
      alert(
        '아직 기록한 내용이 없어요.'
      );
      return;
    }

    setUploading(true);

    try {
      const entry = {
        date: key,
        title: draft.title || '',
        emotion: draft.emotion || '',
        blocks: cleanBlocks,
      };

      await saveDiaryEntry(
        key,
        entry
      );

      alert('오늘의 기록을 저장했어요. 🐷');
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

  // ─────────────────────────────────────────────
  // 내용 여부
  // ─────────────────────────────────────────────
  const hasContent =
    !!draft.title ||
    !!draft.emotion ||
    draft.blocks.some(block => {
      if (block.type === 'image') {
        return !!block.src;
      }

      return !!block.content?.trim();
    });

  // ─────────────────────────────────────────────
  // AI
  // 현재는 연결 전 placeholder
  // ─────────────────────────────────────────────
  const handleAiReview = () => {
    if (!hasContent) {
      alert(
        '먼저 오늘의 기록을 남겨주세요.'
      );
      return;
    }

    setAiLoading(true);

    setTimeout(() => {
      setAiReview({
        review:
          '오늘의 마무리 기능은 준비되어 있어요.\n\n현재는 AI 연결 전 단계라 실제 분석은 아직 하지 않아요. 다음 단계에서 오늘의 일기와 가계부 기록을 바탕으로 객관적이지만 따뜻한 총평을 연결할 수 있어요.',
        createdAt:
          new Date().toISOString(),
      });

      setAiLoading(false);
    }, 500);
  };

  // ─────────────────────────────────────────────
  // 날짜 이동
  // ─────────────────────────────────────────────
  const moveDate = amount => {
    setDate(prev => {
      const next = new Date(prev);
      next.setDate(
        next.getDate() + amount
      );
      return next;
    });
  };

  // ─────────────────────────────────────────────
  // 화면
  // ─────────────────────────────────────────────
  return (
    <div
      style={{
        padding: '18px 14px 110px',
        color: 'var(--text)',
        boxSizing: 'border-box',
      }}
    >
      {/* 저장 중 */}
      {uploading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background:
              'rgba(30,24,40,0.35)',
            backdropFilter:
              'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 280,
              background: 'var(--card)',
              borderRadius: 20,
              padding: '28px 22px',
              textAlign: 'center',
              boxShadow:
                '0 15px 45px rgba(40,30,60,0.2)',
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 10,
              }}
            >
              🌷
            </div>

            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              일기장을 정리하고 있어요
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--sub)',
              }}
            >
              사진을 넣고 저장하는 중이에요.
            </div>
          </div>
        </div>
      )}

      {/* 날짜 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => moveDate(-1)}
          style={{
            width: 42,
            height: 42,
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            fontSize: 30,
            cursor: 'pointer',
          }}
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => setShowCal(true)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              fontFamily:
                "'Noto Serif KR','Batang',serif",
              fontSize: 27,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            {m}월 {day}일
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: 'var(--accent)',
              fontWeight: 600,
            }}
          >
            {y} · {dow}요일
          </div>
        </button>

        <button
          type="button"
          onClick={() => moveDate(1)}
          style={{
            width: 42,
            height: 42,
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            fontSize: 30,
            cursor: 'pointer',
          }}
        >
          ›
        </button>
      </div>

      {/* PIN 변경 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setNewPin('');
            setNewPinConfirm('');
            setShowSetPin(true);
          }}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--sub)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          🔒 PIN 변경
        </button>
      </div>

      {/* 종이 일기장 */}
      <div
        style={{
          position: 'relative',
          background: 'var(--card)',
          borderRadius: 7,
          border:
            '1px solid rgba(110,90,130,0.10)',
          boxShadow:
            '0 8px 30px rgba(70,55,90,0.07)',
          padding: '27px 20px 34px',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* 종이 왼쪽 선 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 13,
            width: 1,
            background:
              'rgba(150,120,170,0.10)',
            pointerEvents: 'none',
          }}
        />

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
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text)',
            fontFamily:
              "'Noto Serif KR','Batang',serif",
            fontSize: 24,
            fontWeight: 700,
            padding: '3px 0 12px',
            boxSizing: 'border-box',
          }}
        />

        {/* 감정 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
            marginBottom: 18,
            paddingBottom: 15,
            borderBottom:
              '1px dashed var(--border)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'var(--sub)',
              marginRight: 4,
            }}
          >
            오늘의 기분
          </span>

          {EMOTIONS.map(emotion => {
            const selected =
              draft.emotion === emotion.label;

            return (
              <button
                key={emotion.label}
                type="button"
                onClick={() =>
                  updateDraft({
                    emotion: selected
                      ? ''
                      : emotion.label,
                  })
                }
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: selected
                    ? '1.5px solid var(--accent)'
                    : '1px solid transparent',
                  background: selected
                    ? 'var(--accent-bg)'
                    : 'transparent',
                  fontSize: 17,
                  cursor: 'pointer',
                  padding: 0,
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
                    marginBottom: 8,
                  }}
                >
                  <textarea
                    value={block.content || ''}
                    onChange={e =>
                      updateTextBlock(
                        block.id,
                        e.target.value
                      )
                    }
                    placeholder={
                      index === 0
                        ? '오늘 있었던 일을 천천히 적어보세요.'
                        : '그리고 또 어떤 일이 있었나요?'
                    }
                    rows={1}
                    style={{
                      display: 'block',
                      width: '100%',
                      minHeight: 40,
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      overflow: 'hidden',
                      background:
                        'transparent',
                      color: 'var(--text)',
                      fontFamily:
                        "'Noto Serif KR','Batang',serif",
                      fontSize: 15,
                      lineHeight: 2,
                      padding: 0,
                      boxSizing: 'border-box',
                    }}
                    onInput={e => {
                      e.target.style.height =
                        'auto';

                      e.target.style.height =
                        `${Math.max(
                          40,
                          e.target.scrollHeight
                        )}px`;
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      insertPhotoAfterText(
                        block.id
                      )
                    }
                    style={{
                      display: 'block',
                      marginTop: 2,
                      border: 'none',
                      background:
                        'transparent',
                      color:
                        'var(--accent)',
                      fontSize: 11,
                      padding: '5px 0',
                      cursor: 'pointer',
                      opacity: 0.7,
                    }}
                  >
                    ＋ 이곳에 사진 넣기
                  </button>
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
                    position: 'relative',
                    margin:
                      '18px 2px 20px',
                    padding:
                      '9px 9px 13px',
                    background: '#fff',
                    boxShadow:
                      '0 6px 20px rgba(50,40,60,0.12)',
                    transform:
                      index % 2 === 0
                        ? 'rotate(-0.4deg)'
                        : 'rotate(0.4deg)',
                    boxSizing: 'border-box',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      removeImageBlock(
                        block.id
                      )
                    }
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      zIndex: 2,
                      width: 27,
                      height: 27,
                      borderRadius: '50%',
                      border: 'none',
                      background:
                        'rgba(30,25,35,0.55)',
                      color: '#fff',
                      fontSize: 17,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>

                  {/* 원본 비율 */}
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

                  {/* 사진 메모 */}
                  <textarea
                    value={
                      block.comment || ''
                    }
                    onChange={e =>
                      updateImageComment(
                        block.id,
                        e.target.value
                      )
                    }
                    placeholder="이 사진에는 어떤 기억이 있나요?"
                    rows={1}
                    style={{
                      display: 'block',
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      background:
                        'transparent',
                      color: '#665d68',
                      textAlign: 'center',
                      fontFamily:
                        "'Noto Serif KR','Batang',serif",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                      marginTop: 8,
                      padding: 0,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              );
            }

            return null;
          }
        )}

        {/* 사진 추가 */}
        <button
          type="button"
          onClick={() =>
            fileRef.current?.click()
          }
          style={{
            display: 'block',
            width: '100%',
            marginTop: 10,
            padding: '12px',
            borderRadius: 11,
            border:
              '1px dashed var(--border)',
            background: 'transparent',
            color: 'var(--sub)',
            fontSize: 12,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          ＋ 사진 한 장 남기기
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{
            display: 'none',
          }}
          onChange={e => {
            addPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* 저장 */}
      <div style={{ marginTop: 13 }}>
        <SaveBtn
          onClick={handleSave}
          disabled={
            !hasContent || uploading
          }
          label="오늘의 기록 저장"
        />
      </div>

      {/* 오늘 마무리 */}
      <div
        style={{
          marginTop: 26,
          padding: '21px 18px',
          borderRadius: 18,
          background: 'var(--accent-bg)',
          border:
            '1px solid var(--border)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontFamily:
              "'Noto Serif KR','Batang',serif",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          ✦ 오늘 마무리
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--sub)',
            marginTop: 5,
            marginBottom: 15,
            lineHeight: 1.7,
          }}
        >
          오늘의 기록을 바탕으로
          <br />
          객관적이지만 따뜻하게 하루를 돌아봐요.
        </div>

        {aiReview ? (
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 14,
              padding: '17px 15px',
              border:
                '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                marginBottom: 9,
              }}
            >
              JARVIS
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily:
                  "'Noto Serif KR','Batang',serif",
                fontSize: 13,
                lineHeight: 1.9,
                color: 'var(--text)',
              }}
            >
              {aiReview.review}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAiReview}
            disabled={
              aiLoading || !hasContent
            }
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 13,
              border:
                '1px solid var(--border)',
              background: 'var(--card)',
              color:
                aiLoading || !hasContent
                  ? 'var(--sub)'
                  : 'var(--accent)',
              fontSize: 13,
              fontWeight: 700,
              cursor:
                aiLoading || !hasContent
                  ? 'default'
                  : 'pointer',
            }}
          >
            {aiLoading
              ? '오늘을 정리하는 중...'
              : '✦ 오늘 마무리하기'}
          </button>
        )}
      </div>

      {/* 사진 크게 보기 */}
      {viewPhoto && (
        <div
          onClick={() =>
            setViewPhoto(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 600,
            background:
              'rgba(20,15,25,0.86)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            boxSizing: 'border-box',
          }}
        >
          <img
            src={viewPhoto.src}
            alt=""
            onClick={e =>
              e.stopPropagation()
            }
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 4,
            }}
          />

          <button
            type="button"
            onClick={() =>
              setViewPhoto(null)
            }
            style={{
              position: 'fixed',
              top: 20,
              right: 18,
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background:
                'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 25,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* 달력 */}
      {showCal && (
        <CalendarOverlay
          current={{
            y,
            m,
            day,
          }}
          onSelect={selected => {
            setDate(selected);
            setShowCal(false);
          }}
          onClose={() =>
            setShowCal(false)
          }
        />
      )}

      {/* PIN 변경 */}
      {showSetPin && (
        <Modal
          title="PIN 변경"
          onClose={() =>
            setShowSetPin(false)
          }
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--sub)',
              lineHeight: 1.7,
              marginBottom: 16,
            }}
          >
            새로운 PIN은 숫자 4자리로 설정해주세요.
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={e =>
              setNewPin(
                e.target.value
                  .replace(/[^0-9]/g, '')
                  .slice(0, 4)
              )
            }
            placeholder="새 PIN 4자리"
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border:
                '1px solid var(--border)',
              background:
                'var(--input-bg, var(--card))',
              color: 'var(--text)',
              fontSize: 16,
              boxSizing: 'border-box',
              outline: 'none',
              marginBottom: 10,
            }}
          />

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPinConfirm}
            onChange={e =>
              setNewPinConfirm(
                e.target.value
                  .replace(/[^0-9]/g, '')
                  .slice(0, 4)
              )
            }
            placeholder="새 PIN 다시 입력"
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border:
                '1px solid var(--border)',
              background:
                'var(--input-bg, var(--card))',
              color: 'var(--text)',
              fontSize: 16,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          <SaveBtn
            label="PIN 저장"
            disabled={
              newPin.length !== 4 ||
              newPinConfirm.length !== 4 ||
              newPin !== newPinConfirm
            }
            onClick={() => {
              if (
                newPin.length !== 4 ||
                newPin !== newPinConfirm
              ) {
                return;
              }

              Store.set(
                'jarvis-pin',
                newPin
              );

              setNewPin('');
              setNewPinConfirm('');
              setShowSetPin(false);

              alert(
                '새 PIN으로 변경했어요. 🔒'
              );
            }}
          />
        </Modal>
      )}
    </div>
  );
}

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

/* ─────────────────────────────────────────────
   기존 일기 → 새로운 blocks 구조로 변환
   기존 데이터가 사라지지 않도록 호환
───────────────────────────────────────────── */
const makeBlocksFromEntry = (entry) => {
  if (!entry) {
    return [
      {
        id: uid(),
        type: 'text',
        text: '',
      },
    ];
  }

  // 새 구조
  if (Array.isArray(entry.blocks) && entry.blocks.length > 0) {
    return entry.blocks.map(block => ({
      ...block,
      id: block.id || uid(),
    }));
  }

  // 기존 구조
  const blocks = [];

  if (entry.text) {
    blocks.push({
      id: uid(),
      type: 'text',
      text: entry.text,
    });
  }

  if (Array.isArray(entry.photos)) {
    entry.photos.forEach(photo => {
      blocks.push({
        id: photo.id || uid(),
        type: 'photo',
        src: photo.src,
        comment: photo.comment || '',
      });

      // 사진 아래에서 계속 글을 쓸 수 있도록
      blocks.push({
        id: uid(),
        type: 'text',
        text: '',
      });
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      id: uid(),
      type: 'text',
      text: '',
    });
  }

  return blocks;
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

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');

  const [uploading, setUploading] = useState(false);

  const [draft, setDraft] = useState({
    title: '',
    emotion: '',
    blocks: [],
  });

  const [insertAfterIndex, setInsertAfterIndex] = useState(null);

  const fileRef = useRef(null);
  const textRefs = useRef({});

  const { y, m, day, dow, key } = fmtDate(date);

  const entries = data || {};
  const savedEntry = entries[key] || null;

  const savedPin = Store.get('jarvis-pin');

  /* ─────────────────────────────────────────────
     날짜가 바뀌면 해당 날짜 일기 불러오기
  ───────────────────────────────────────────── */
  useEffect(() => {
    const entry = entries[key] || null;

    setDraft({
      title: entry?.title || '',
      emotion: entry?.emotion || '',
      blocks: makeBlocksFromEntry(entry),
    });
  }, [key, savedEntry]);

  /* ─────────────────────────────────────────────
     PIN
  ───────────────────────────────────────────── */
  const tapPin = (digit) => {
    if (pin.length >= 4) return;

    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      const storedPin = Store.get('jarvis-pin');

      if (!storedPin || next === storedPin) {
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

  /* ─────────────────────────────────────────────
     PIN 잠금 화면
  ───────────────────────────────────────────── */
  if (!unlocked) {
    return (
      <div className="diary-lock-screen">
        <div className="diary-paper diary-lock-paper">
          <div className="diary-paper-margin" />

          <div className="diary-lock-inner">
            <div className="diary-lock-flower">✿</div>

            <div className="diary-lock-title">
              나의 작은 일기장
            </div>

            <div className="diary-lock-subtitle">
              {savedPin
                ? '오늘의 기록을 열어주세요'
                : '처음이라면 아무 PIN이나 입력해 주세요'}
            </div>

            <div className="diary-lock-line" />

            <div className="diary-pin-dots">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`diary-pin-dot ${
                    pin.length > i ? 'filled' : ''
                  } ${pinError ? 'error' : ''}`}
                />
              ))}
            </div>

            <div className="diary-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((d, i) => (
                <button
                  key={i}
                  className={`diary-key ${
                    d === '' ? 'empty' : ''
                  }`}
                  onClick={() => {
                    if (d === '⌫') {
                      setPin(p => p.slice(0, -1));
                    } else if (d !== '') {
                      tapPin(String(d));
                    }
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="diary-lock-note">
              오늘도 천천히 기록해요.
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     기본 상태 변경
  ───────────────────────────────────────────── */
  const updateDraft = (field, value) => {
    setDraft(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateTextBlock = (blockId, text) => {
    setDraft(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId
          ? { ...block, text }
          : block
      ),
    }));
  };

  const updatePhotoComment = (blockId, comment) => {
    setDraft(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId
          ? { ...block, comment }
          : block
      ),
    }));
  };

  /* ─────────────────────────────────────────────
     textarea 자동 높이
  ───────────────────────────────────────────── */
  const resizeTextarea = (element) => {
    if (!element) return;

    element.style.height = 'auto';
    element.style.height = `${Math.max(
      90,
      element.scrollHeight
    )}px`;
  };

  /* ─────────────────────────────────────────────
     사진 압축
  ───────────────────────────────────────────── */
  const compressImage = (file) =>
    new Promise((resolve) => {
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

  /* ─────────────────────────────────────────────
     Cloudinary 업로드
  ───────────────────────────────────────────── */
  const uploadToCloudinary = async (file) => {
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

    if (!response.ok) {
      throw new Error(
        '사진 업로드에 실패했습니다.'
      );
    }

    const result = await response.json();

    if (!result.secure_url) {
      throw new Error(
        '사진 주소를 가져오지 못했습니다.'
      );
    }

    return result.secure_url;
  };

  /* ─────────────────────────────────────────────
     사진 추가
     → 사진 바로 아래에 새 글 블록 자동 생성
  ───────────────────────────────────────────── */
  const openPhotoPicker = (afterIndex) => {
    setInsertAfterIndex(afterIndex);

    setTimeout(() => {
      fileRef.current?.click();
    }, 0);
  };

  const pickPhotos = (files) => {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);

    setDraft(prev => {
      let blocks = [...prev.blocks];

      let insertIndex =
        insertAfterIndex === null
          ? blocks.length - 1
          : insertAfterIndex;

      selected.forEach(file => {
        const photoBlock = {
          id: uid(),
          type: 'photo',
          file,
          preview: URL.createObjectURL(file),
          comment: '',
        };

        const textBlock = {
          id: uid(),
          type: 'text',
          text: '',
        };

        blocks.splice(
          insertIndex + 1,
          0,
          photoBlock,
          textBlock
        );

        insertIndex += 2;
      });

      return {
        ...prev,
        blocks,
      };
    });

    setInsertAfterIndex(null);
  };

  /* ─────────────────────────────────────────────
     글 블록 추가
  ───────────────────────────────────────────── */
  const addTextAfter = (index) => {
    const newBlock = {
      id: uid(),
      type: 'text',
      text: '',
    };

    setDraft(prev => {
      const blocks = [...prev.blocks];

      blocks.splice(
        index + 1,
        0,
        newBlock
      );

      return {
        ...prev,
        blocks,
      };
    });

    setTimeout(() => {
      textRefs.current[newBlock.id]?.focus();
    }, 50);
  };

  /* ─────────────────────────────────────────────
     블록 삭제
  ───────────────────────────────────────────── */
  const removeBlock = (blockId) => {
    setDraft(prev => {
      let blocks = prev.blocks.filter(
        block => block.id !== blockId
      );

      if (blocks.length === 0) {
        blocks = [
          {
            id: uid(),
            type: 'text',
            text: '',
          },
        ];
      }

      // 마지막 블록이 사진이면 글 블록 하나 추가
      if (
        blocks[blocks.length - 1].type ===
        'photo'
      ) {
        blocks.push({
          id: uid(),
          type: 'text',
          text: '',
        });
      }

      return {
        ...prev,
        blocks,
      };
    });
  };

  /* ─────────────────────────────────────────────
     사진 미리보기 주소
  ───────────────────────────────────────────── */
  const getPhotoSrc = (block) => {
    return block.src || block.preview || '';
  };

  /* ─────────────────────────────────────────────
     저장
  ───────────────────────────────────────────── */
  const handleSave = async () => {
    setUploading(true);

    try {
      const finalBlocks = [];

      for (const block of draft.blocks) {
        if (block.type === 'text') {
          finalBlocks.push({
            id: block.id,
            type: 'text',
            text: block.text || '',
          });

          continue;
        }

        if (block.type === 'photo') {
          let src = block.src || '';

          // 새 사진만 Cloudinary 업로드
          if (!src && block.file) {
            const compressed =
              await compressImage(block.file);

            src = await uploadToCloudinary(
              compressed
            );
          }

          if (src) {
            finalBlocks.push({
              id: block.id,
              type: 'photo',
              src,
              comment: block.comment || '',
            });
          }
        }
      }

      const legacyText = finalBlocks
        .filter(block => block.type === 'text')
        .map(block => block.text || '')
        .filter(Boolean)
        .join('\n\n');

      const legacyPhotos = finalBlocks
        .filter(block => block.type === 'photo')
        .map(block => ({
          id: block.id,
          src: block.src,
          comment: block.comment || '',
        }));

      const entry = {
        date: key,
        title: draft.title || '',
        emotion: draft.emotion || '',

        // 새 구조
        blocks: finalBlocks,

        // 기존 구조와의 호환성을 위해 같이 저장
        text: legacyText,
        photos: legacyPhotos,

        // AI 오늘의 마무리는 나중에 이 자리에 저장
        // aiReview: ...
        // aiReviewSourceHash: ...
      };

      if (saveDiaryEntry) {
        await saveDiaryEntry(key, entry);
      } else {
        // 혹시 구버전 App을 사용하고 있다면 대비
        setData(prev => ({
          ...prev,
          [key]: entry,
        }));
      }

      alert('오늘의 기록이 저장됐어요. 🐷');
    } catch (error) {
      console.error(
        'Diary save error:',
        error
      );

      alert(
        '저장에 실패했어요.\n사진 업로드나 인터넷 연결을 확인해주세요.'
      );
    } finally {
      setUploading(false);
    }
  };

  const hasContent =
    draft.title.trim() ||
    draft.emotion ||
    draft.blocks.some(block => {
      if (block.type === 'text') {
        return block.text?.trim();
      }

      return block.src || block.file;
    });

  /* ─────────────────────────────────────────────
     날짜 변경
  ───────────────────────────────────────────── */
  const moveDate = (amount) => {
    setDate(prev => {
      const next = new Date(prev);
      next.setDate(
        next.getDate() + amount
      );
      return next;
    });
  };

  return (
    <div className="diary-page-wrap">

      {/* 저장 중 */}
      {uploading && (
        <div className="diary-saving-overlay">
          <div className="diary-saving-card">
            <div className="diary-saving-icon">
              🐷
            </div>

            <div className="diary-saving-title">
              오늘의 기록을 보관하는 중
            </div>

            <div className="diary-saving-text">
              사진도 차곡차곡 넣고 있어요.
            </div>
          </div>
        </div>
      )}

      {/* 종이 일기장 */}
      <div className="diary-paper diary-main-paper">
        <div className="diary-paper-margin" />

        <div className="diary-paper-content">

          {/* 날짜 */}
          <div className="diary-date-navigation">
            <button
              className="diary-date-arrow"
              onClick={() => moveDate(-1)}
              aria-label="이전 날짜"
            >
              ‹
            </button>

            <button
              className="diary-date-center"
              onClick={() => setShowCal(true)}
            >
              <div className="diary-date-main">
                {m}월 {day}일
              </div>

              <div className="diary-date-sub">
                {y} · {dow}요일
              </div>
            </button>

            <button
              className="diary-date-arrow"
              onClick={() => moveDate(1)}
              aria-label="다음 날짜"
            >
              ›
            </button>
          </div>

          {/* PIN */}
          <div className="diary-top-actions">
            <button
              className="diary-pin-button"
              onClick={() =>
                setShowSetPin(true)
              }
            >
              🔒 PIN 변경
            </button>
          </div>

          {/* 제목 */}
          <input
            value={draft.title}
            onChange={e =>
              updateDraft(
                'title',
                e.target.value
              )
            }
            placeholder="오늘의 제목"
            className="diary-title-input"
          />

          {/* 감정 */}
          <div className="diary-emotion-section">
            <div className="diary-section-label">
              오늘의 기분
            </div>

            <div className="diary-emotions">
              {EMOTIONS.map(emotion => {
                const selected =
                  draft.emotion ===
                  emotion.label;

                return (
                  <button
                    key={emotion.label}
                    className={`diary-emotion ${
                      selected
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      updateDraft(
                        'emotion',
                        selected
                          ? ''
                          : emotion.label
                      )
                    }
                  >
                    <span className="diary-emotion-emoji">
                      {emotion.emoji}
                    </span>

                    <span className="diary-emotion-label">
                      {emotion.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="diary-divider" />

          {/* 본문 */}
          <div className="diary-writing-area">

            <div className="diary-writing-heading">
              오늘의 기록
            </div>

            {draft.blocks.map(
              (block, index) => {

                /* ───── 글 블록 ───── */
                if (block.type === 'text') {
                  return (
                    <div
                      key={block.id}
                      className="diary-text-block"
                    >
                      <textarea
                        ref={el => {
                          textRefs.current[
                            block.id
                          ] = el;

                          if (el) {
                            resizeTextarea(el);
                          }
                        }}
                        value={
                          block.text || ''
                        }
                        onChange={e => {
                          updateTextBlock(
                            block.id,
                            e.target.value
                          );

                          resizeTextarea(
                            e.target
                          );
                        }}
                        placeholder={
                          index === 0
                            ? '오늘은 어떤 하루였나요?'
                            : '그리고 또 어떤 일이 있었나요?'
                        }
                        className="diary-textarea"
                        rows={1}
                      />

                      <div className="diary-block-tools">
                        <button
                          onClick={() =>
                            openPhotoPicker(
                              index
                            )
                          }
                        >
                          📷 사진
                        </button>

                        <button
                          onClick={() =>
                            addTextAfter(
                              index
                            )
                          }
                        >
                          ＋ 글
                        </button>

                        {draft.blocks.length >
                          1 &&
                          !(
                            index === 0 &&
                            !block.text
                          ) && (
                            <button
                              className="delete-tool"
                              onClick={() =>
                                removeBlock(
                                  block.id
                                )
                              }
                            >
                              삭제
                            </button>
                          )}
                      </div>
                    </div>
                  );
                }

                /* ───── 사진 블록 ───── */
                return (
                  <div
                    key={block.id}
                    className="diary-photo-block"
                  >
                    <div className="diary-photo-paper">
                      <button
                        className="diary-photo-delete"
                        onClick={() =>
                          removeBlock(
                            block.id
                          )
                        }
                        aria-label="사진 삭제"
                      >
                        ×
                      </button>

                      <img
                        src={getPhotoSrc(block)}
                        alt=""
                        className="diary-photo-image"
                        onClick={() =>
                          setViewPhoto(block)
                        }
                      />

                      <textarea
                        value={
                          block.comment || ''
                        }
                        onChange={e =>
                          updatePhotoComment(
                            block.id,
                            e.target.value
                          )
                        }
                        placeholder="사진 아래에 한마디..."
                        className="diary-photo-comment"
                        rows={1}
                      />
                    </div>

                    <div className="diary-photo-tools">
                      <button
                        onClick={() =>
                          addTextAfter(
                            index
                          )
                        }
                      >
                        ＋ 사진 아래에 글쓰기
                      </button>

                      <button
                        onClick={() =>
                          openPhotoPicker(
                            index
                          )
                        }
                      >
                        📷 사진 더하기
                      </button>
                    </div>
                  </div>
                );
              }
            )}

            {/* 맨 아래 추가 버튼 */}
            <div className="diary-add-buttons">
              <button
                onClick={() =>
                  addTextAfter(
                    draft.blocks.length - 1
                  )
                }
              >
                ＋ 글 이어쓰기
              </button>

              <button
                onClick={() =>
                  openPhotoPicker(
                    draft.blocks.length - 1
                  )
                }
              >
                📷 사진 남기기
              </button>
            </div>
          </div>

          {/* 오늘의 마무리 영역
              AI 기능은 다음 단계에서 연결 */}
          <div className="diary-closing-placeholder">
            <div className="diary-closing-icon">
              ✦
            </div>

            <div className="diary-closing-title">
              오늘의 마무리
            </div>

            <div className="diary-closing-text">
              하루의 기록을 모두 남긴 뒤
              <br />
              오늘을 천천히 돌아보는 공간이에요.
            </div>

            <div className="diary-closing-coming">
              AI와 함께 정리하기 · 다음 단계에서 추가
            </div>
          </div>

          {/* 저장 */}
          <div className="diary-save-area">
            <SaveBtn
              onClick={handleSave}
              disabled={
                !hasContent || uploading
              }
              label={
                uploading
                  ? '저장하는 중...'
                  : '오늘의 기록 저장하기'
              }
            />

            <div className="diary-save-hint">
              저장한 기록은 이 날짜에 남아요.
            </div>
          </div>

        </div>
      </div>

      {/* 파일 선택 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          pickPhotos(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 달력 */}
      {showCal && (
        <CalendarOverlay
          current={{ y, m, day }}
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
          className="diary-photo-viewer"
          onClick={() =>
            setViewPhoto(null)
          }
        >
          <button
            className="diary-photo-viewer-close"
            onClick={() =>
              setViewPhoto(null)
            }
          >
            ×
          </button>

          <img
            src={getPhotoSrc(viewPhoto)}
            alt=""
            className="diary-photo-viewer-image"
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
          <div className="diary-pin-form">

            <label>
              새 PIN · 4자리
            </label>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={e =>
                setNewPin(
                  e.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="••••"
            />

            <label>
              PIN 확인
            </label>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPinConfirm}
              onChange={e =>
                setNewPinConfirm(
                  e.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="••••"
            />

            {newPin &&
              newPinConfirm &&
              newPin !==
                newPinConfirm && (
                <div className="diary-pin-error">
                  PIN이 일치하지 않아요.
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
                    'PIN이 변경됐어요! 🐷'
                  );
                }
              }}
              disabled={
                newPin.length !== 4 ||
                newPin !== newPinConfirm
              }
              label="PIN 저장"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

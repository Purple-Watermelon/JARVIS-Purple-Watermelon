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


// ─────────────────────────────────────────────
// 기존 일기 → 새 blocks 구조 변환
//
// 기존:
// {
//   text: '본문',
//   photos: [...]
// }
//
// 새:
// {
//   blocks: [
//     { type: 'text', id, content },
//     { type: 'image', id, src, comment }
//   ]
// }
//
// 기존 데이터는 절대 버리지 않는다.
// ─────────────────────────────────────────────

const convertLegacyEntry = entry => {

  if (!entry) {
    return {
      title: '',
      emotion: '',
      blocks: []
    };
  }

  // 이미 새 구조라면 그대로 사용
  if (Array.isArray(entry.blocks)) {
    return {
      title: entry.title || '',
      emotion: entry.emotion || '',
      blocks: entry.blocks
    };
  }

  const blocks = [];

  if (entry.text) {
    blocks.push({
      id: uid(),
      type: 'text',
      content: entry.text
    });
  }

  if (Array.isArray(entry.photos)) {

    entry.photos.forEach(photo => {

      if (!photo.src) return;

      blocks.push({
        id: photo.id || uid(),
        type: 'image',
        src: photo.src,
        comment: photo.comment || ''
      });

    });
  }

  return {
    title: entry.title || '',
    emotion: entry.emotion || '',
    blocks
  };
};


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

  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fileRef = useRef(null);

  const { y, m, day, dow, key } = fmtDate(date);

  const entries = data || {};
  const savedEntry = entries[key] || null;

  const savedPin = Store.get('jarvis-pin');


  // ─────────────────────────────────────────────
  // Draft
  // ─────────────────────────────────────────────

  const [draft, setDraft] = useState({
    title: '',
    emotion: '',
    blocks: []
  });


  // ─────────────────────────────────────────────
  // 날짜 변경 → 해당 일기 불러오기
  // ─────────────────────────────────────────────

  useEffect(() => {

    const converted =
      convertLegacyEntry(
        entries[key]
      );

    setDraft(converted);

    // AI는 현재 실제 API 연결 전
    setAiReview(null);

  }, [key, savedEntry]);


  // 기존 일기를 불러왔을 때도 본문 전체가 바로 보이도록
  // textarea 높이를 실제 내용에 맞춰 다시 계산한다.
  useEffect(() => {
    requestAnimationFrame(() => {
      document
        .querySelectorAll('[data-diary-textarea]')
        .forEach(el => {
          el.style.height = 'auto';
          el.style.height = `${Math.max(34, el.scrollHeight)}px`;
        });
    });
  }, [draft]);


  // ─────────────────────────────────────────────
  // PIN
  // ─────────────────────────────────────────────

  const tapPin = d => {

    if (pin.length >= 4) return;

    const next = pin + d;

    setPin(next);

    if (next.length === 4) {

      const saved =
        Store.get('jarvis-pin');

      if (!saved || next === saved) {

        setTimeout(() => {
          setUnlocked(true);
          setPin('');
        }, 150);

      } else {

        setTimeout(() => {

          setPin('');
          setPinError(true);

          setTimeout(
            () => setPinError(false),
            800
          );

        }, 300);
      }
    }
  };


  // ─────────────────────────────────────────────
  // 잠금 화면
  // ─────────────────────────────────────────────

  if (!unlocked) {

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: 20
        }}
      >

        <div
          style={{
            fontSize: 48,
            marginBottom: 12
          }}
        >
          📓
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 6
          }}
        >
          일기장 잠금
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--sub)',
            marginBottom: 32,
            textAlign: 'center'
          }}
        >
          {savedPin
            ? 'PIN을 입력하세요'
            : '처음 사용 시 아무 PIN이나 입력하면 설정돼요'}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 40
          }}
        >

          {[0,1,2,3].map(i => (

            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background:
                  pin.length > i
                    ? (
                      pinError
                        ? 'var(--red)'
                        : 'var(--accent)'
                    )
                    : 'var(--border)',
                transition:
                  'background 0.2s'
              }}
            />

          ))}

        </div>


        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3,72px)',
            gap: 12
          }}
        >

          {[1,2,3,4,5,6,7,8,9,'',0,'⌫']
            .map((d, i) => (

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
                fontSize:
                  d === '⌫'
                    ? 20
                    : 24,
                fontWeight: 600,
                background:
                  d === ''
                    ? 'transparent'
                    : 'var(--card)',
                color:
                  d === '⌫'
                    ? 'var(--sub)'
                    : 'var(--text)',
                boxShadow:
                  d === ''
                    ? 'none'
                    : '0 2px 8px rgba(124,92,191,0.08)',
                border:
                  d === ''
                    ? 'none'
                    : '1.5px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              {d}
            </button>

          ))}

        </div>

      </div>
    );
  }


  // ─────────────────────────────────────────────
  // Draft helper
  // ─────────────────────────────────────────────

  const updateDraft = changes => {

    setDraft(prev => ({
      ...prev,
      ...changes
    }));
  };


  // ─────────────────────────────────────────────
  // Text block
  // ─────────────────────────────────────────────

  const updateTextBlock =
    (blockId, content) => {

      setDraft(prev => ({

        ...prev,

        blocks:
          prev.blocks.map(block =>
            block.id === blockId
              ? {
                  ...block,
                  content
                }
              : block
          )

      }));
    };


  // ─────────────────────────────────────────────
  // 사진 메모
  // ─────────────────────────────────────────────

  const updateImageComment =
    (blockId, comment) => {

      setDraft(prev => ({

        ...prev,

        blocks:
          prev.blocks.map(block =>
            block.id === blockId
              ? {
                  ...block,
                  comment
                }
              : block
          )

      }));
    };


  // ─────────────────────────────────────────────
  // 글 블록 추가
  // ─────────────────────────────────────────────

  const addTextAfter =
    blockId => {

      const newBlock = {
        id: uid(),
        type: 'text',
        content: ''
      };

      setDraft(prev => {

        const index =
          prev.blocks.findIndex(
            b => b.id === blockId
          );

        if (index === -1) {

          return {
            ...prev,
            blocks: [
              ...prev.blocks,
              newBlock
            ]
          };
        }

        const blocks =
          [...prev.blocks];

        blocks.splice(
          index + 1,
          0,
          newBlock
        );

        return {
          ...prev,
          blocks
        };
      });

      // 새 글 입력창으로 이동
      setTimeout(() => {

        const el =
          document.querySelector(
            `[data-block-id="${newBlock.id}"]`
          );

        if (el) {
          el.focus();
        }

      }, 50);
    };


  // ─────────────────────────────────────────────
  // 사진 블록 추가
  //
  // 마지막 위치에 사진을 넣는다.
  // 현재 글 아래에서 사진을 넣고
  // 그 뒤에 자동으로 글 블록을 만든다.
  // ─────────────────────────────────────────────

  const addPhotos = async files => {

    const selected =
      Array.from(files || []);

    if (!selected.length) return;


    setUploading(true);

    try {

      const imageBlocks =
        await Promise.all(

          selected.map(
            async file => {

              const compressed =
                await compressImage(file);

              const src =
                await uploadToCloudinary(
                  compressed
                );

              return {
                id: uid(),
                type: 'image',
                src,
                comment: ''
              };
            }
          )
        );


      setDraft(prev => {

        let blocks = [...prev.blocks];

        // 이미 마지막에 있는 빈 글칸은 재사용한다.
        const last = blocks[blocks.length - 1];
        if (
          last &&
          last.type === 'text' &&
          !(last.content || '').trim()
        ) {
          blocks = blocks.slice(0, -1);
        }

        blocks.push(...imageBlocks);

        // 사진 뒤 글칸은 항상 하나만 만든다.
        blocks.push({
          id: uid(),
          type: 'text',
          content: ''
        });

        return {
          ...prev,
          blocks
        };
      });

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


  // ─────────────────────────────────────────────
  // 사진 삭제
  // ─────────────────────────────────────────────

  const removeImageBlock =
    blockId => {

      if (
        !window.confirm(
          '이 사진을 삭제할까요?\n저장하면 영구적으로 삭제됩니다.'
        )
      ) {
        return;
      }


      setDraft(prev => {

        const index = prev.blocks.findIndex(
          block => block.id === blockId
        );

        if (index === -1) return prev;

        const blocks = [...prev.blocks];
        blocks.splice(index, 1);

        // 사진 뒤에 자동 생성된 빈 글칸도 함께 삭제한다.
        const next = blocks[index];
        if (
          next &&
          next.type === 'text' &&
          !(next.content || '').trim()
        ) {
          blocks.splice(index, 1);
        }

        // 글칸이 하나도 없을 때만 하나 만든다.
        if (!blocks.some(b => b.type === 'text')) {
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
  // 사진 압축
  // ─────────────────────────────────────────────

  const compressImage =
    file =>
      new Promise(resolve => {

        const img =
          new Image();

        const reader =
          new FileReader();


        reader.onload = e => {
          img.src =
            e.target.result;
        };


        img.onload = () => {

          const MAX = 1600;

          let {
            width,
            height
          } = img;


          if (
            width > height &&
            width > MAX
          ) {

            height =
              height * MAX / width;

            width = MAX;

          } else if (
            height > MAX
          ) {

            width =
              width * MAX / height;

            height = MAX;
          }


          const canvas =
            document.createElement(
              'canvas'
            );

          canvas.width =
            width;

          canvas.height =
            height;


          canvas
            .getContext('2d')
            .drawImage(
              img,
              0,
              0,
              width,
              height
            );


          canvas.toBlob(
            blob =>
              resolve(
                blob || file
              ),
            'image/jpeg',
            0.8
          );
        };


        img.onerror =
          () => resolve(file);


        reader.readAsDataURL(file);

      });


  // ─────────────────────────────────────────────
  // Cloudinary
  // ─────────────────────────────────────────────

  const uploadToCloudinary =
    async file => {

      const formData =
        new FormData();


      formData.append(
        'file',
        file
      );


      formData.append(
        'upload_preset',
        process.env
          .REACT_APP_CLOUDINARY_UPLOAD_PRESET
      );


      const res =
        await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData
          }
        );


      const result =
        await res.json();


      if (
        !res.ok ||
        !result.secure_url
      ) {

        throw new Error(
          '사진 업로드에 실패했습니다.'
        );
      }


      return result.secure_url;
    };


  // ─────────────────────────────────────────────
  // 저장
  // ─────────────────────────────────────────────

  const handleSave =
    async () => {

      setUploading(true);

      try {

        // 혹시 기존 형식 사진이 남아있다면
        // src가 있는 것만 저장
        const blocks =
          draft.blocks
            .filter(block => {

              if (
                block.type === 'text'
              ) {

                return true;
              }

              if (
                block.type === 'image'
              ) {

                return !!block.src;
              }

              return false;
            })
            .map(block => {

              if (
                block.type === 'text'
              ) {

                return {
                  id: block.id,
                  type: 'text',
                  content:
                    block.content || ''
                };
              }


              return {
                id: block.id,
                type: 'image',
                src: block.src,
                comment:
                  block.comment || ''
              };

            });


        const entry = {

          date: key,

          title:
            draft.title || '',

          emotion:
            draft.emotion || '',

          blocks
        };


        // 날짜 하나만 저장
        await saveDiaryEntry(
          key,
          entry
        );


        alert(
          '저장됐어요! 🐷'
        );

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
    draft.title ||
    draft.emotion ||
    draft.blocks.some(
      block =>
        (
          block.type === 'text' &&
          block.content
        ) ||
        block.type === 'image'
    );


  // ─────────────────────────────────────────────
  // AI
  //
  // 실제 AI API 연결 전의 자리만 유지.
  // ─────────────────────────────────────────────

  const handleAiReview =
    async () => {

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
            '오늘의 마무리 기능은 준비되어 있어요.\\n\\n현재는 AI 연결 전 단계라 실제 분석은 아직 하지 않아요. 다음 단계에서 오늘의 일기와 가계부 기록을 바탕으로 객관적이지만 따뜻한 총평을 연결할 수 있어요.',
          createdAt:
            new Date().toISOString()
        });

        setAiLoading(false);

      }, 500);
    };


  // ─────────────────────────────────────────────
  // 화면
  // ─────────────────────────────────────────────

  return (

    <div
      style={{
        padding:
          '20px 16px 100px',

        background:
          'var(--bg)'
      }}
    >

      {/* 저장 / 업로드 중 */}

      {uploading && (

        <div
          style={{
            position: 'fixed',
            inset: 0,

            background:
              'rgba(30,24,40,0.35)',

            backdropFilter:
              'blur(3px)',

            zIndex: 500,

            display: 'flex',

            alignItems: 'center',

            justifyContent:
              'center'
          }}
        >

          <div
            style={{
              background:
                'var(--card)',

              borderRadius: 18,

              padding:
                '24px 30px',

              textAlign:
                'center',

              boxShadow:
                '0 10px 40px rgba(40,30,60,0.15)'
            }}
          >

            <div
              style={{
                fontSize: 30,
                marginBottom: 8
              }}
            >
              💾
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 700
              }}
            >
              정리하는 중...
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                marginTop: 4
              }}
            >
              사진을 일기장에 넣고 있어요
            </div>

          </div>

        </div>

      )}


      {/* 날짜 */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14
        }}
      >

        <button
          onClick={() =>
            setDate(d => {

              const n =
                new Date(d);

              n.setDate(
                n.getDate() - 1
              );

              return n;
            })
          }
          style={{
            fontSize: 28,
            color: 'var(--accent)',
            padding: '2px 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ‹
        </button>


        <button
          onClick={() =>
            setShowCal(true)
          }
          style={{
            flex: 1,
            textAlign: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >

          <div
            style={{
              fontFamily:
                "'Noto Serif KR','Batang',serif",

              fontSize: 28,

              fontWeight: 700,

              color:
                'var(--text)'
            }}
          >
            {m}월 {day}일
          </div>


          <div
            style={{
              fontSize: 12,
              color: 'var(--accent)',
              marginTop: 3,
              fontWeight: 600
            }}
          >
            {y} · {dow}요일
          </div>

        </button>


        <button
          onClick={() =>
            setDate(d => {

              const n =
                new Date(d);

              n.setDate(
                n.getDate() + 1
              );

              return n;
            })
          }
          style={{
            fontSize: 28,
            color: 'var(--accent)',
            padding: '2px 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ›
        </button>

      </div>


      {/* PIN */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 10
        }}
      >

        <button
          onClick={() =>
            setShowSetPin(true)
          }
          style={{
            fontSize: 11,
            color: 'var(--sub)',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔒 PIN 변경
        </button>

      </div>


      {/* ─────────────────────────────────────────
          종이 일기장
      ───────────────────────────────────────── */}

      <div
        style={{
          position: 'relative',

          background:
            'var(--card)',

          borderRadius: 6,

          padding:
            '28px 22px 38px',

          border:
            '1px solid rgba(110,90,130,0.10)',

          boxShadow:
            '0 8px 30px rgba(70,55,90,0.07)',

          overflow: 'hidden'
        }}
      >

        {/* 종이 왼쪽 여백선 */}

        <div
          style={{
            position: 'absolute',

            left: 12,
            top: 0,
            bottom: 0,

            width: 1,

            background:
              'rgba(150,120,170,0.08)'
          }}
        />


        {/* 제목 */}

        <input
          value={
            draft.title
          }

          onChange={e =>
            updateDraft({
              title:
                e.target.value
            })
          }

          placeholder="오늘의 제목"

          style={{
            width: '100%',

            border: 'none',

            background:
              'transparent',

            color:
              'var(--text)',

            fontFamily:
              "'Noto Serif KR','Batang',serif",

            fontSize: 25,

            fontWeight: 700,

            padding:
              '4px 0 12px',

            outline: 'none',

            boxSizing:
              'border-box'
          }}
        />


        {/* 감정 */}

        <div
          style={{
            display: 'flex',

            alignItems:
              'center',

            gap: 5,

            marginBottom: 20,

            paddingBottom: 16,

            borderBottom:
              '1px dashed var(--border)'
          }}
        >

          <span
            style={{
              fontSize: 11,
              color: 'var(--sub)',
              marginRight: 3
            }}
          >
            오늘의 기분
          </span>


          {EMOTIONS.map(
            emotion => (

            <button
              key={
                emotion.label
              }

              onClick={() =>
                updateDraft({
                  emotion:
                    draft.emotion ===
                    emotion.label
                      ? ''
                      : emotion.label
                })
              }

              title={
                emotion.label
              }

              style={{
                width: 30,
                height: 30,

                borderRadius:
                  '50%',

                border:
                  draft.emotion ===
                  emotion.label
                    ? '1.5px solid var(--accent)'
                    : '1px solid transparent',

                background:
                  draft.emotion ===
                  emotion.label
                    ? 'var(--accent-bg)'
                    : 'transparent',

                fontSize: 17,

                cursor:
                  'pointer'
              }}
            >
              {emotion.emoji}
            </button>

          ))}

        </div>


        {/* ───────────────────────────────────────
            블록
        ─────────────────────────────────────── */}

        {draft.blocks.map(
          (block, index) => {

          if (
            block.type === 'text'
          ) {

            return (

              <div
                key={
                  block.id
                }

                style={{
                  position:
                    'relative',

                  marginBottom:
                    12
                }}
              >

                <textarea
                  data-block-id={
                    block.id
                  }
                  data-diary-textarea="true"

                  value={
                    block.content ||
                    ''
                  }

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
                    width: '100%',

                    minHeight:
                      34,

                    border: 'none',

                    outline: 'none',

                    resize: 'vertical',

                    overflow:
                      'hidden',

                    background:
                      'transparent',

                    color:
                      'var(--text)',

                    fontFamily:
                      "'Noto Serif KR','Batang',serif",

                    fontSize: 15,

                    lineHeight: 2,

                    boxSizing:
                      'border-box'
                  }}

                  onInput={e => {

                    e.target.style.height =
                      'auto';

                    e.target.style.height =
                      `${Math.max(
                        34,
                        e.target.scrollHeight
                      )}px`;

                  }}
                />


                {/* 글 뒤에 사진 추가 */}

                <button
                  onClick={() => {

                    setDraft(prev => {

                      const newImage = {
                        id: uid(),
                        type: 'image',
                        src: '',
                        file: null,
                        comment: ''
                      };

                      const newText = {
                        id: uid(),
                        type: 'text',
                        content: ''
                      };

                      const blocks =
                        [...prev.blocks];

                      const blockIndex =
                        blocks.findIndex(
                          b =>
                            b.id ===
                            block.id
                        );

                      blocks.splice(
                        blockIndex + 1,
                        0,
                        newImage,
                        newText
                      );

                      return {
                        ...prev,
                        blocks
                      };
                    });

                  }}

                  style={{
                    display: 'none'
                  }}
                >
                  사진
                </button>

              </div>

            );
          }


          if (
            block.type === 'image'
          ) {

            // 아직 업로드되지 않은 이미지
            // 실제로는 addPhotos에서
            // 업로드 완료 후 추가된다.
            if (!block.src) {
              return null;
            }


            return (

              <div
                key={
                  block.id
                }

                style={{
                  position:
                    'relative',

                  margin:
                    '20px 4px 22px',

                  background:
                    '#fff',

                  padding:
                    '10px 10px 14px',

                  boxShadow:
                    '0 6px 20px rgba(50,40,60,0.12)',

                  transform:
                    index % 2 === 0
                      ? 'rotate(-0.5deg)'
                      : 'rotate(0.5deg)'
                }}
              >

                {/* 삭제 */}

                <button
                  onClick={() =>
                    removeImageBlock(
                      block.id
                    )
                  }

                  style={{
                    position:
                      'absolute',

                    top: 7,
                    right: 7,

                    zIndex: 2,

                    width: 26,
                    height: 26,

                    borderRadius:
                      '50%',

                    border: 'none',

                    background:
                      'rgba(30,25,35,0.55)',

                    color: '#fff',

                    fontSize: 16,

                    cursor:
                      'pointer'
                  }}
                >
                  ×
                </button>


                {/* ★ 원본 비율 */}

                <img
                  src={
                    block.src
                  }

                  alt=""

                  onClick={() =>
                    setViewPhoto(
                      block
                    )
                  }

                  style={{
                    display:
                      'block',

                    width:
                      '100%',

                    height:
                      'auto',

                    objectFit:
                      'contain',

                    cursor:
                      'pointer'
                  }}
                />


                {/* 사진 메모 */}

                <textarea
                  value={
                    block.comment ||
                    ''
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
                    width: '100%',

                    border: 'none',

                    outline: 'none',

                    resize: 'none',

                    background:
                      'transparent',

                    color:
                      '#665d68',

                    textAlign:
                      'center',

                    fontFamily:
                      "'Noto Serif KR','Batang',serif",

                    fontSize: 12,

                    lineHeight: 1.6,

                    fontStyle:
                      'italic',

                    marginTop: 8,

                    boxSizing:
                      'border-box'
                  }}
                />

              </div>

            );
          }


          return null;

        })}


        {/* 사진 추가 */}

        <button
          onClick={() =>
            fileRef.current?.click()
          }

          style={{
            width: '100%',

            marginTop: 8,

            padding: '12px',

            borderRadius: 10,

            border:
              '1px dashed var(--border)',

            background:
              'transparent',

            color:
              'var(--sub)',

            fontSize: 12,

            cursor:
              'pointer'
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
            display: 'none'
          }}

          onChange={e => {

            addPhotos(
              e.target.files
            );

            e.target.value =
              '';

          }}
        />

      </div>


      {/* 저장 */}

      <div
        style={{
          marginTop: 14
        }}
      >

        <SaveBtn
          onClick={
            handleSave
          }

          disabled={
            !hasContent ||
            uploading
          }

          label="오늘의 기록 저장"
        />

      </div>


      {/* ─────────────────────────────────────────
          오늘 마무리
      ───────────────────────────────────────── */}

      <div
        style={{
          marginTop: 28,

          padding:
            '22px 20px',

          borderRadius: 18,

          background:
            'var(--accent-bg)',

          border:
            '1px solid var(--border)'
        }}
      >

        <div
          style={{
            fontFamily:
              "'Noto Serif KR','Batang',serif",

            fontSize: 18,

            fontWeight: 700
          }}
        >
          ✦ 오늘 마무리
        </div>


        <div
          style={{
            fontSize: 11,

            color:
              'var(--sub)',

            marginTop: 5,

            marginBottom: 16,

            lineHeight: 1.7
          }}
        >
          오늘의 기록을 바탕으로
          <br />
          객관적이지만 따뜻하게 하루를 돌아봐요.
        </div>


        {aiReview ? (

          <div
            style={{
              background:
                'var(--card)',

              borderRadius: 14,

              padding:
                '17px 16px',

              border:
                '1px solid var(--border)'
            }}
          >

            <div
              style={{
                fontSize: 11,

                fontWeight: 700,

                color:
                  'var(--accent)',

                marginBottom: 9
              }}
            >
              JARVIS
            </div>


            <div
              style={{
                whiteSpace:
                  'pre-wrap',

                fontFamily:
                  "'Noto Serif KR','Batang',serif",

                fontSize: 13,

                lineHeight: 1.9,

                color:
                  'var(--text)'
              }}
            >
              {aiReview.review}
            </div>

          </div>

        ) : (

          <button
            onClick={
              handleAiReview
            }

            disabled={
              aiLoading ||
              !hasContent
            }

            style={{
              width: '100%',

              padding:
                '14px',

              borderRadius: 13,

              border:
                '1px solid var(--border)',

              background:
                'var(--card)',

              color:
                aiLoading
                  ? 'var(--sub)'
                  : 'var(--accent)',

              fontSize: 13,

              fontWeight: 700,

              cursor:
                aiLoading ||
                !hasContent
                  ? 'default'
                  : 'pointer'
            }}
          >
            {aiLoading
              ? '오늘을 정리하는 중...'
              : '✦ 오늘 마무리하기'}
          </button>

        )}

      </div>


      {/* 달력 */}

      {showCal && (

        <CalendarOverlay
          current={{
            y,
            m,
            day
          }}

          onSelect={
            setDate
          }

          onClose={() =>
            setShowCal(false)
          }

          dotKeys={
            Object.keys(entries)
          }
        />

      )}


      {/* 사진 전체 화면 */}

      {viewPhoto && (

        <div
          onClick={() =>
            setViewPhoto(null)
          }

          style={{
            position: 'fixed',

            inset: 0,

            background:
              'rgba(20,16,25,0.92)',

            zIndex: 400,

            display: 'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            padding: 20
          }}
        >

          <img
            src={
              viewPhoto.src
            }

            alt=""

            style={{
              maxWidth:
                '100%',

              maxHeight:
                '90vh',

              width:
                'auto',

              height:
                'auto',

              objectFit:
                'contain',

              borderRadius: 4
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

                outline: 'none',

                letterSpacing: 8,

                boxSizing:
                  'border-box'
              }}

              type="password"

              maxLength={4}

              inputMode="numeric"

              value={
                newPin
              }

              onChange={e =>
                setNewPin(
                  e.target.value
                    .replace(
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

                outline: 'none',

                letterSpacing: 8,

                boxSizing:
                  'border-box'
              }}

              type="password"

              maxLength={4}

              inputMode="numeric"

              value={
                newPinConfirm
              }

              onChange={e =>
                setNewPinConfirm(
                  e.target.value
                    .replace(
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

                setShowSetPin(
                  false
                );

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

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
  aiReviews,
  saveAiReview,
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

  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const fileRef = useRef();

  const { y, m, day, dow, key } = fmtDate(date);

  const entries = data || {};

  const savedEntry = entries[key] || null;

  const savedAiReview =
    aiReviews && aiReviews[key]
      ? aiReviews[key]
      : null;


  // ─────────────────────────────────────────────
  // Draft
  // ─────────────────────────────────────────────

  const [draft, setDraft] = useState({
    title: '',
    emotion: '',
    text: '',
    photos: []
  });


  // 날짜가 바뀌면 해당 날짜의 일기를 다시 불러온다.
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

    setAiMessage('');

  }, [key, savedEntry]);


  // ─────────────────────────────────────────────
  // PIN
  // ─────────────────────────────────────────────

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
            marginBottom: 32
          }}
        >
          {Store.get('jarvis-pin')
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


  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  const D = (k, v) =>
    setDraft(prev => ({
      ...prev,
      [k]: v
    }));


  const compressImage = file =>
    new Promise(resolve => {

      const img = new Image();
      const reader = new FileReader();

      reader.onload = e => {
        img.src = e.target.result;
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
          document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;


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
            resolve(blob || file),

          'image/jpeg',
          0.8
        );
      };


      img.onerror =
        () => resolve(file);

      reader.readAsDataURL(file);

    });


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
  // 사진
  // ─────────────────────────────────────────────

  const pickPhotos = files => {

    const added =
      Array.from(files).map(file => ({
        id: uid(),

        file,

        preview:
          URL.createObjectURL(file),

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


  const removeDraftPhoto =
    photoId => {

      if (
        !window.confirm(
          '이 사진을 삭제하시겠습니까?\n(저장하면 영구 삭제됩니다)'
        )
      ) {
        return;
      }


      setDraft(prev => ({
        ...prev,

        photos:
          prev.photos.filter(
            ph =>
              ph.id !== photoId
          )
      }));
    };


  const setPhotoComment =
    (photoId, comment) => {

      setDraft(prev => ({
        ...prev,

        photos:
          prev.photos.map(ph =>
            ph.id === photoId
              ? {
                  ...ph,
                  comment
                }
              : ph
          )
      }));
    };


  // ─────────────────────────────────────────────
  // 저장
  // ─────────────────────────────────────────────

  const handleSave =
    async () => {

      setUploading(true);

      try {

        const finalPhotos =
          await Promise.all(

            draft.photos.map(
              async ph => {

                if (ph.src) {

                  return {
                    id: ph.id,
                    src: ph.src,
                    comment:
                      ph.comment || ''
                  };
                }


                const compressed =
                  await compressImage(
                    ph.file
                  );


                const url =
                  await uploadToCloudinary(
                    compressed
                  );


                return {
                  id: ph.id,
                  src: url,
                  comment:
                    ph.comment || ''
                };
              }
            )
          );


        const entry = {

          date: key,

          title:
            draft.title || '',

          emotion:
            draft.emotion || '',

          text:
            draft.text || '',

          photos:
            finalPhotos
        };


        await saveDiaryEntry(
          key,
          entry
        );


        alert(
          '저장됐어요! 🐷'
        );

      } catch (err) {

        console.error(
          'Diary 저장 실패:',
          err
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
  // 사진 주소
  // ─────────────────────────────────────────────

  const photoSrc =
    ph =>
      ph.src ||
      ph.preview;


  const hasContent =
    draft.title ||
    draft.emotion ||
    draft.text ||
    draft.photos.length > 0;


  // ─────────────────────────────────────────────
  // AI 오늘 마무리
  //
  // 현재는 저장 구조와 화면만 연결.
  // 실제 AI 호출은 다음 단계에서 연결.
  // ─────────────────────────────────────────────

  const handleAiReview =
    async () => {

      if (!hasContent) {

        alert(
          '먼저 오늘의 기록을 남겨주세요.'
        );

        return;
      }


      if (savedAiReview) {

        setAiMessage(
          '이미 오늘의 마무리가 있어요.'
        );

        return;
      }


      setAiLoading(true);
      setAiMessage('');


      try {

        /*
         * 실제 AI 호출은 다음 단계에서 연결합니다.
         *
         * 여기서는 테스트용 기본 문장을 저장합니다.
         * 다음 단계에서 기존 프로젝트의 AI API와 연결할 예정입니다.
         */

        const review =
          `오늘은 "${draft.title || '제목 없는 하루'}"라는 기록을 남겼어요.\n\n` +
          `오늘의 감정은 ${draft.emotion || '기록되지 않았고'}, ` +
          `하루에 대해 ${draft.text ? '구체적인 이야기를 남겼네요.' : '아직 조금 더 기록할 여지가 있어요.'}\n\n` +
          `좋았던 점과 아쉬웠던 점을 한꺼번에 바꾸려고 하기보다는, ` +
          `내일은 가장 중요한 한 가지부터 해보는 것도 좋아 보여요.`;



        if (saveAiReview) {

          await saveAiReview(
            key,
            review
          );

        }


        setAiMessage(
          '오늘 마무리가 저장됐어요.'
        );

      } catch (error) {

        console.error(
          'AI 오늘 마무리 실패:',
          error
        );

        setAiMessage(
          '오늘 마무리를 저장하지 못했어요. 다시 시도해주세요.'
        );

      } finally {

        setAiLoading(false);
      }
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


      {/* 저장 중 */}

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
            justifyContent: 'center'
          }}
        >

          <div
            style={{
              background:
                'var(--card)',

              borderRadius: 18,

              padding:
                '24px 30px',

              textAlign: 'center',

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
              저장하는 중...
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--sub)',
                marginTop: 4
              }}
            >
              사진을 정리하고 있어요
            </div>

          </div>

        </div>
      )}


      {/* ───────────────────────────────────────
          날짜
      ─────────────────────────────────────── */}

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
                'var(--text)',

              letterSpacing: -1
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


      {/* ───────────────────────────────────────
          종이
      ─────────────────────────────────────── */}

      <div
        style={{
          background:
            'var(--card)',

          borderRadius: 6,

          padding:
            '28px 22px 34px',

          border:
            '1px solid rgba(110,90,130,0.10)',

          boxShadow:
            '0 8px 30px rgba(70,55,90,0.07)',

          position: 'relative',

          overflow: 'hidden'
        }}
      >

        {/* 종이 질감의 세로선 */}

        <div
          style={{
            position: 'absolute',

            left: 10,
            top: 0,
            bottom: 0,

            width: 1,

            background:
              'rgba(150,120,170,0.08)'
          }}
        />


        {/* 제목 */}

        <input
          value={draft.title}
          onChange={e =>
            D(
              'title',
              e.target.value
            )
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
            alignItems: 'center',
            gap: 7,

            marginBottom: 20,

            paddingBottom: 16,

            borderBottom:
              '1px dashed var(--border)'
          }}
        >

          <span
            style={{
              fontSize: 11,
              color: 'var(--sub)'
            }}
          >
            오늘의 기분
          </span>


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
              title={e.label}
              style={{
                width: 30,
                height: 30,

                borderRadius:
                  '50%',

                border:
                  draft.emotion === e.label
                    ? '1.5px solid var(--accent)'
                    : '1px solid transparent',

                background:
                  draft.emotion === e.label
                    ? 'var(--accent-bg)'
                    : 'transparent',

                fontSize: 17,

                cursor: 'pointer'
              }}
            >
              {e.emoji}
            </button>

          ))}

        </div>


        {/* 본문 */}

        <textarea
          value={draft.text}
          onChange={e =>
            D(
              'text',
              e.target.value
            )
          }
          placeholder={
            '오늘 있었던 일을 천천히 적어보세요.\n\n좋았던 일도, 별것 아니었던 일도 괜찮아요.'
          }
          style={{
            width: '100%',

            minHeight: 300,

            border: 'none',

            outline: 'none',

            resize: 'vertical',

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
        />


        {/* 사진 */}

        {draft.photos.length > 0 && (

          <div
            style={{
              marginTop: 22,

              display: 'flex',
              flexDirection: 'column',

              gap: 22
            }}
          >

            {draft.photos.map(
              photo => (

              <div
                key={photo.id}
                style={{
                  position: 'relative',

                  background:
                    '#fff',

                  padding:
                    '10px 10px 14px',

                  boxShadow:
                    '0 5px 18px rgba(50,40,60,0.13)',

                  transform:
                    'rotate(-0.4deg)'
                }}
              >

                {/* 삭제 */}

                <button
                  onClick={() =>
                    removeDraftPhoto(
                      photo.id
                    )
                  }
                  style={{
                    position:
                      'absolute',

                    top: 6,
                    right: 6,

                    zIndex: 2,

                    width: 25,
                    height: 25,

                    borderRadius:
                      '50%',

                    border: 'none',

                    background:
                      'rgba(30,25,35,0.55)',

                    color: '#fff',

                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>


                {/* ★ 사진 원본 비율 유지 */}

                <img
                  src={photoSrc(photo)}
                  alt=""
                  onClick={() =>
                    setViewPhoto(photo)
                  }
                  style={{
                    width: '100%',

                    height: 'auto',

                    display: 'block',

                    borderRadius: 1,

                    cursor: 'pointer'
                  }}
                />


                {/* 사진 메모 */}

                <textarea
                  ref={el => {

                    if (el) {

                      el.style.height =
                        'auto';

                      el.style.height =
                        el.scrollHeight +
                        'px';
                    }

                  }}
                  value={
                    photo.comment || ''
                  }
                  onChange={e => {

                    setPhotoComment(
                      photo.id,
                      e.target.value
                    );

                    e.target.style.height =
                      'auto';

                    e.target.style.height =
                      e.target.scrollHeight +
                      'px';
                  }}
                  placeholder="이 사진에는 어떤 기억이 있나요?"
                  rows={1}
                  style={{
                    width: '100%',

                    border: 'none',

                    outline: 'none',

                    resize: 'none',

                    overflow: 'hidden',

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

            ))}

          </div>

        )}


        {/* 사진 추가 */}

        <button
          onClick={() =>
            fileRef.current?.click()
          }
          style={{
            width: '100%',

            marginTop: 22,

            padding: '12px',

            borderRadius: 10,

            border:
              '1px dashed var(--border)',

            background:
              'transparent',

            color:
              'var(--sub)',

            fontSize: 12,

            cursor: 'pointer'
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

            pickPhotos(
              e.target.files
            );

            e.target.value = '';
          }}
        />

      </div>


      {/* ───────────────────────────────────────
          저장
      ─────────────────────────────────────── */}

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


      {/* ───────────────────────────────────────
          ✦ 오늘 마무리
      ─────────────────────────────────────── */}

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

            fontWeight: 700,

            color:
              'var(--text)'
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

            lineHeight: 1.6
          }}
        >
          오늘의 기록을 바탕으로
          <br />
          조금 객관적인 시선으로 하루를 돌아봐요.
        </div>


        {savedAiReview ? (

          <div
            style={{
              background:
                'var(--card)',

              borderRadius: 14,

              padding:
                '17px 16px',

              border:
                '1px solid var(--border)',

              boxShadow:
                '0 3px 12px rgba(60,45,80,0.05)'
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
              {savedAiReview.review}
            </div>


            {savedAiReview.updatedAt && (

              <div
                style={{
                  marginTop: 13,

                  paddingTop: 10,

                  borderTop:
                    '1px solid var(--border)',

                  fontSize: 10,

                  color:
                    'var(--sub)'
                }}
              >
                오늘의 마무리 · 저장됨
              </div>

            )}

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


        {aiMessage && (

          <div
            style={{
              marginTop: 9,

              fontSize: 11,

              color:
                'var(--sub)',

              textAlign: 'center'
            }}
          >
            {aiMessage}
          </div>

        )}

      </div>


      {/* ───────────────────────────────────────
          달력
      ─────────────────────────────────────── */}

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


      {/* ───────────────────────────────────────
          사진 전체 화면
      ─────────────────────────────────────── */}

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

            alignItems: 'center',

            justifyContent: 'center',

            padding: 20
          }}
        >

          <img
            src={photoSrc(viewPhoto)}
            alt=""

            style={{
              maxWidth: '100%',
              maxHeight: '90vh',

              width: 'auto',
              height: 'auto',

              objectFit: 'contain',

              borderRadius: 4
            }}
          />

        </div>

      )}


      {/* ───────────────────────────────────────
          PIN 변경
      ─────────────────────────────────────── */}

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

              value={newPin}

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

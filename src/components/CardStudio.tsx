import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  Flower2,
  Heart,
  Leaf,
  RotateCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { DESIGNS, Lang } from '../catalog';

interface CardStudioProps {
  lang: Lang;
  selectedDesign: string;
  onApplyToOrder: (designId: string, customMessage: string) => void;
}

type CardFace = 'front' | 'inside' | 'seeds';
type SealKind = 'leaf' | 'bloom' | 'heart';

const INKS = [
  { id: 'forest', hex: '#1d3b2a', label: { en: 'Forest', hi: 'हरा' } },
  { id: 'terracotta', hex: '#a84e34', label: { en: 'Terracotta', hi: 'मिट्टी' } },
  { id: 'charcoal', hex: '#2b2924', label: { en: 'Charcoal', hi: 'चारकोल' } },
  { id: 'indigo', hex: '#283d5e', label: { en: 'Indigo', hi: 'नील' } },
] as const;

const TEMPLATES = [
  {
    id: 'wedding',
    designId: DESIGNS[0].id,
    label: { en: 'Wedding favor', hi: 'शादी रिटर्न गिफ्ट' },
    to: { en: 'Dear Guest', hi: 'प्रिय अतिथि' },
    msg: {
      en: 'Thank you for celebrating our new beginning. Plant this card and watch our gratitude bloom.',
      hi: 'हमारी नई शुरुआत का हिस्सा बनने के लिए दिल से शुक्रिया। इस कार्ड को मिट्टी में लगाएं और हमारी खुशियां खिलते देखें।',
    },
    from: { en: 'Aarav & Meera', hi: 'आरव और मीरा' },
  },
  {
    id: 'teacher',
    designId: DESIGNS[1].id,
    label: { en: 'Teacher note', hi: 'टीचर के लिए' },
    to: { en: 'Dear Ma’am', hi: 'आदरणीय मैम' },
    msg: {
      en: 'Thank you for helping me grow with patience and kindness. May these wildflowers brighten your desk.',
      hi: 'धैर्य और स्नेह से मुझे आगे बढ़ाने के लिए धन्यवाद। उम्मीद है ये फूल आपके दिन को और भी सुंदर बनाएंगे।',
    },
    from: { en: 'Riya', hi: 'रिया' },
  },
  {
    id: 'birthday',
    designId: DESIGNS[2].id,
    label: { en: 'Birthday wish', hi: 'जन्मदिन बधाई' },
    to: { en: 'Happy Birthday Kabir!', hi: 'जन्मदिन मुबारक कबीर!' },
    msg: {
      en: 'Wishing you a year full of sunlight, laughter, and things that keep growing long after today.',
      hi: 'तुम्हारा आने वाला साल धूप, मुस्कान और नई खुशियों से भरा रहे। इसे लगाकर अपना बर्थडे प्लांट उगाओ!',
    },
    from: { en: 'With love, Ananya', hi: 'स्नेह सहित, अनन्या' },
  },
] as const;

const SEED_SPECKS = [
  { x: 16, y: 18, r: 2.6, rot: 22, type: 'marigold' },
  { x: 34, y: 14, r: 2.0, rot: -15, type: 'daisy' },
  { x: 58, y: 21, r: 2.9, rot: 48, type: 'marigold' },
  { x: 79, y: 17, r: 2.1, rot: -32, type: 'basil' },
  { x: 24, y: 38, r: 2.3, rot: 65, type: 'basil' },
  { x: 47, y: 34, r: 3.1, rot: 12, type: 'marigold' },
  { x: 71, y: 36, r: 2.4, rot: -45, type: 'daisy' },
  { x: 86, y: 44, r: 2.0, rot: 30, type: 'basil' },
  { x: 14, y: 58, r: 2.7, rot: -18, type: 'marigold' },
  { x: 38, y: 54, r: 2.2, rot: 75, type: 'daisy' },
  { x: 63, y: 57, r: 2.8, rot: -60, type: 'marigold' },
  { x: 82, y: 66, r: 2.1, rot: 18, type: 'basil' },
  { x: 22, y: 78, r: 2.5, rot: 40, type: 'daisy' },
  { x: 49, y: 74, r: 2.9, rot: -25, type: 'marigold' },
  { x: 72, y: 81, r: 2.2, rot: 52, type: 'basil' },
  { x: 31, y: 88, r: 1.9, rot: -10, type: 'daisy' },
  { x: 60, y: 88, r: 2.4, rot: 28, type: 'marigold' },
  { x: 87, y: 83, r: 2.0, rot: -38, type: 'basil' },
] as const;

export function CardStudio({
  lang,
  selectedDesign,
  onApplyToOrder,
}: CardStudioProps) {
  const initialDesign = useMemo(() => {
    const match = DESIGNS.find((d) => d.id === selectedDesign);
    return match ? match.id : DESIGNS[0].id;
  }, [selectedDesign]);

  const [designId, setDesignId] = useState<string>(initialDesign);

  useEffect(() => {
    const match = DESIGNS.find((d) => d.id === selectedDesign);
    if (match) setDesignId(match.id);
  }, [selectedDesign]);
  const [face, setFace] = useState<CardFace>('front');
  const [inkId, setInkId] = useState<(typeof INKS)[number]['id']>('forest');
  const [seal, setSeal] = useState<SealKind>('leaf');
  const [toText, setToText] = useState<string>(
    lang === 'hi' ? 'प्रिय दोस्त' : 'Dear Maya',
  );
  const [bodyText, setBodyText] = useState<string>(
    lang === 'hi'
      ? 'तुम्हारे स्नेह और साथ के लिए दिल से धन्यवाद। इस कार्ड को मिट्टी में लगाओ और फूल खिलते देखो।'
      : 'Thank you for making every ordinary day brighter. Tear, plant, water, and watch these wildflowers bloom.',
  );
  const [fromText, setFromText] = useState<string>(
    lang === 'hi' ? 'स्नेह सहित, आरव' : 'Warmly, Aarav',
  );
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [appliedFlash, setAppliedFlash] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const activeDesign =
    DESIGNS.find((d) => d.id === designId) || DESIGNS[0];
  const activeInk = INKS.find((i) => i.id === inkId) || INKS[0];

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const rect = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-py * 10).toFixed(2)),
      ry: Number((px * 12).toFixed(2)),
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setDesignId(tpl.designId);
    setToText(tpl.to[lang]);
    setBodyText(tpl.msg[lang]);
    setFromText(tpl.from[lang]);
    setFace('inside');
  };

  const handleUseInOrder = () => {
    const sealName =
      seal === 'leaf' ? 'Leaf Seal' : seal === 'bloom' ? 'Wildflower Seal' : 'Heart Seal';
    const compactNote = [
      toText.trim() ? `To: ${toText.trim()}` : '',
      bodyText.trim() ? `Note: ${bodyText.trim()}` : '',
      fromText.trim() ? `From: ${fromText.trim()}` : '',
      `(${activeInk.label.en} ink, ${sealName})`,
    ]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 390);

    onApplyToOrder(activeDesign.id, compactNote);
    setAppliedFlash(true);
    window.setTimeout(() => setAppliedFlash(false), 2600);
  };

  const handleDownloadPreview = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Warm handmade paper backdrop
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle botanical specks on backdrop
      ctx.fillStyle = 'rgba(79,122,74,0.12)';
      for (let i = 0; i < 42; i++) {
        const sx = (i * 97) % canvas.width;
        const sy = (i * 131) % canvas.height;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 3.2, 1.5, (i % 6) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Header branding
      ctx.fillStyle = '#1d3b2a';
      ctx.font = '700 28px Georgia, serif';
      ctx.fillText('GrowWish · Seed Paper Card Preview', 56, 62);
      ctx.fillStyle = '#5c665a';
      ctx.font = '500 18px sans-serif';
      ctx.fillText(
        `${activeDesign.n.en} · 250 GSM Handmade Plantable Paper`,
        56,
        92,
      );

      // Left card: Front artwork
      const cardY = 126;
      const cardW = 510;
      const cardH = 560;
      ctx.save();
      ctx.shadowColor = 'rgba(29,59,42,0.14)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(56, cardY, cardW, cardH);
      ctx.restore();

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = activeDesign.img;
      });
      if (img.naturalWidth > 0) {
        const pad = 22;
        const boxW = cardW - pad * 2;
        const boxH = cardH - pad * 2;
        const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        ctx.drawImage(
          img,
          56 + pad + (boxW - drawW) / 2,
          cardY + pad + (boxH - drawH) / 2,
          drawW,
          drawH,
        );
      }

      // Right card: Inside personalized note
      const rightX = 620;
      ctx.save();
      ctx.shadowColor = 'rgba(29,59,42,0.14)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(rightX, cardY, cardW, cardH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(29,59,42,0.14)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rightX + 20, cardY + 20, cardW - 40, cardH - 40);

      // Wax seal circle
      ctx.fillStyle = '#c8664a';
      ctx.beginPath();
      ctx.arc(rightX + cardW - 64, cardY + 66, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffdf8';
      ctx.font = '700 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        seal === 'leaf' ? 'GW' : seal === 'bloom' ? '✿' : '♥',
        rightX + cardW - 64,
        cardY + 71,
      );
      ctx.textAlign = 'left';

      // Handwritten text
      ctx.fillStyle = activeInk.hex;
      ctx.font = 'italic 600 30px Georgia, serif';
      ctx.fillText(toText.trim() || 'Dear Friend,', rightX + 48, cardY + 122);

      // Word wrap message
      ctx.font = 'italic 400 24px Georgia, serif';
      const words = (bodyText.trim() || '').split(/\s+/);
      let line = '';
      let y = cardY + 184;
      const maxW = cardW - 96;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, rightX + 48, y);
          line = word;
          y += 38;
          if (y > cardY + cardH - 120) break;
        } else {
          line = test;
        }
      }
      if (line && y <= cardY + cardH - 120) {
        ctx.fillText(line, rightX + 48, y);
      }

      ctx.font = 'italic 600 26px Georgia, serif';
      ctx.fillText(
        fromText.trim() || '— GrowWish',
        rightX + 48,
        cardY + cardH - 64,
      );

      // Footer
      ctx.fillStyle = '#5c665a';
      ctx.font = '500 15px sans-serif';
      ctx.fillText(
        'Plant it · Water it · Watch it grow — GrowWish Handmade Seed Paper',
        56,
        724,
      );

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'GrowWish-Card-Preview.png';
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const t = {
    en: {
      kicker: 'Interactive card studio',
      h2a: 'Preview your card',
      h2em: 'before we press it.',
      sub: 'Pick an artwork, write a personal note, flip between the cover, inside handwriting, and embedded wildflower seeds — then send it straight to your order.',
      front: 'Front cover',
      inside: 'Inside note',
      seeds: 'Seed fiber macro',
      flipHint: 'Hover to tilt · Click tabs or flip button to inspect every layer',
      chooseArt: '1. Choose artwork',
      quickTpl: 'Quick message ideas',
      toLbl: 'To',
      msgLbl: 'Inside message',
      fromLbl: 'From',
      inkLbl: 'Handwriting ink',
      sealLbl: 'Envelope wax seal',
      useBtn: 'Use this card in my order',
      appliedBtn: 'Added to your order form ↓',
      dlBtn: 'Download PNG preview',
      seedCaptionTitle: '250 GSM Cotton-Pulp Seed Sheet',
      seedCaptionDesc:
        'Each sheet holds 30+ non-GMO marigold, daisy & wildflower seeds pressed directly into damp recycled pulp—zero glue, zero plastic.',
      sealLeaf: 'Leaf',
      sealBloom: 'Bloom',
      sealHeart: 'Heart',
    },
    hi: {
      kicker: 'इंटरैक्टिव कार्ड स्टूडियो',
      h2a: 'ऑर्डर से पहले अपना कार्ड',
      h2em: 'लाइव डिज़ाइन करें।',
      sub: 'अपना पसंदीदा डिज़ाइन चुनें, अंदर का संदेश लिखें, फ्रंट कवर, लिखावट और कागज़ के अंदर दबे वाइल्डफ्लावर बीज देखें — और एक क्लिक में ऑर्डर में जोड़ें।',
      front: 'फ्रंट कवर',
      inside: 'अंदर का संदेश',
      seeds: 'बीज वाला कागज़',
      flipHint: 'कार्ड घुमाने के लिए टैब या फ्लिप बटन दबाएं',
      chooseArt: '1. डिज़ाइन चुनें',
      quickTpl: 'तैयार संदेश आइडिया',
      toLbl: 'किसके लिए (To)',
      msgLbl: 'अंदर का संदेश',
      fromLbl: 'किसकी तरफ से (From)',
      inkLbl: 'स्याही का रंग',
      sealLbl: 'लिफाफा वैक्स सील',
      useBtn: 'यह कार्ड मेरे ऑर्डर में जोड़ें',
      appliedBtn: 'ऑर्डर फॉर्म में जुड़ गया ↓',
      dlBtn: 'PNG प्रीव्यू डाउनलोड करें',
      seedCaptionTitle: '250 GSM हैंडमेड कॉटन-पल्प सीड पेपर',
      seedCaptionDesc:
        'हर कार्ड में 30+ गेंदा, डेज़ी और वाइल्डफ्लावर के असली बीज गीले रीसायकल्ड पल्प में हाथ से दबाए जाते हैं — बिना किसी प्लास्टिक या केमिकल के।',
      sealLeaf: 'पत्ती',
      sealBloom: 'फूल',
      sealHeart: 'दिल',
    },
  }[lang];

  return (
    <section id="studio" className="studio-sec">
      <div className="w">
        <div className="head rv">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h2>
              {t.h2a} <em>{t.h2em}</em>
            </h2>
          </div>
          <p className="mu">{t.sub}</p>
        </div>

        <div className="studio-grid">
          {/* Left: Interactive 3D Tactile Card Stage */}
          <div className="studio-stage-wrap">
            <div className="studio-view-bar" role="tablist" aria-label="Card preview angle">
              <button
                type="button"
                role="tab"
                aria-selected={face === 'front'}
                className={face === 'front' ? 'active' : ''}
                onClick={() => setFace('front')}
              >
                <Eye size={14} /> {t.front}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={face === 'inside'}
                className={face === 'inside' ? 'active' : ''}
                onClick={() => setFace('inside')}
              >
                <Sparkles size={14} /> {t.inside}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={face === 'seeds'}
                className={face === 'seeds' ? 'active' : ''}
                onClick={() => setFace('seeds')}
              >
                <Flower2 size={14} /> {t.seeds}
              </button>
            </div>

            <div
              ref={stageRef}
              className="studio-stage"
              onMouseMove={handlePointerMove}
              onMouseLeave={handlePointerLeave}
            >
              <div
                className={`studio-card-3d face-${face}`}
                style={{
                  transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                }}
              >
                {face === 'front' && (
                  <div className="studio-face studio-front">
                    <div className="studio-deckle-frame">
                      <img
                        src={activeDesign.img}
                        alt={activeDesign.n[lang]}
                        loading="lazy"
                      />
                    </div>
                    <div className="studio-front-foot">
                      <span>{activeDesign.n[lang]}</span>
                      <span className="studio-gsm">250 GSM · 30+ seeds</span>
                    </div>
                  </div>
                )}

                {face === 'inside' && (
                  <div className="studio-face studio-inside">
                    <div className="studio-inside-border">
                      <div className="studio-wax-seal" aria-label="Wax seal">
                        {seal === 'leaf' && <Leaf size={17} />}
                        {seal === 'bloom' && <Flower2 size={17} />}
                        {seal === 'heart' && <Heart size={17} />}
                      </div>

                      <div
                        className="studio-note-to"
                        style={{ color: activeInk.hex }}
                      >
                        {toText.trim() || (lang === 'hi' ? 'प्रिय दोस्त,' : 'Dear Friend,')}
                      </div>

                      <p
                        className="studio-note-body"
                        style={{ color: activeInk.hex }}
                      >
                        {bodyText.trim() ||
                          (lang === 'hi'
                            ? 'यहाँ आपका प्यारा सा संदेश दिखेगा...'
                            : 'Your personal handwritten wish appears right here...')}
                      </p>

                      <div
                        className="studio-note-from"
                        style={{ color: activeInk.hex }}
                      >
                        {fromText.trim() || '— GrowWish'}
                      </div>

                      <div className="studio-inside-watermark">
                        GrowWish · Plant this paper after reading
                      </div>
                    </div>
                  </div>
                )}

                {face === 'seeds' && (
                  <div className="studio-face studio-seeds">
                    <svg
                      className="studio-seed-svg"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="xMidYMid slice"
                      aria-hidden="true"
                    >
                      <defs>
                        <radialGradient id="pulpGlow" cx="50%" cy="45%" r="65%">
                          <stop offset="0%" stopColor="#fffdf6" />
                          <stop offset="100%" stopColor="#e8dec9" />
                        </radialGradient>
                      </defs>
                      <rect width="100" height="100" fill="url(#pulpGlow)" />
                      {/* Fine cotton paper fibers */}
                      <g stroke="#b8ab92" strokeWidth="0.35" opacity="0.55" fill="none">
                        <path d="M5 12 Q 28 19, 44 10" />
                        <path d="M52 24 Q 70 18, 92 27" />
                        <path d="M12 44 Q 35 50, 56 41" />
                        <path d="M40 65 Q 68 58, 94 68" />
                        <path d="M8 82 Q 30 76, 54 86" />
                        <path d="M62 88 Q 78 82, 95 90" />
                      </g>
                      {/* Embedded organic seeds */}
                      {SEED_SPECKS.map((s, idx) => (
                        <g
                          key={idx}
                          transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`}
                        >
                          <ellipse
                            cx="0"
                            cy="0"
                            rx={s.r}
                            ry={s.r * 0.45}
                            fill={
                              s.type === 'marigold'
                                ? '#3b2d20'
                                : s.type === 'daisy'
                                  ? '#7b5f3c'
                                  : '#2c462e'
                            }
                            opacity="0.88"
                          />
                          <ellipse
                            cx={s.r * 0.35}
                            cy={-0.1}
                            rx={s.r * 0.25}
                            ry={s.r * 0.16}
                            fill="#e2a93b"
                            opacity="0.7"
                          />
                        </g>
                      ))}
                    </svg>

                    <div className="studio-seed-overlay">
                      <div className="studio-seed-kicker">10× Macro Fiber View</div>
                      <h4>{t.seedCaptionTitle}</h4>
                      <p>{t.seedCaptionDesc}</p>
                      <div className="studio-seed-legend">
                        <span>● Marigold</span>
                        <span>● Wild Daisy</span>
                        <span>● Sweet Basil</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="studio-flip-fab"
                onClick={() =>
                  setFace((f) =>
                    f === 'front' ? 'inside' : f === 'inside' ? 'seeds' : 'front',
                  )
                }
                aria-label="Cycle card view"
              >
                <RotateCw size={15} />
                <span>
                  {face === 'front'
                    ? t.inside
                    : face === 'inside'
                      ? t.seeds
                      : t.front}
                </span>
              </button>
            </div>

            <p className="studio-stage-hint">{t.flipHint}</p>
          </div>

          {/* Right: Customization Controls */}
          <div className="studio-panel">
            <div className="studio-block">
              <div className="studio-lbl">{t.chooseArt}</div>
              <div className="studio-art-grid">
                {DESIGNS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`studio-art-btn${designId === d.id ? ' active' : ''}`}
                    onClick={() => {
                      setDesignId(d.id);
                      if (face === 'seeds') setFace('front');
                    }}
                  >
                    <img src={d.img} alt="" loading="lazy" />
                    <span>{d.n[lang]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-block">
              <div className="studio-lbl">{t.quickTpl}</div>
              <div className="studio-tpl-row">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="studio-tpl-btn"
                    onClick={() => applyTemplate(tpl)}
                  >
                    {tpl.label[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-inputs">
              <div className="studio-input-row">
                <label className="studio-field">
                  <span>{t.toLbl}</span>
                  <input
                    type="text"
                    value={toText}
                    maxLength={48}
                    onFocus={() => setFace('inside')}
                    onChange={(e) => setToText(e.target.value)}
                  />
                </label>
                <label className="studio-field">
                  <span>{t.fromLbl}</span>
                  <input
                    type="text"
                    value={fromText}
                    maxLength={48}
                    onFocus={() => setFace('inside')}
                    onChange={(e) => setFromText(e.target.value)}
                  />
                </label>
              </div>

              <label className="studio-field">
                <span>
                  {t.msgLbl}{' '}
                  <em className="tabular-nums">({bodyText.length}/220)</em>
                </span>
                <textarea
                  rows={3}
                  value={bodyText}
                  maxLength={220}
                  onFocus={() => setFace('inside')}
                  onChange={(e) => setBodyText(e.target.value)}
                />
              </label>
            </div>

            <div className="studio-style-row">
              <div>
                <div className="studio-lbl">{t.inkLbl}</div>
                <div className="studio-swatch-row">
                  {INKS.map((ink) => (
                    <button
                      key={ink.id}
                      type="button"
                      className={`studio-swatch${inkId === ink.id ? ' active' : ''}`}
                      style={{ background: ink.hex }}
                      title={ink.label[lang]}
                      aria-label={ink.label[lang]}
                      onClick={() => {
                        setInkId(ink.id);
                        setFace('inside');
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="studio-lbl">{t.sealLbl}</div>
                <div className="studio-seal-row">
                  {(
                    [
                      ['leaf', t.sealLeaf, Leaf],
                      ['bloom', t.sealBloom, Flower2],
                      ['heart', t.sealHeart, Heart],
                    ] as const
                  ).map(([id, lbl, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      className={`studio-seal-btn${seal === id ? ' active' : ''}`}
                      onClick={() => {
                        setSeal(id);
                        setFace('inside');
                      }}
                    >
                      <Icon size={14} /> {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="studio-actions">
              <button
                type="button"
                className="btn clay"
                onClick={handleUseInOrder}
              >
                {appliedFlash ? <Check size={16} /> : <Send size={15} />}
                <span>{appliedFlash ? t.appliedBtn : t.useBtn}</span>
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={downloading}
                onClick={handleDownloadPreview}
              >
                <Download size={15} />
                <span>{t.dlBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

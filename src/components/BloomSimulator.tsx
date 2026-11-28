import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Droplets,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Sprout,
  Sun,
} from 'lucide-react';
import { Lang, PRODUCTS } from '../catalog';

interface BloomSimulatorProps {
  lang: Lang;
  onApplyPack: (packIdx: number, qty: number, occasionNote: string) => void;
}

interface StageInfo {
  range: [number, number];
  title: { en: string; hi: string };
  water: { en: string; hi: string };
  light: { en: string; hi: string };
  tip: { en: string; hi: string };
}

const STAGES: StageInfo[] = [
  {
    range: [1, 3],
    title: { en: 'Paper softens in soil', hi: 'मिट्टी में कागज़ घुलना शुरू' },
    water: { en: 'Mist twice daily', hi: 'दिन में 2 बार हल्का छिड़काव' },
    light: { en: 'Bright indirect light', hi: 'हल्की रोशनी (सीधी धूप नहीं)' },
    tip: {
      en: 'Tear card into 4–6 pieces, cover with a 0.5 cm dusting of potting soil, and keep gently damp.',
      hi: 'कार्ड के 4–6 टुकड़े करके मिट्टी पर रखें और ऊपर आधा सेमी हल्की मिट्टी डालकर नम रखें।',
    },
  },
  {
    range: [4, 7],
    title: { en: 'First roots & germination', hi: 'पहली जड़ें और अंकुरण' },
    water: { en: 'Keep soil damp', hi: 'मिट्टी को नम बनाए रखें' },
    light: { en: 'Warm morning sun', hi: 'सुबह की हल्की धूप' },
    tip: {
      en: 'Cotton paper fibers naturally compost while wildflower seeds split open and anchor tiny roots.',
      hi: 'कॉटन पेपर प्राकृतिक रूप से खाद बनता है और वाइल्डफ्लावर बीज जड़ पकड़ने लगते हैं।',
    },
  },
  {
    range: [8, 14],
    title: { en: 'Fresh twin sprouts emerge', hi: 'नन्हे हरे अंकुर बाहर निकले' },
    water: { en: 'Light morning watering', hi: 'सुबह हल्का पानी दें' },
    light: { en: '3–4 hrs gentle sunlight', hi: '3–4 घंटे हल्की धूप' },
    tip: {
      en: 'First green shoots break through! Move the pot closer to a sunny windowsill or balcony ledge.',
      hi: 'पहले हरे अंकुर दिखने लगे हैं! अब गमले को खिड़की या बालकनी की धूप वाली जगह पर रखें।',
    },
  },
  {
    range: [15, 21],
    title: { en: 'Stems strengthen & buds form', hi: 'तने मज़बूत और कलियाँ बनीं' },
    water: { en: 'Water when top soil dries', hi: 'ऊपरी मिट्टी सूखने पर पानी दें' },
    light: { en: '4–5 hrs direct sunlight', hi: '4–5 घंटे सीधी धूप' },
    tip: {
      en: 'True serrated leaves grow tall and tight marigold & daisy buds start coloring at the tips.',
      hi: 'असली पत्तियां बड़ी होने लगती हैं और टहनियों के सिरे पर फूलों की कलियाँ बनने लगती हैं।',
    },
  },
  {
    range: [22, 28],
    title: { en: 'Wildflowers in full bloom', hi: 'रंग-बिरंगे फूल खिल उठे!' },
    water: { en: 'Regular light watering', hi: 'नियमित हल्का पानी' },
    light: { en: 'Full balcony sunlight', hi: 'पूरी बालकनी धूप' },
    tip: {
      en: 'Your greeting card is now a living windowsill bouquet — attracting bees and lasting months.',
      hi: 'आपका ग्रीटिंग कार्ड अब एक जीवित फूलों का पौधा बन गया है — जो महीनों तक खिलता रहेगा।',
    },
  },
];

const SEED_GUIDES = [
  {
    id: 'marigold',
    name: { en: 'Marigold (Genda)', hi: 'गेंदा (Marigold)' },
    sprout: '6–9 days',
    sun: { en: 'Full sun', hi: 'तेज़ धूप' },
    note: {
      en: 'Hardy Indian climate favorite with bright saffron-gold blooms.',
      hi: 'भारतीय मौसम के लिए सबसे बेहतरीन, सुनहरे-नारंगी फूल।',
    },
  },
  {
    id: 'wildflower',
    name: { en: 'Wildflower Mix', hi: 'वाइल्डफ्लावर मिक्स' },
    sprout: '7–12 days',
    sun: { en: 'Partial–full sun', hi: 'हल्की से पूरी धूप' },
    note: {
      en: 'Pollinator-friendly daisies, poppies, and cosmos in cheerful colors.',
      hi: 'डेज़ी, पॉपी और कॉसमॉस के रंग-बिरंगे फूल जो तितलियों को भाते हैं।',
    },
  },
  {
    id: 'basil',
    name: { en: 'Sweet Basil', hi: 'मीठी तुलसी (Basil)' },
    sprout: '8–14 days',
    sun: { en: 'Sunny windowsill', hi: 'खिड़की की धूप' },
    note: {
      en: 'Fragrant kitchen herb that grows easily in small indoor pots.',
      hi: 'खुशबूदार हर्ब जो घर के छोटे गमले में भी आसानी से उगती है।',
    },
  },
] as const;

const EVENT_PRESETS = [
  { id: 'bday', count: 10, label: { en: 'Birthday · 10', hi: 'जन्मदिन · 10' } },
  { id: 'teacher', count: 25, label: { en: "Teachers' Day · 25", hi: 'टीचर्स डे · 25' } },
  { id: 'wedding', count: 100, label: { en: 'Wedding · 100', hi: 'शादी · 100' } },
  { id: 'corp', count: 200, label: { en: 'Corporate · 200', hi: 'कॉर्पोरेट · 200' } },
] as const;

export function BloomSimulator({ lang, onApplyPack }: BloomSimulatorProps) {
  const [day, setDay] = useState<number>(14);
  const [playing, setPlaying] = useState<boolean>(false);
  const [seedIdx, setSeedIdx] = useState<number>(0);

  // Eco-impact & event estimator state
  const [cardCount, setCardCount] = useState<number>(25);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setDay((prev) => {
        if (prev >= 28) {
          setPlaying(false);
          return 28;
        }
        return prev + 1;
      });
    }, 320);
    return () => window.clearInterval(id);
  }, [playing]);

  const stage = useMemo(() => {
    return (
      STAGES.find((s) => day >= s.range[0] && day <= s.range[1]) || STAGES[0]
    );
  }, [day]);

  // Compute cheapest exact real pack recommendation from PRODUCTS
  const recommendation = useMemo(() => {
    let bestIdx = 0;
    let bestQty = 1;
    let bestTotal = Number.POSITIVE_INFINITY;

    PRODUCTS.forEach((p, idx) => {
      const qtyNeeded = Math.max(1, Math.ceil(cardCount / p.c));
      const cost = qtyNeeded * p.p;
      if (cost < bestTotal) {
        bestTotal = cost;
        bestIdx = idx;
        bestQty = qtyNeeded;
      }
    });

    const chosenPack = PRODUCTS[bestIdx];
    const totalCards = chosenPack.c * bestQty;
    const perCard = Math.round(bestTotal / totalCards);
    const baselinePer5 = Math.ceil(totalCards / PRODUCTS[0].c) * PRODUCTS[0].p;
    const savings = Math.max(0, baselinePer5 - bestTotal);

    return {
      packIdx: bestIdx,
      packName: chosenPack.n.replace('Seed Paper – ', ''),
      qty: bestQty,
      totalCards,
      totalPrice: bestTotal,
      perCard,
      savings,
      seedsPlanted: totalCards * 30,
      pulpGrams: totalCards * 12,
    };
  }, [cardCount]);

  // Normalized growth progress 0..1 for SVG interpolation
  const p = (day - 1) / 27;
  const paperOpacity = Math.max(0, 1 - Math.max(0, (day - 2) / 9));
  const rootProgress = Math.min(1, Math.max(0, (day - 3) / 6));
  const sproutProgress = Math.min(1, Math.max(0, (day - 6) / 7));
  const stemProgress = Math.min(1, Math.max(0, (day - 12) / 9));
  const bloomProgress = Math.min(1, Math.max(0, (day - 20) / 7));

  const activeSeed = SEED_GUIDES[seedIdx];

  const t = {
    en: {
      simKicker: 'Interactive 28-day growth tracker',
      simTitleA: 'Drag the timeline to',
      simTitleEm: 'watch it bloom.',
      dayWord: 'Day',
      play: 'Play time-lapse',
      pause: 'Pause',
      replay: 'Replay',
      water: 'Watering',
      light: 'Sunlight',
      seedGuide: 'Seeds pressed inside',
      sproutsIn: 'Sprouts in',
      calcKicker: 'Smart pack & eco-impact planner',
      calcTitleA: 'Planning for an event?',
      calcTitleEm: 'Calculate your impact.',
      calcSub:
        'Slide how many cards you need — we automatically match the lowest-cost GrowWish pack and calculate your plastic-free footprint.',
      cardsNeeded: 'Cards you want to gift',
      recPack: 'Best value recommendation',
      perCard: '/ card',
      youSave: 'You save',
      vsSmall: 'vs Pack of 5',
      impactPlastic: 'Laminated cards kept out of landfill',
      impactSeeds: 'Wildflower seeds planted',
      impactPulp: 'Upcycled cotton pulp',
      footnote:
        'Estimates based on ~30 wildflower seeds and ~12 g handmade cotton-pulp paper per GrowWish card.',
      applyBtn: 'Apply this pack to my order',
    },
    hi: {
      simKicker: 'इंटरैक्टिव 28-दिन ग्रोथ सिम्युलेटर',
      simTitleA: 'स्लाइडर घुमाएं और',
      simTitleEm: 'फूल खिलते देखें।',
      dayWord: 'दिन',
      play: 'टाइम-लैप्स चलाएं',
      pause: 'रोकें',
      replay: 'फिर से देखें',
      water: 'पानी',
      light: 'धूप',
      seedGuide: 'कागज़ के अंदर कौन से बीज हैं',
      sproutsIn: 'अंकुरण समय',
      calcKicker: 'स्मार्ट पैक और इको-इम्पैक्ट कैलकुलेटर',
      calcTitleA: 'किसी इवेंट के लिए चाहिए?',
      calcTitleEm: 'सही पैक और असर जानें।',
      calcSub:
        'बताएं आपको कितने कार्ड चाहिए — हम सबसे किफायती GrowWish पैक चुनेंगे और आपका प्लास्टिक-फ्री योगदान दिखाएंगे।',
      cardsNeeded: 'आपको कितने कार्ड चाहिए',
      recPack: 'सबसे किफायती सुझाव',
      perCard: '/ कार्ड',
      youSave: 'आपकी बचत',
      vsSmall: '5-पैक के मुकाबले',
      impactPlastic: 'प्लास्टिक कार्ड कचरे से बचे',
      impactSeeds: 'वाइल्डफ्लावर बीज लगेंगे',
      impactPulp: 'रीसायकल्ड कॉटन पेपर',
      footnote:
        'अनुमान प्रति GrowWish कार्ड लगभग 30 वाइल्डफ्लावर बीज और 12 ग्राम हैंडमेड कॉटन पेपर पर आधारित है।',
      applyBtn: 'यह पैक ऑर्डर फॉर्म में लगाएं',
    },
  }[lang];

  return (
    <section id="bloom" className="bloom-sec">
      <div className="w">
        <div className="bloom-layout">
          {/* Left: 28-Day Botanical Time-Lapse */}
          <div className="bloom-card rv">
            <div className="bloom-head">
              <div>
                <div className="kicker">{t.simKicker}</div>
                <h3>
                  {t.simTitleA} <em>{t.simTitleEm}</em>
                </h3>
              </div>
              <div className="bloom-day-readout tabular-nums">
                <span>{t.dayWord}</span>
                <strong>{day}</strong>
                <small>/ 28</small>
              </div>
            </div>

            <div className="bloom-canvas">
              <svg
                viewBox="0 0 360 250"
                className="bloom-svg"
                role="img"
                aria-label={`Plant growth at day ${day}: ${stage.title[lang]}`}
              >
                <defs>
                  <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f9f3e3" />
                    <stop offset="100%" stopColor="#efe6d3" />
                  </linearGradient>
                  <linearGradient id="potClay" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#b5543a" />
                    <stop offset="50%" stopColor="#cf6f52" />
                    <stop offset="100%" stopColor="#a34931" />
                  </linearGradient>
                </defs>

                {/* Soft sunlit backdrop */}
                <rect width="360" height="250" rx="16" fill="url(#skyWarm)" />

                {/* Sun moving subtly across sky with day progress */}
                <g
                  transform={`translate(${66 + p * 218}, ${48 - Math.sin(p * Math.PI) * 16})`}
                  opacity={0.85}
                >
                  <circle r="22" fill="#e2a93b" opacity="0.18" />
                  <circle r="13" fill="#e2a93b" />
                </g>

                {/* Ground shadow */}
                <ellipse cx="180" cy="232" rx="74" ry="8" fill="rgba(29,59,42,0.12)" />

                {/* Terracotta pot */}
                <path
                  d="M126 176 L234 176 L220 228 Q218 232 212 232 L148 232 Q142 232 140 228 Z"
                  fill="url(#potClay)"
                />
                <rect
                  x="118"
                  y="164"
                  width="124"
                  height="15"
                  rx="6"
                  fill="#c8664a"
                  stroke="#9c452d"
                  strokeWidth="1"
                />

                {/* Soil mound */}
                <ellipse cx="180" cy="166" rx="55" ry="9" fill="#4f3a2a" />
                <ellipse cx="180" cy="165" rx="46" ry="6" fill="#634a36" />

                {/* Stage 1: Torn seed paper pieces softening into soil */}
                {paperOpacity > 0.02 && (
                  <g opacity={paperOpacity}>
                    <rect
                      x="146"
                      y="156"
                      width="20"
                      height="11"
                      rx="2"
                      fill="#fffdf8"
                      stroke="#d9ceb9"
                      transform="rotate(-12 156 161)"
                    />
                    <rect
                      x="170"
                      y="154"
                      width="22"
                      height="12"
                      rx="2"
                      fill="#fffdf8"
                      stroke="#d9ceb9"
                      transform="rotate(9 181 160)"
                    />
                    <rect
                      x="194"
                      y="157"
                      width="18"
                      height="10"
                      rx="2"
                      fill="#fffdf8"
                      stroke="#d9ceb9"
                      transform="rotate(-6 203 162)"
                    />
                  </g>
                )}

                {/* Stage 2: Tiny germination tips */}
                {rootProgress > 0 && (
                  <g
                    opacity={rootProgress}
                    stroke="#6b9659"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                  >
                    <path d={`M162 164 Q160 ${164 - rootProgress * 11}, 157 ${164 - rootProgress * 14}`} />
                    <path d={`M180 164 Q181 ${164 - rootProgress * 15}, 180 ${164 - rootProgress * 18}`} />
                    <path d={`M198 164 Q200 ${164 - rootProgress * 10}, 203 ${164 - rootProgress * 13}`} />
                  </g>
                )}

                {/* Stage 3 & 4: Growing stems & leaves */}
                {sproutProgress > 0 && (
                  <g>
                    {/* Center main stem */}
                    <path
                      d={`M180 165 Q176 ${165 - (24 + stemProgress * 64) * 0.55}, 180 ${165 - (24 + stemProgress * 64)}`}
                      stroke="#3c6638"
                      strokeWidth={2.5 + stemProgress * 1.4}
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Left companion stem */}
                    <path
                      d={`M164 165 Q154 ${165 - (16 + stemProgress * 50) * 0.6}, ${148 - stemProgress * 10} ${165 - (16 + stemProgress * 50)}`}
                      stroke="#4f7a4a"
                      strokeWidth={2.1 + stemProgress * 1.1}
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Right companion stem */}
                    <path
                      d={`M196 165 Q206 ${165 - (18 + stemProgress * 54) * 0.6}, ${212 + stemProgress * 10} ${165 - (18 + stemProgress * 54)}`}
                      stroke="#4f7a4a"
                      strokeWidth={2.1 + stemProgress * 1.1}
                      strokeLinecap="round"
                      fill="none"
                    />

                    {/* Lower cotyledon leaves */}
                    <g
                      transform={`translate(180, ${146 - stemProgress * 18}) scale(${0.4 + sproutProgress * 0.65})`}
                    >
                      <path d="M0 0 C-6 -10, -22 -12, -24 -2 C-16 4, -6 4, 0 0Z" fill="#5e8d55" />
                      <path d="M0 0 C6 -10, 22 -12, 24 -2 C16 4, 6 4, 0 0Z" fill="#4f7a4a" />
                    </g>

                    {/* Upper lush foliage */}
                    {stemProgress > 0.1 && (
                      <>
                        <g
                          transform={`translate(180, ${126 - stemProgress * 22}) scale(${stemProgress})`}
                        >
                          <path d="M0 0 C-8 -12, -26 -14, -28 -2 C-18 6, -7 4, 0 0Z" fill="#4f7a4a" />
                          <path d="M0 0 C8 -12, 26 -14, 28 -2 C18 6, 7 4, 0 0Z" fill="#3a6337" />
                        </g>
                        <g
                          transform={`translate(${153 - stemProgress * 4}, ${135 - stemProgress * 14}) scale(${stemProgress * 0.82})`}
                        >
                          <path d="M0 0 C-10 -8, -22 -4, -20 5 C-11 8, -4 5, 0 0Z" fill="#5e8d55" />
                        </g>
                        <g
                          transform={`translate(${207 + stemProgress * 4}, ${133 - stemProgress * 14}) scale(${stemProgress * 0.82})`}
                        >
                          <path d="M0 0 C10 -8, 22 -4, 20 5 C11 8, 4 5, 0 0Z" fill="#5e8d55" />
                        </g>
                      </>
                    )}
                  </g>
                )}

                {/* Buds (days 16-22) */}
                {stemProgress > 0.45 && bloomProgress < 0.7 && (
                  <g opacity={Math.min(1, (stemProgress - 0.45) * 2.2) * (1 - bloomProgress * 0.8)}>
                    <circle cx="180" cy={165 - (24 + stemProgress * 64)} r="6" fill="#e2a93b" />
                    <circle
                      cx={148 - stemProgress * 10}
                      cy={165 - (16 + stemProgress * 50)}
                      r="5"
                      fill="#c8664a"
                    />
                    <circle
                      cx={212 + stemProgress * 10}
                      cy={165 - (18 + stemProgress * 54)}
                      r="5"
                      fill="#fffdf8"
                      stroke="#d9ceb9"
                    />
                  </g>
                )}

                {/* Stage 5: Full Wildflower Blooms (Days 21-28) */}
                {bloomProgress > 0 && (
                  <g>
                    {/* Center golden marigold */}
                    <g transform={`translate(180, 74) scale(${0.2 + bloomProgress * 0.85})`}>
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
                        <ellipse
                          key={ang}
                          cx="0"
                          cy="-12"
                          rx="6.2"
                          ry="10"
                          fill="#e2a93b"
                          transform={`rotate(${ang})`}
                        />
                      ))}
                      {[22, 67, 112, 157, 202, 247, 292, 337].map((ang) => (
                        <ellipse
                          key={ang}
                          cx="0"
                          cy="-9"
                          rx="4.6"
                          ry="7.5"
                          fill="#d68b2d"
                          transform={`rotate(${ang})`}
                        />
                      ))}
                      <circle r="6" fill="#9c452d" />
                    </g>

                    {/* Left terracotta poppy */}
                    <g transform={`translate(138, 98) scale(${0.2 + bloomProgress * 0.78})`}>
                      {[0, 72, 144, 216, 288].map((ang) => (
                        <ellipse
                          key={ang}
                          cx="0"
                          cy="-10"
                          rx="6.8"
                          ry="9.5"
                          fill="#c8664a"
                          transform={`rotate(${ang})`}
                        />
                      ))}
                      <circle r="4.8" fill="#1d3b2a" />
                      <circle r="2" fill="#e2a93b" />
                    </g>

                    {/* Right white wild daisy */}
                    <g transform={`translate(222, 92) scale(${0.2 + bloomProgress * 0.8})`}>
                      {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((ang) => (
                        <ellipse
                          key={ang}
                          cx="0"
                          cy="-11"
                          rx="4.2"
                          ry="9"
                          fill="#fffdf8"
                          stroke="#dfd4be"
                          strokeWidth="0.7"
                          transform={`rotate(${ang})`}
                        />
                      ))}
                      <circle r="5.5" fill="#e2a93b" />
                    </g>
                  </g>
                )}
              </svg>
            </div>

            {/* Scrubber & Play controls */}
            <div className="bloom-controls">
              <div className="bloom-btn-group">
                <button
                  type="button"
                  className="bloom-play-btn"
                  onClick={() => {
                    if (day >= 28 && !playing) setDay(1);
                    setPlaying((prev) => !prev);
                  }}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                  <span>
                    {playing ? t.pause : day >= 28 ? t.replay : t.play}
                  </span>
                </button>
                <button
                  type="button"
                  className="bloom-reset-btn"
                  aria-label="Reset to Day 1"
                  onClick={() => {
                    setPlaying(false);
                    setDay(1);
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="bloom-slider-wrap">
                <input
                  type="range"
                  min={1}
                  max={28}
                  value={day}
                  aria-label="Growth day"
                  onChange={(e) => {
                    setPlaying(false);
                    setDay(Number(e.target.value));
                  }}
                />
                <div className="bloom-ticks tabular-nums">
                  <span>Day 1</span>
                  <span>Day 7</span>
                  <span>Day 14</span>
                  <span>Day 21</span>
                  <span>Day 28</span>
                </div>
              </div>
            </div>

            {/* Care specs for current stage */}
            <div className="bloom-stage-box">
              <div className="bloom-stage-title">
                <Sprout size={16} />
                <strong>{stage.title[lang]}</strong>
              </div>
              <p>{stage.tip[lang]}</p>
              <div className="bloom-care-meta">
                <span>
                  <Droplets size={13} /> <b>{t.water}:</b> {stage.water[lang]}
                </span>
                <span>
                  <Sun size={13} /> <b>{t.light}:</b> {stage.light[lang]}
                </span>
              </div>
            </div>

            {/* Seed variety tabs */}
            <div className="bloom-seed-guide">
              <div className="bloom-seed-head">
                <span className="bloom-seed-lbl">{t.seedGuide}</span>
                <div className="bloom-seed-tabs">
                  {SEED_GUIDES.map((sg, idx) => (
                    <button
                      key={sg.id}
                      type="button"
                      className={seedIdx === idx ? 'active' : ''}
                      onClick={() => setSeedIdx(idx)}
                    >
                      {sg.name[lang]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="bloom-seed-desc">
                {activeSeed.note[lang]}{' '}
                <span className="tabular-nums">
                  · {t.sproutsIn} <b>{activeSeed.sprout}</b> · {activeSeed.sun[lang]}
                </span>
              </p>
            </div>
          </div>

          {/* Right: Smart Event Pack & Eco-Impact Estimator */}
          <div className="eco-card rv">
            <div className="kicker">{t.calcKicker}</div>
            <h3>
              {t.calcTitleA} <em>{t.calcTitleEm}</em>
            </h3>
            <p className="mu eco-sub">{t.calcSub}</p>

            <div className="eco-presets">
              {EVENT_PRESETS.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={cardCount === ev.count ? 'active' : ''}
                  onClick={() => setCardCount(ev.count)}
                >
                  {ev.label[lang]}
                </button>
              ))}
            </div>

            <div className="eco-slider-box">
              <div className="eco-slider-top">
                <span>{t.cardsNeeded}</span>
                <strong className="tabular-nums">{cardCount}</strong>
              </div>
              <input
                type="range"
                min={5}
                max={250}
                step={5}
                value={cardCount}
                aria-label="Number of cards"
                onChange={(e) => setCardCount(Number(e.target.value))}
              />
            </div>

            <div className="eco-rec-box">
              <div className="eco-rec-top">
                <div>
                  <span className="eco-rec-kicker">{t.recPack}</span>
                  <strong className="tabular-nums">
                    {recommendation.packName} × {recommendation.qty}
                  </strong>
                  <small className="tabular-nums">
                    ({recommendation.totalCards}{' '}
                    {lang === 'hi' ? 'कुल कार्ड' : 'total cards'})
                  </small>
                </div>
                <div className="eco-rec-price tabular-nums">
                  <b>₹{recommendation.totalPrice.toLocaleString('en-IN')}</b>
                  <span>
                    ₹{recommendation.perCard} {t.perCard}
                  </span>
                </div>
              </div>
              {recommendation.savings > 0 && (
                <div className="eco-saving-line tabular-nums">
                  <Leaf size={13} />
                  <span>
                    {t.youSave} <b>₹{recommendation.savings.toLocaleString('en-IN')}</b>{' '}
                    {t.vsSmall}
                  </span>
                </div>
              )}
            </div>

            <div className="eco-metrics tabular-nums">
              <div>
                <strong>{recommendation.totalCards}</strong>
                <span>{t.impactPlastic}</span>
              </div>
              <div>
                <strong>{recommendation.seedsPlanted.toLocaleString('en-IN')}+</strong>
                <span>{t.impactSeeds}</span>
              </div>
              <div>
                <strong>
                  {recommendation.pulpGrams >= 1000
                    ? `${(recommendation.pulpGrams / 1000).toFixed(1)} kg`
                    : `${recommendation.pulpGrams} g`}
                </strong>
                <span>{t.impactPulp}</span>
              </div>
            </div>

            <p className="eco-footnote">{t.footnote}</p>

            <button
              type="button"
              className="btn clay eco-apply-btn"
              onClick={() => {
                const note =
                  lang === 'hi'
                    ? `इवेंट प्लानर से चुना गया: ${recommendation.totalCards} कार्ड (${recommendation.packName} × ${recommendation.qty})`
                    : `Planned via Eco Calculator: ${recommendation.totalCards} cards (${recommendation.packName} × ${recommendation.qty})`;
                onApplyPack(recommendation.packIdx, recommendation.qty, note);
              }}
            >
              <span>{t.applyBtn}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

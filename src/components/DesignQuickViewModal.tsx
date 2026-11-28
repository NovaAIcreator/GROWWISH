import React, { useEffect } from 'react';
import { Flower2, Leaf, PackageCheck, Sparkles, X } from 'lucide-react';
import { DESIGNS, Lang, PRODUCTS } from '../catalog';

export type DesignItem = (typeof DESIGNS)[number];

interface DesignQuickViewModalProps {
  design: DesignItem;
  lang: Lang;
  onClose: () => void;
  onCustomizeInStudio: (designId: string) => void;
  onOrderDesign: (designId: string) => void;
}

export function DesignQuickViewModal({
  design,
  lang,
  onClose,
  onCustomizeInStudio,
  onOrderDesign,
}: DesignQuickViewModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const minPerCard = Math.round(PRODUCTS[2].p / PRODUCTS[2].c);
  const startPrice = PRODUCTS[0].p;

  const t = {
    en: {
      close: 'Close details',
      kicker: 'Handmade botanical stationery',
      fromPrice: `Starting at ₹${startPrice} (Pack of 5) · as low as ₹${minPerCard}/card`,
      specs: [
        {
          icon: Leaf,
          title: '250 GSM Cotton-Pulp Paper',
          desc: 'Hand-pressed from recycled textile cotton rags — thick, textured, acid-free.',
        },
        {
          icon: Flower2,
          title: '30+ Non-GMO Wildflower Seeds',
          desc: 'Marigold, wild daisy & basil seeds pressed inside. Sprouts in 7–10 days.',
        },
        {
          icon: PackageCheck,
          title: 'Kraft Envelope & Care Card',
          desc: 'Zero plastic wrapping. Includes step-by-step planting guide for the recipient.',
        },
      ],
      studioBtn: 'Customize in Card Studio',
      orderBtn: 'Order this design',
    },
    hi: {
      close: 'बंद करें',
      kicker: 'हाथ से बना बॉटैनिकल सीड पेपर',
      fromPrice: `शुरुआत ₹${startPrice} (5 कार्ड का पैक) · ₹${minPerCard}/कार्ड तक किफायती`,
      specs: [
        {
          icon: Leaf,
          title: '250 GSM कॉटन-पल्प पेपर',
          desc: 'रीसायकल्ड कॉटन फाइबर से हाथ से बना — मोटा, सुंदर टेक्सचर और 100% बायोडिग्रेडेबल।',
        },
        {
          icon: Flower2,
          title: '30+ असली वाइल्डफ्लावर बीज',
          desc: 'गेंदा, डेज़ी और तुलसी के बीज कागज़ में दबे हैं। 7–10 दिन में अंकुर निकलते हैं।',
        },
        {
          icon: PackageCheck,
          title: 'क्राफ्ट लिफाफा और प्लांटिंग गाइड',
          desc: 'पूरी तरह प्लास्टिक-फ्री पैकिंग। हर कार्ड के साथ पौधा लगाने की आसान गाइड।',
        },
      ],
      studioBtn: 'कार्ड स्टूडियो में कस्टमाइज़ करें',
      orderBtn: 'यह डिज़ाइन ऑर्डर करें',
    },
  }[lang];

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={design.n[lang]}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet qv-sheet">
        <button
          type="button"
          className="modal-close qv-close"
          onClick={onClose}
          aria-label={t.close}
        >
          <X size={18} />
        </button>

        <div className="qv-grid">
          <div className="qv-media">
            <img
              src={design.img}
              width={design.w}
              height={design.h}
              alt={design.n[lang]}
            />
          </div>

          <div className="qv-body">
            <div className="kicker">{t.kicker}</div>
            <h3>{design.n[lang]}</h3>
            <p className="qv-occasions">{design.t[lang]}</p>
            <div className="qv-price-line tabular-nums">{t.fromPrice}</div>

            <div className="qv-specs">
              {t.specs.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div className="qv-spec-row" key={idx}>
                    <span className="qv-spec-ic">
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="qv-actions">
              <button
                type="button"
                className="btn clay"
                onClick={() => {
                  onClose();
                  onOrderDesign(design.id);
                }}
              >
                {t.orderBtn}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  onClose();
                  onCustomizeInStudio(design.id);
                }}
              >
                <Sparkles size={15} />
                <span>{t.studioBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

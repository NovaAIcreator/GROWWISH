import React, { useEffect, useState } from 'react';
import {
  Lang,
  OrderStatusRecord,
  subscribeOrderStatus,
  WHATSAPP,
} from '../catalog';

interface OrderTrackerModalProps {
  lang: Lang;
  initialCode?: string;
  onClose: () => void;
}

const STEPS = ['new', 'confirmed', 'packed', 'shipped', 'delivered'] as const;

const LABELS = {
  en: {
    title: 'Track your order live',
    sub: 'Enter your GrowWish order code (e.g. GW-7K4M9P) for real-time payment & delivery updates.',
    placeholder: 'GW-XXXXXX',
    btn: 'Track',
    searching: 'Checking…',
    notFound: 'No order found with this code. Please check the spelling and try again.',
    orderCode: 'Order Code',
    pack: 'Pack',
    design: 'Design',
    total: 'Total',
    liveSync: 'Live status synced',
    placedOn: 'Placed',
    updatedOn: 'Updated',
    trackingTitle: 'Delivery & Courier Update',
    fakeBannerTitle: 'Payment flagged as fake / unmatched',
    fakeBannerDefault:
      'The UPI Transaction ID (UTR) could not be matched with our FamPay account, so this order was cancelled.',
    waHelp: 'Contact Support on WhatsApp',
    payStatus: {
      pending_verification: 'UPI — Verifying Transaction ID',
      verified: 'UPI — Real Payment Verified ✓',
      fake: 'Fake / Unmatched Payment ✕',
      cod: 'Pay on confirmation',
      failed: 'Payment issue — please contact WhatsApp',
    },
    stepNames: {
      new: 'Order Placed',
      confirmed: 'Confirmed',
      packed: 'Hand-packed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Order Cancelled',
    },
  },
  hi: {
    title: 'अपना ऑर्डर लाइव ट्रैक करें',
    sub: 'पेमेंट वेरिफिकेशन और डिलीवरी का लाइव स्टेटस देखने के लिए ऑर्डर कोड (जैसे GW-7K4M9P) डालें।',
    placeholder: 'GW-XXXXXX',
    btn: 'ट्रैक करें',
    searching: 'खोज रहे हैं…',
    notFound: 'इस कोड का कोई ऑर्डर नहीं मिला। कृपया कोड दोबारा जांचें।',
    orderCode: 'ऑर्डर कोड',
    pack: 'पैक',
    design: 'डिज़ाइन',
    total: 'कुल राशि',
    liveSync: 'लाइव स्टेटस चालू है',
    placedOn: 'ऑर्डर समय',
    updatedOn: 'आखिरी अपडेट',
    trackingTitle: 'डिलीवरी / कूरियर अपडेट',
    fakeBannerTitle: 'पेमेंट फेक / अनमैच्ड पाया गया',
    fakeBannerDefault:
      'आपका UPI Transaction ID (UTR) हमारे अकाउंट से मैच नहीं हुआ, इसलिए ऑर्डर कैंसल कर दिया गया है।',
    waHelp: 'WhatsApp पर संपर्क करें',
    payStatus: {
      pending_verification: 'UPI — Transaction ID चेक हो रहा है',
      verified: 'UPI — रियल पेमेंट वेरिफाइड ✓',
      fake: 'फेक / अनमैच्ड पेमेंट ✕',
      cod: 'कन्फर्मेशन पर पेमेंट',
      failed: 'पेमेंट में समस्या — कृपया WhatsApp करें',
    },
    stepNames: {
      new: 'ऑर्डर मिला',
      confirmed: 'कन्फर्म',
      packed: 'पैक हो गया',
      shipped: 'भेज दिया गया',
      delivered: 'डिलीवर हो गया',
      cancelled: 'ऑर्डर कैंसल',
    },
  },
} as const;

function formatStamp(ts?: { toDate?: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  lang,
  initialCode = '',
  onClose,
}) => {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [activeCode, setActiveCode] = useState(initialCode.trim().toUpperCase());
  const [loading, setLoading] = useState(Boolean(initialCode.trim()));
  const [result, setResult] = useState<OrderStatusRecord | null>(null);
  const [searched, setSearched] = useState(Boolean(initialCode.trim()));

  const l = LABELS[lang];

  useEffect(() => {
    if (!activeCode) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const unsub = subscribeOrderStatus(
      activeCode,
      (data) => {
        setResult(data);
        setLoading(false);
      },
      () => {
        setResult(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [activeCode]);

  const activeIdx = result
    ? STEPS.indexOf(result.orderStatus as (typeof STEPS)[number])
    : -1;

  const waUrl = result
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        `Hi GrowWish, I need help with Order ${result.orderCode} (Payment: ${result.paymentStatus}, Status: ${result.orderStatus}).`,
      )}`
    : `https://wa.me/${WHATSAPP}`;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={l.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h3>{l.title}</h3>
        <p className="mu" style={{ marginTop: -8, fontSize: 15 }}>
          {l.sub}
        </p>

        <form
          className="track-form"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = code.trim().toUpperCase();
            if (!clean) return;
            setActiveCode(clean);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={l.placeholder}
            aria-label={l.orderCode}
            required
          />
          <button type="submit" className="btn clay" disabled={loading}>
            {loading ? l.searching : l.btn}
          </button>
        </form>

        {searched && !loading && !result && (
          <div className="track-empty">{l.notFound}</div>
        )}

        {result && (
          <div className="track-result">
            <div className="track-header">
              <div>
                <span className="upi-meta-lbl">{l.orderCode}</span>
                <strong className="tabular-nums">{result.orderCode}</strong>
              </div>
              <span className={`status-pill st-${result.paymentStatus}`}>
                {l.payStatus[result.paymentStatus] || result.paymentStatus}
              </span>
            </div>

            <div className="track-meta">
              <div>
                <span>{l.pack}</span>
                <b className="tabular-nums">
                  {result.product} × {result.qty}
                </b>
              </div>
              <div>
                <span>{l.design}</span>
                <b>{result.design}</b>
              </div>
              <div>
                <span>{l.total}</span>
                <b className="tabular-nums">
                  ₹{result.totalAmount.toLocaleString('en-IN')}
                </b>
              </div>
            </div>

            {result.paymentStatus === 'fake' && (
              <div className="track-fake-alert">
                <strong>{l.fakeBannerTitle}</strong>
                <p>{result.paymentReason || l.fakeBannerDefault}</p>
              </div>
            )}

            {result.trackingNote && (
              <div className="track-courier-box">
                <span className="upi-meta-lbl">{l.trackingTitle}</span>
                <p>{result.trackingNote}</p>
              </div>
            )}

            {result.orderStatus === 'cancelled' ? (
              <div className="track-cancelled">{l.stepNames.cancelled}</div>
            ) : (
              <div className="track-steps">
                {STEPS.map((st, idx) => (
                  <div
                    key={st}
                    className={`track-step${idx <= activeIdx ? ' done' : ''}`}
                  >
                    <span className="dot" />
                    <small>{l.stepNames[st]}</small>
                  </div>
                ))}
              </div>
            )}

            <div className="track-foot-meta tabular-nums">
              <span>
                {l.placedOn}: {formatStamp(result.createdAt)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {l.updatedOn}: {formatStamp(result.updatedAt)}
              </span>
            </div>

            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-link-btn"
              >
                {l.waHelp} →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

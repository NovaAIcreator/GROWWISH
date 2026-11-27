import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  buildUpiUri,
  Lang,
  PAYEE_NAME,
  PaymentMethod,
  UPI_ID,
} from '../catalog';

interface UpiPaymentBoxProps {
  lang: Lang;
  amount: number;
  orderCode: string;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  utrNumber: string;
  onUtrChange: (value: string) => void;
}

const COPY = {
  en: {
    heading: 'Payment method',
    upiTitle: 'Pay via UPI',
    upiBadge: 'Instant',
    upiSub: 'Scan QR or tap to pay directly with UPI PIN',
    codTitle: 'Pay on confirmation',
    codSub: 'Confirm order on WhatsApp / call first',
    scanLabel: 'Scan with any UPI app',
    payable: 'Payable amount',
    to: 'Paying to',
    upiIdLabel: 'UPI ID',
    copy: 'Copy UPI ID',
    copied: 'Copied!',
    saveQr: 'Save QR',
    directPay: 'Pay directly in UPI App',
    directSub: 'Opens your UPI app with amount pre-filled — just enter PIN',
    orOpen: 'Or open app directly:',
    utrLabel: 'UPI Transaction / UTR ID (after paying)',
    utrPlaceholder: 'e.g. 432198765432 (12 digits)',
    utrHint:
      'Enter the 12-digit UTR / Reference number from your UPI receipt for instant verification (or share screenshot on WhatsApp after placing order).',
    famNote:
      'Tip: If your browser blocks direct UPI app opening, tap "Save QR" or "Copy UPI ID" and pay directly inside GPay, PhonePe, Paytm, or FamApp.',
  },
  hi: {
    heading: 'पेमेंट का तरीका',
    upiTitle: 'UPI से तुरंत पेमेंट करें',
    upiBadge: 'तेज़',
    upiSub: 'QR स्कैन करें या डायरेक्ट लिंक से PIN डालकर पेमेंट करें',
    codTitle: 'कन्फर्मेशन पर पेमेंट',
    codSub: 'पहले कॉल / WhatsApp पर कन्फर्म करें',
    scanLabel: 'किसी भी UPI ऐप से स्कैन करें',
    payable: 'कुल राशि',
    to: 'प्राप्तकर्ता',
    upiIdLabel: 'UPI आईडी',
    copy: 'UPI ID कॉपी करें',
    copied: 'कॉपी हो गया!',
    saveQr: 'QR सेव करें',
    directPay: 'UPI ऐप में सीधे पेमेंट करें',
    directSub: 'राशि अपने आप भर जाएगी — बस UPI PIN डालें',
    orOpen: 'या सीधे ऐप खोलें:',
    utrLabel: 'UPI ट्रांज़ैक्शन / UTR नंबर (पेमेंट के बाद)',
    utrPlaceholder: 'जैसे 432198765432 (12 अंक)',
    utrHint:
      'तुरंत वेरिफिकेशन के लिए पेमेंट रसीद का 12 अंकों का UTR नंबर डालें (या ऑर्डर के बाद WhatsApp पर स्क्रीनशॉट भेजें)।',
    famNote:
      'टिप: अगर ब्राउज़र से सीधे UPI ऐप न खुले, तो "QR सेव करें" या "UPI ID कॉपी करें" दबाकर GPay, PhonePe, Paytm या FamApp से पेमेंट करें।',
  },
} as const;

export const UpiPaymentBox: React.FC<UpiPaymentBoxProps> = ({
  lang,
  amount,
  orderCode,
  paymentMethod,
  onPaymentMethodChange,
  utrNumber,
  onUtrChange,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const c = COPY[lang];
  const note = `GrowWish ${orderCode}`;
  const upiUri = buildUpiUri({ amount, note, ref: orderCode, scheme: 'upi' });
  const gpayUri = buildUpiUri({ amount, note, ref: orderCode, scheme: 'gpay' });
  const phonepeUri = buildUpiUri({ amount, note, ref: orderCode, scheme: 'phonepe' });
  const paytmUri = buildUpiUri({ amount, note, ref: orderCode, scheme: 'paytm' });

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(upiUri, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1d3b2a',
        light: '#fffdf8',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [upiUri]);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = UPI_ID;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `GrowWish-UPI-${orderCode}-Rs${amount}.png`;
    link.click();
  };

  return (
    <div className="paybox">
      <div className="f" style={{ marginBottom: 12 }}>
        <span>{c.heading}</span>
        <div className="pay-tabs" role="radiogroup" aria-label={c.heading}>
          <button
            type="button"
            role="radio"
            aria-checked={paymentMethod === 'upi'}
            className={`pay-tab${paymentMethod === 'upi' ? ' active' : ''}`}
            onClick={() => onPaymentMethodChange('upi')}
          >
            <div className="pay-tab-top">
              <strong>{c.upiTitle}</strong>
              <span className="pay-badge">{c.upiBadge}</span>
            </div>
            <small>{c.upiSub}</small>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={paymentMethod === 'cod'}
            className={`pay-tab${paymentMethod === 'cod' ? ' active' : ''}`}
            onClick={() => onPaymentMethodChange('cod')}
          >
            <div className="pay-tab-top">
              <strong>{c.codTitle}</strong>
            </div>
            <small>{c.codSub}</small>
          </button>
        </div>
      </div>

      {paymentMethod === 'upi' && (
        <div className="upi-panel">
          <div className="upi-grid">
            <div className="upi-qr-wrap">
              <div className="upi-qr-frame">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`UPI QR code for ${UPI_ID} amount ₹${amount}`}
                    width={184}
                    height={184}
                  />
                ) : (
                  <div className="upi-qr-skeleton" />
                )}
              </div>
              <div className="upi-qr-cap">{c.scanLabel}</div>
              <button
                type="button"
                className="upi-mini-btn"
                onClick={handleDownloadQr}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                {c.saveQr}
              </button>
            </div>

            <div className="upi-details">
              <div className="upi-meta-row">
                <div>
                  <span className="upi-meta-lbl">{c.payable}</span>
                  <div className="upi-amt">₹{amount.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="upi-meta-lbl">{c.to}</span>
                  <div className="upi-payee">{PAYEE_NAME}</div>
                </div>
              </div>

              <div className="upi-id-bar">
                <div>
                  <span className="upi-meta-lbl">{c.upiIdLabel}</span>
                  <code className="upi-id-val">{UPI_ID}</code>
                </div>
                <button
                  type="button"
                  className={`upi-copy-btn${copied ? ' copied' : ''}`}
                  onClick={handleCopyUpi}
                >
                  {copied ? c.copied : c.copy}
                </button>
              </div>

              <a className="upi-direct-btn" href={upiUri}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2L4 7v5c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V7l-8-5z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span>
                  {c.directPay} · ₹{amount.toLocaleString('en-IN')}
                </span>
              </a>
              <p className="upi-direct-sub">{c.directSub}</p>

              <div className="upi-apps">
                <span>{c.orOpen}</span>
                <div className="upi-app-pills">
                  <a href={gpayUri} className="upi-app-pill">
                    GPay
                  </a>
                  <a href={phonepeUri} className="upi-app-pill">
                    PhonePe
                  </a>
                  <a href={paytmUri} className="upi-app-pill">
                    Paytm
                  </a>
                  <a href={upiUri} className="upi-app-pill">
                    FamApp / BHIM
                  </a>
                </div>
              </div>
            </div>
          </div>

          <label className="f" style={{ marginTop: 14, marginBottom: 6 }}>
            <span>{c.utrLabel}</span>
            <input
              name="utrNumber"
              value={utrNumber}
              onChange={(e) =>
                onUtrChange(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32))
              }
              placeholder={c.utrPlaceholder}
              pattern="[a-zA-Z0-9]{0,32}"
              autoComplete="off"
              style={{ background: '#fff' }}
            />
          </label>
          <p className="upi-hint">{c.utrHint}</p>
          <p className="upi-tip">{c.famNote}</p>
        </div>
      )}
    </div>
  );
};

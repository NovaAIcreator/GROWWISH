import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Lang } from '../catalog';

interface FaqSectionProps {
  lang: Lang;
}

const FAQS = {
  en: [
    {
      q: 'How long do the seeds inside the card stay viable?',
      a: 'Store your GrowWish cards in a cool, dry place away from direct moisture and they will germinate reliably for up to 18 months from delivery.',
    },
    {
      q: 'Can I mix all three designs inside a single pack?',
      a: 'Yes! Pick "Mixed (all three)" in the order form, or write your preferred mix ratio in the Note field — there is no extra charge.',
    },
    {
      q: 'Do you print custom notes or logos for weddings & corporate gifting?',
      a: 'Absolutely. You can preview your exact inside note in the Card Studio above and attach it straight to your order. For 50+ cards with custom monograms or brand logos, mention your deadline in the Note or Bulk Orders form.',
    },
    {
      q: 'How does FamPay UPI verification & live order tracking work?',
      a: 'When you pay via our FamPay UPI QR or direct UPI app link and submit your 12-digit UTR number, you get a live GW-XXXXXX code immediately. Once our team matches your UTR, your live tracker moves to Verified & Confirmed in real time.',
    },
    {
      q: 'How long does shipping take across India?',
      a: 'Every pack is hand-packed in plastic-free kraft sleeves and dispatched within 24–48 hours. Standard delivery takes 3–6 business days across India.',
    },
  ],
  hi: [
    {
      q: 'कार्ड के अंदर के बीज कितने समय तक उगने लायक रहते हैं?',
      a: 'कार्ड को सूखी और ठंडी जगह पर रखें — डिलीवरी के 18 महीने बाद तक भी ये बीज आसानी से अंकुरित हो जाते हैं।',
    },
    {
      q: 'क्या मैं एक ही पैक में तीनों डिज़ाइन मिक्स कर सकता हूँ?',
      a: 'हाँ बिल्कुल! ऑर्डर फॉर्म में "मिक्स (तीनों)" चुनें या नोट बॉक्स में अपनी पसंद का मिक्स लिख दें — इसका कोई अतिरिक्त शुल्क नहीं है।',
    },
    {
      q: 'क्या शादी या कॉर्पोरेट गिफ्टिंग के लिए कस्टम मैसेज या लोगो प्रिंट हो सकता है?',
      a: 'जी हाँ। आप ऊपर दिए गए कार्ड स्टूडियो में अपना अंदर का संदेश लाइव देख सकते हैं और सीधे ऑर्डर में जोड़ सकते हैं। 50+ कार्ड्स पर कस्टम लोगो या शादी के नाम के लिए नोट या बल्क फॉर्म में लिखें।',
    },
    {
      q: 'FamPay UPI वेरिफिकेशन और लाइव ऑर्डर ट्रैकिंग कैसे काम करती है?',
      a: 'जैसे ही आप FamPay UPI QR या डायरेक्ट लिंक से पेमेंट करके 12-अंक का UTR नंबर डालते हैं, आपको तुरंत GW-XXXXXX ट्रैकिंग कोड मिलता है। हमारी टीम UTR मैच करते ही आपका स्टेटस रियल-टाइम में Verified & Confirmed दिखाती है।',
    },
    {
      q: 'भारत में डिलीवरी में कितने दिन लगते हैं?',
      a: 'हर पैक 24–48 घंटे के अंदर प्लास्टिक-फ्री क्राफ्ट पैकिंग में डिस्पैच होता है और पूरे भारत में 3–6 कार्यदिवसों में पहुँच जाता है।',
    },
  ],
} as const;

export function FaqSection({ lang }: FaqSectionProps) {
  const [openIdx, setOpenIdx] = useState<number>(0);
  const items = FAQS[lang];

  return (
    <section id="faq" className="faq-sec">
      <div className="w">
        <div className="faq-layout">
          <div className="faq-intro rv">
            <div className="kicker">
              {lang === 'hi' ? 'अक्सर पूछे जाने वाले सवाल' : 'Good to know'}
            </div>
            <h2>
              {lang === 'en' ? (
                <>
                  Questions before you <em>plant.</em>
                </>
              ) : (
                <>
                  ऑर्डर से पहले <em>ज़रूरी सवाल।</em>
                </>
              )}
            </h2>
            <p className="mu">
              {lang === 'en'
                ? 'Everything about seed freshness, custom notes, UPI verification, and nationwide shipping.'
                : 'बीजों की ताज़गी, कस्टम प्रिंटिंग, UPI वेरिफिकेशन और डिलीवरी से जुड़ी पूरी जानकारी।'}
            </p>
          </div>

          <div className="faq-list rv">
            {items.map((item, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className={`faq-item${isOpen ? ' open' : ''}`}
                >
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={18} className="faq-chev" />
                  </button>
                  {isOpen && <div className="faq-a">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

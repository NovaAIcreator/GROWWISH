import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import {
  createOrderAtomic,
  DESIGNS,
  generateOrderCode,
  getActiveBanInfo,
  isAdminEmail,
  Lang,
  OrderRecord,
  PaymentMethod,
  PRODUCTS,
  ReviewRecord,
  submitFeedback,
  submitReview,
  syncUserLogin,
  updateUserDeliveryProfile,
  UPI_ID,
  UserProfileRecord,
  WHATSAPP,
} from './catalog';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Eye,
  PackageSearch,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { UpiPaymentBox } from './components/UpiPaymentBox';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthAccountModal } from './components/AuthAccountModal';
import { CardStudio } from './components/CardStudio';
import { BloomSimulator } from './components/BloomSimulator';
import {
  DesignItem,
  DesignQuickViewModal,
} from './components/DesignQuickViewModal';
import { FaqSection } from './components/FaqSection';

const T = {
  en: {
    n0: 'Designs',
    nStudio: 'Studio',
    n1: 'Packs',
    n2: 'Reviews',
    n4: 'How it works',
    n5: 'Order now',
    track: 'Track',
    signIn: 'Sign in',
    admin: 'Admin',
    inspect: 'Details',
    studioBtn: 'Customize live',
    hk: 'Handmade plantable seed paper',
    h2: 'Greeting cards pressed with wildflower seeds. Read it, plant it, and watch your words bloom.',
    shop: 'See the designs',
    watch: 'Watch the film',
    st1: 'plantable paper',
    st2: 'plastic, zero waste',
    st3n: '7–10',
    st3: 'days to sprout',
    c1: 'say thank you',
    c2: 'for teachers',
    c3: 'for birthdays',
    tagb: 'seeds',
    tags: 'inside',
    tick: [
      'Gift growth, not waste',
      'Wildflower seeds inside',
      'Handmade in India',
      'Plant it · Water it · Watch it grow',
      '100% biodegradable',
    ],
    dk: 'The collection',
    ds: 'Every card is handmade from recycled paper pulp and pressed with wildflower seeds. Pick a design, or mix all three in one pack.',
    pick: 'Choose this design',
    vk: 'From paper to plant',
    vs: 'A little paper, a pot of soil, a few days of water. That is all it takes.',
    vn: '↓ tap play — it is short, we promise',
    tap: 'Tap to play',
    hwk: 'Three easy steps',
    hws: 'Works on a windowsill, a balcony, or a garden bed. Kids love it too.',
    s1: 'Plant it',
    s1d: 'Tear the card into pieces and lay them on soil in a pot. Cover with a thin layer of soil.',
    s2: 'Water it',
    s2d: 'Keep the soil moist (not soaked) and place it where it gets some sunlight.',
    s3: 'Watch it grow',
    s3d: 'Tiny sprouts appear within days. In a few weeks, wildflowers take over.',
    pk: 'Packs & prices',
    ss: '100% plantable. Eco-friendly. Made to be gifted. Mix designs in any pack.',
    per: 'per card',
    buy: 'Order this pack',
    best: 'Best value',
    cards: 'cards',
    ok: 'Place an order',
    os: 'Pay instantly via UPI QR / direct app link, or confirm on WhatsApp.',
    o1: 'Pick your design, pack, and fill in your delivery details.',
    o2: 'Scan the UPI QR or tap Pay Directly to pay with your UPI PIN (or choose Pay on Confirmation).',
    o3: 'Get your live Order ID immediately — your cards are packed by hand and shipped to your door.',
    ofh: 'Your order',
    memberSignedIn: 'Signed in as',
    memberOrdersLink: 'My Orders',
    guestSignInHint: 'Want order history & auto-fill?',
    guestSignInBtn: 'Sign in with Google',
    lDesign: 'Design',
    lPack: 'Pack',
    qty: 'Quantity',
    name: 'Your name',
    namep: 'e.g. Priya Sharma',
    phone: 'Phone number',
    phonep: '10-digit mobile number',
    addr: 'Full delivery address',
    addrp: 'House no., street, city, PIN code',
    lMsg: 'Note (optional)',
    msgp: 'Mix of designs, custom message, deadline…',
    est: 'Estimated total',
    placeUpi: 'Confirm order & submit UPI details',
    placeCod: 'Place order',
    submitting: 'Saving your order…',
    payUpiNote:
      'Your order is saved immediately with a live Tracking ID. We verify your UPI payment and dispatch promptly.',
    payCodNote:
      'We will call or WhatsApp you to confirm and share payment details.',
    eReq: 'Please fill this in.',
    ePhone: 'Please enter a valid phone number.',
    rk: 'Your voice',
    rs: 'Share a photo of your sprouts or tell us how we can do better. We read every message.',
    rfh: 'Write a review',
    rl: 'Your review',
    rph: 'How was the card? Did it sprout?',
    photo: 'Add a photo of your plant (optional)',
    send: 'Submit review',
    fh: 'Feedback & bulk orders',
    fs: 'Suggestions, complaints, or a big event coming up?',
    ft: 'Type',
    fm: 'Message',
    fph: 'Write your feedback or requirement',
    fcl: 'Contact (optional)',
    fc: 'Phone or email',
    fsend: 'Send feedback',
    foot: 'Plantable seed paper · Eco-friendly gifting',
    inr: '₹',
    wa: 'Hi GrowWish, I want to order: ',
    mixed: 'Mixed (all three)',
  },
  hi: {
    n0: 'डिज़ाइन',
    nStudio: 'स्टूडियो',
    n1: 'पैक',
    n2: 'रिव्यू',
    n4: 'कैसे काम करता है',
    n5: 'ऑर्डर करें',
    track: 'ट्रैक',
    signIn: 'लॉगिन',
    admin: 'Admin',
    inspect: 'विवरण',
    studioBtn: 'लाइव डिज़ाइन करें',
    hk: 'हाथ से बना प्लांटेबल सीड पेपर',
    h2: 'वाइल्डफ्लावर बीजों वाले ग्रीटिंग कार्ड। पढ़िए, मिट्टी में लगाइए, और अपने शब्दों को खिलते देखिए।',
    shop: 'डिज़ाइन देखें',
    watch: 'वीडियो देखें',
    st1: 'प्लांटेबल पेपर',
    st2: 'प्लास्टिक, ज़ीरो वेस्ट',
    st3n: '7–10',
    st3: 'दिन में अंकुर',
    c1: 'शुक्रिया कहें',
    c2: 'टीचर्स के लिए',
    c3: 'जन्मदिन के लिए',
    tagb: 'बीज',
    tags: 'अंदर',
    tick: [
      'कचरा नहीं, हरियाली गिफ्ट करें',
      'अंदर वाइल्डफ्लावर बीज',
      'भारत में हाथ से बना',
      'लगाओ · पानी दो · उगते देखो',
      '100% बायोडिग्रेडेबल',
    ],
    dk: 'कलेक्शन',
    ds: 'हर कार्ड रीसायकल्ड पेपर से हाथ से बनता है और उसमें वाइल्डफ्लावर बीज होते हैं। एक डिज़ाइन चुनें या एक पैक में तीनों मिलाएं।',
    pick: 'यह डिज़ाइन चुनें',
    vk: 'कागज़ से पौधा',
    vs: 'थोड़ा कागज़, एक गमला मिट्टी, कुछ दिन पानी। बस इतना ही।',
    vn: '↓ प्ले दबाइए — छोटा सा वीडियो है',
    tap: 'चलाने के लिए टैप करें',
    hwk: 'तीन आसान स्टेप',
    hws: 'खिड़की, बालकनी या बगीचे में — कहीं भी। बच्चों को भी बहुत पसंद आता है।',
    s1: 'लगाएं',
    s1d: 'कार्ड के टुकड़े करके गमले की मिट्टी पर रखें और ऊपर से हल्की मिट्टी डालें।',
    s2: 'पानी दें',
    s2d: 'मिट्टी को नम रखें (ज़्यादा गीला नहीं) और थोड़ी धूप वाली जगह रखें।',
    s3: 'उगते देखें',
    s3d: 'कुछ ही दिनों में छोटे अंकुर निकलते हैं। कुछ हफ्तों में फूल खिलने लगते हैं।',
    pk: 'पैक और कीमत',
    ss: '100% प्लांटेबल। इको-फ्रेंडली। गिफ्ट के लिए बना। हर पैक में डिज़ाइन मिला सकते हैं।',
    per: 'प्रति कार्ड',
    buy: 'यह पैक ऑर्डर करें',
    best: 'सबसे किफायती',
    cards: 'कार्ड',
    ok: 'ऑर्डर करें',
    os: 'UPI QR / डायरेक्ट लिंक से तुरंत पेमेंट करें या WhatsApp पर कन्फर्म करें।',
    o1: 'अपना डिज़ाइन, पैक और डिलीवरी पता भरें।',
    o2: 'UPI QR स्कैन करें या डायरेक्ट लिंक दबाकर UPI PIN से पेमेंट करें (या कन्फर्मेशन पर पेमेंट चुनें)।',
    o3: 'तुरंत लाइव ऑर्डर कोड पाएं — आपके कार्ड हाथ से पैक होकर घर पहुंचेंगे।',
    ofh: 'आपका ऑर्डर',
    memberSignedIn: 'लॉगिन अकाउंट:',
    memberOrdersLink: 'मेरे ऑर्डर',
    guestSignInHint: 'ऑर्डर हिस्ट्री और ऑटो-फिल के लिए:',
    guestSignInBtn: 'Google से लॉगिन करें',
    lDesign: 'डिज़ाइन',
    lPack: 'पैक',
    qty: 'मात्रा',
    name: 'आपका नाम',
    namep: 'जैसे प्रिया शर्मा',
    phone: 'फोन नंबर',
    phonep: '10 अंकों का मोबाइल नंबर',
    addr: 'पूरा डिलीवरी पता',
    addrp: 'मकान नं., गली, शहर, पिन कोड',
    lMsg: 'नोट (वैकल्पिक)',
    msgp: 'डिज़ाइन का मिक्स, अपना मैसेज, डेडलाइन…',
    est: 'अनुमानित कुल',
    placeUpi: 'ऑर्डर कन्फर्म करें (UPI के साथ)',
    placeCod: 'ऑर्डर करें',
    submitting: 'ऑर्डर सेव हो रहा है…',
    payUpiNote:
      'आपका ऑर्डर तुरंत लाइव ट्रैकिंग कोड के साथ सेव हो जाएगा। हम UPI वेरिफाई करके डिस्पैच करेंगे।',
    payCodNote:
      'हम कॉल या WhatsApp करके कन्फर्म करेंगे और पेमेंट की जानकारी देंगे।',
    eReq: 'कृपया यह भरें।',
    ePhone: 'कृपया सही फोन नंबर डालें।',
    rk: 'आपकी आवाज़',
    rs: 'अपने अंकुरों की फोटो शेयर करें या बताइए हम और क्या बेहतर कर सकते हैं। हम हर संदेश पढ़ते हैं।',
    rfh: 'रिव्यू लिखें',
    rl: 'आपका रिव्यू',
    rph: 'कार्ड कैसा लगा? पौधा उगा?',
    photo: 'अपने पौधे की फोटो जोड़ें (वैकल्पिक)',
    send: 'रिव्यू भेजें',
    fh: 'फीडबैक और बल्क ऑर्डर',
    fs: 'सुझाव, शिकायत या कोई बड़ा इवेंट आने वाला है?',
    ft: 'प्रकार',
    fm: 'संदेश',
    fph: 'अपना फीडबैक या ज़रूरत लिखें',
    fcl: 'संपर्क (वैकल्पिक)',
    fc: 'फोन या ईमेल',
    fsend: 'फीडबैक भेजें',
    foot: 'प्लांटेबल सीड पेपर · इको-फ्रेंडली गिफ्टिंग',
    inr: '₹',
    wa: 'नमस्ते GrowWish, मुझे ऑर्डर करना है: ',
    mixed: 'मिक्स (तीनों)',
  },
} as const;

type ViewMode = 'store' | 'thanks' | 'admin';

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem('gw-lang');
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    // ignore storage errors
  }
  return (navigator.language || 'en').startsWith('hi') ? 'hi' : 'en';
}

function getViewFromPath(): ViewMode {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin') return 'admin';
  if (path === '/thanks') return 'thanks';
  return 'store';
}

export default function App() {
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [view, setView] = useState<ViewMode>(getViewFromPath);

  // Auth & Member profile state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Order form controlled state
  const [selectedDesign, setSelectedDesign] = useState<string>(DESIGNS[0].id);
  const [selectedPackIdx, setSelectedPackIdx] = useState<number>(() => {
    const bestIdx = PRODUCTS.findIndex((p) => p.best);
    return bestIdx >= 0 ? bestIdx : 0;
  });
  const [qty, setQty] = useState<string>('1');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerMessage, setCustomerMessage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [draftOrderCode, setDraftOrderCode] = useState<string>(() =>
    generateOrderCode(),
  );
  const [lastOrder, setLastOrder] = useState<OrderRecord | null>(null);
  const [lastSubmissionType, setLastSubmissionType] = useState<
    'orders' | 'reviews' | 'feedback' | null
  >(null);

  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sendingForm, setSendingForm] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [trackerOpen, setTrackerOpen] = useState<boolean>(false);
  const [trackerInitialCode, setTrackerInitialCode] = useState<string>('');
  const [approvedReviews, setApprovedReviews] = useState<ReviewRecord[]>([]);
  const [quickViewDesign, setQuickViewDesign] = useState<DesignItem | null>(
    null,
  );
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [storeToast, setStoreToast] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingFreshLoginRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  const t = T[lang];
  const currentPack = PRODUCTS[selectedPackIdx] || PRODUCTS[0];
  const parsedQty = Math.max(1, Math.min(999, parseInt(qty, 10) || 1));
  const totalAmount = currentPack.p * parsedQty;
  const estimatedTotal = `${t.inr}${totalAmount.toLocaleString('en-IN')}`;
  const currentYear = new Date().getFullYear();
  const isAdmin = Boolean(user && user.emailVerified && isAdminEmail(user.email));
  const activeBan = getActiveBanInfo(userProfile);

  const navigate = (nextView: ViewMode) => {
    const targetPath =
      nextView === 'admin' ? '/admin' : nextView === 'thanks' ? '/thanks' : '/';
    try {
      window.history.pushState({}, '', targetPath);
    } catch {
      // ignore in sandboxed iframes
    }
    setView(nextView);
    window.scrollTo(0, 0);
  };

  // Global Firebase Auth observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u && u.emailVerified) {
        const shouldRecord = pendingFreshLoginRef.current;
        pendingFreshLoginRef.current = false;
        try {
          const prof = await syncUserLogin(u, shouldRecord);
          setUserProfile(prof);
          if (prof) {
            setCustomerName((prev) => prev || prof.displayName || '');
            setCustomerPhone((prev) => prev || prof.phone || '');
            setCustomerAddress((prev) => prev || prof.address || '');
          }
        } catch {
          // handled inside syncUserLogin
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Live Firestore subscription to signed-in user's own profile (ban & delivery sync)
  useEffect(() => {
    if (!user || !user.emailVerified) return;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const prof = snap.data() as UserProfileRecord;
        setUserProfile(prof);
        setCustomerName((prev) => prev || prof.displayName || '');
        setCustomerPhone((prev) => prev || prof.phone || '');
        setCustomerAddress((prev) => prev || prof.address || '');
      },
      () => {
        // non-blocking
      },
    );
    return () => unsub();
  }, [user]);

  const handleSignIn = async () => {
    pendingFreshLoginRef.current = true;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      pendingFreshLoginRef.current = false;
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code || '')
          : '';
      if (code === 'auth/unauthorized-domain') {
        const host = window.location.hostname;
        throw new Error(
          `Add "${host}" to Firebase Console → Authentication → Settings → Authorized domains to enable Google Sign-In on this domain.`,
        );
      }
      if (code === 'auth/popup-blocked') {
        throw new Error(
          'Browser blocked the Google Sign-In popup. Please allow popups for this site and try again.',
        );
      }
      throw err;
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('gw-lang', lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  useEffect(() => {
    const onPopState = () => {
      setView(getViewFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load approved public reviews from Firestore (no composite index needed)
  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('approved', '==', true),
      limit(12),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ReviewRecord, 'id'>),
          }))
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
          )
          .slice(0, 6);
        setApprovedReviews(items);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'reviews');
        } catch {
          // silently ignore if empty
        }
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (view !== 'store') return;
    const nodes = document.querySelectorAll('.rv,#steps');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [view]);

  useEffect(() => {
    if (view !== 'store') return;
    const onScroll = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [view]);

  const showToast = (msg: string) => {
    setStoreToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setStoreToast(''), 3400);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleApplyFromStudio = (designId: string, customMessage: string) => {
    setSelectedDesign(designId);
    setCustomerMessage(customMessage);
    showToast(
      lang === 'hi'
        ? 'आपका कस्टम कार्ड और संदेश ऑर्डर फॉर्म में जुड़ गया है।'
        : 'Your custom card & handwritten note have been added to the order form.',
    );
    scrollToSection('order');
  };

  const handleApplyPackFromCalc = (
    packIdx: number,
    nextQty: number,
    occasionNote: string,
  ) => {
    setSelectedPackIdx(packIdx);
    setQty(String(nextQty));
    setCustomerMessage((prev) => (prev.trim() ? prev : occasionNote));
    showToast(
      lang === 'hi'
        ? 'सबसे किफायती पैक और मात्रा ऑर्डर फॉर्म में सेट हो गई।'
        : 'Recommended pack and quantity applied to your order form.',
    );
    scrollToSection('order');
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const handlePlayVideo = () => {
    setVideoPlaying(true);
    videoRef.current?.play().catch(() => {
      // ignore autoplay block if any
    });
  };

  const handleOrderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    if (activeBan.isBanned) {
      setFormError(
        lang === 'hi'
          ? `आपका अकाउंट ${activeBan.daysLeft} दिन के लिए बैन है (${activeBan.reason})। अभी नया ऑर्डर नहीं हो सकता।`
          : `Your account is temporarily suspended for ${activeBan.daysLeft} more day(s) (${activeBan.reason}). You cannot place new orders until the ban expires.`,
      );
      return;
    }
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    if (String(fd.get('bot') || '').trim()) return;

    setSendingForm('orders');
    try {
      const created = await createOrderAtomic({
        orderCode: draftOrderCode,
        userId: user && user.emailVerified ? user.uid : '',
        userEmail: user && user.emailVerified ? user.email || '' : '',
        design: selectedDesign,
        product: currentPack.n,
        qty: parsedQty,
        paymentMethod,
        utrNumber,
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        message: customerMessage,
      });

      // Persist delivery details to signed-in user profile if not saved yet
      if (user && user.emailVerified) {
        try {
          await updateUserDeliveryProfile(user.uid, {
            phone: customerPhone,
            address: customerAddress,
          });
          setUserProfile((prev) =>
            prev
              ? { ...prev, phone: customerPhone, address: customerAddress }
              : prev,
          );
        } catch {
          // non-blocking
        }
      }

      setLastOrder(created);
      setLastSubmissionType('orders');
      setUtrNumber('');
      setCustomerMessage('');
      setDraftOrderCode(generateOrderCode());
      navigate('thanks');
    } catch {
      setFormError(
        lang === 'hi'
          ? 'ऑर्डर सेव करने में समस्या आई। कृपया दोबारा कोशिश करें या WhatsApp पर भेजें।'
          : 'Could not save your order right now. Please try again or reach us on WhatsApp.',
      );
    } finally {
      setSendingForm(null);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    if (String(fd.get('bot') || '').trim()) return;

    setSendingForm('reviews');
    try {
      const rating = parseInt(String(fd.get('rating') || '5'), 10);
      await submitReview({
        rating,
        name: String(fd.get('name') || ''),
        review: String(fd.get('review') || ''),
        photoName: fileName || '',
      });
      setLastOrder(null);
      setLastSubmissionType('reviews');
      setFileName(null);
      form.reset();
      navigate('thanks');
    } catch {
      setFormError(
        lang === 'hi'
          ? 'रिव्यू भेजने में समस्या आई। कृपया दोबारा कोशिश करें।'
          : 'Could not submit your review right now. Please try again.',
      );
    } finally {
      setSendingForm(null);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    if (String(fd.get('bot') || '').trim()) return;

    setSendingForm('feedback');
    try {
      const rawType = String(fd.get('type') || 'Suggestion');
      const allowedTypes = [
        'Suggestion',
        'Bulk / Corporate',
        'Complaint',
        'Other',
      ] as const;
      const safeType = allowedTypes.includes(
        rawType as (typeof allowedTypes)[number],
      )
        ? (rawType as (typeof allowedTypes)[number])
        : 'Other';

      await submitFeedback({
        type: safeType,
        message: String(fd.get('message') || ''),
        contact: String(fd.get('contact') || ''),
      });
      setLastOrder(null);
      setLastSubmissionType('feedback');
      form.reset();
      navigate('thanks');
    } catch {
      setFormError(
        lang === 'hi'
          ? 'फीडबैक भेजने में समस्या आई। कृपया दोबारा कोशिश करें।'
          : 'Could not send feedback right now. Please try again.',
      );
    } finally {
      setSendingForm(null);
    }
  };

  if (view === 'admin') {
    return (
      <AdminDashboard
        user={user}
        authReady={authReady}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onBackToStore={() => navigate('store')}
      />
    );
  }

  if (view === 'thanks') {
    const waConfirmText = lastOrder
      ? `Hi GrowWish! Order ${lastOrder.orderCode}\nProduct: ${lastOrder.product} x ${lastOrder.qty} (₹${lastOrder.totalAmount})\nDesign: ${lastOrder.design}\nPayment: ${lastOrder.paymentMethod.toUpperCase()}${lastOrder.utrNumber ? ` (UTR: ${lastOrder.utrNumber})` : ''}\nName: ${lastOrder.name}`
      : t.wa;

    return (
      <div className="thanks-page">
        <div className="thanks-card">
          <h1>GROWWISH</h1>
          <p>
            Thank you! We have received your{' '}
            {lastSubmissionType === 'orders' ? 'order' : 'submission'}.
            <br />
            शुक्रिया! हमें आपकी जानकारी मिल गई है।
          </p>

          {lastOrder && (
            <div className="thanks-summary">
              <div>
                <span className="mu">Order Code</span>
                <b className="tabular-nums">{lastOrder.orderCode}</b>
              </div>
              <div>
                <span className="mu">Pack</span>
                <b className="tabular-nums">
                  {lastOrder.product} × {lastOrder.qty}
                </b>
              </div>
              <div>
                <span className="mu">Design</span>
                <b>{lastOrder.design}</b>
              </div>
              <div>
                <span className="mu">Total</span>
                <b className="tabular-nums">
                  ₹{lastOrder.totalAmount.toLocaleString('en-IN')}
                </b>
              </div>
              <div>
                <span className="mu">Payment</span>
                <b>
                  {lastOrder.paymentMethod === 'upi'
                    ? `UPI (${UPI_ID})`
                    : 'Pay on confirmation'}
                </b>
              </div>
              {lastOrder.utrNumber && (
                <div>
                  <span className="mu">UTR / Ref</span>
                  <code>{lastOrder.utrNumber}</code>
                </div>
              )}
            </div>
          )}

          {lastOrder && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <a
                className="btn clay"
                style={{ justifyContent: 'center' }}
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waConfirmText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lastOrder.paymentMethod === 'upi'
                  ? 'Share Payment Screenshot on WhatsApp'
                  : 'Confirm Order on WhatsApp'}
              </a>
              <button
                type="button"
                className="btn ghost"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  setTrackerInitialCode(lastOrder.orderCode);
                  setTrackerOpen(true);
                }}
              >
                Track Order {lastOrder.orderCode}
              </button>
            </div>
          )}

          <p>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('store');
              }}
            >
              ← Back
            </a>
          </p>
        </div>

        {trackerOpen && (
          <OrderTrackerModal
            lang={lang}
            initialCode={trackerInitialCode}
            onClose={() => setTrackerOpen(false)}
          />
        )}
      </div>
    );
  }

  const firstName = user?.displayName?.split(' ')[0] || 'Account';

  return (
    <>
      <nav>
        <div
          className="scroll-progress-bar"
          aria-hidden="true"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
        <div className="w">
          <a className="logo" href="#top" aria-label="GrowWish home">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M16 30V15"
                stroke="#1d3b2a"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path d="M16 17C16 9 10 5 3 5c0 8 6 12 13 12z" fill="#4f7a4a" />
              <path d="M16 14c0-6 5-10 13-10 0 7-5 10-13 10z" fill="#c8664a" />
            </svg>
            Grow<i>Wish</i>
          </a>

          <div className="nav-mid">
            <a href="#designs">{t.n0}</a>
            <a href="#studio">{t.nStudio}</a>
            <a href="#packs">{t.n1}</a>
            <a
              href="#track"
              onClick={(e) => {
                e.preventDefault();
                setTrackerInitialCode('');
                setTrackerOpen(true);
              }}
            >
              {t.track}
            </a>
            {isAdmin && (
              <a
                href="/admin"
                className="nav-admin-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('admin');
                }}
              >
                {t.admin}
              </a>
            )}
          </div>

          <div className="nav-right">
            <button
              id="lang"
              type="button"
              aria-label="Switch language"
              onClick={handleToggleLang}
            >
              {lang === 'en' ? 'हिंदी' : 'English'}
            </button>

            <button
              type="button"
              className="nav-user-btn"
              onClick={() => setAuthModalOpen(true)}
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="nav-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="nav-avatar fallback">
                      {firstName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="nav-user-name">{firstName}</span>
                </>
              ) : (
                <span>{t.signIn}</span>
              )}
            </button>

            <a className="btn nav-cta" href="#order">
              {t.n5}
            </a>
          </div>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="w">
          <div className="load">
            <div className="kicker">{t.hk}</div>
            <h1>
              {lang === 'en' ? (
                <>
                  Plant it. <em>Water it.</em> Watch it{' '}
                  <span className="grow">grow.</span>
                </>
              ) : (
                <>
                  लगाओ। <em>पानी दो।</em> <span className="grow">उगते</span> देखो।
                </>
              )}
            </h1>
            <p className="lead">{t.h2}</p>
            <div className="cta">
              <a className="btn clay" href="#studio">
                <Sparkles size={16} />
                <span>{t.studioBtn}</span>
              </a>
              <a className="btn ghost" href="#designs">
                <span>{t.shop}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <div className="stats tabular-nums">
              <div>
                <b>100%</b>
                <span>{t.st1}</span>
              </div>
              <div>
                <b>0</b>
                <span>{t.st2}</span>
              </div>
              <div>
                <b>{t.st3n}</b>
                <span>{t.st3}</span>
              </div>
            </div>
          </div>

          <div className="fan">
            <figure
              className="f1 fan-interactive"
              role="button"
              tabIndex={0}
              aria-label={DESIGNS[0].n[lang]}
              onClick={() => setQuickViewDesign(DESIGNS[0])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setQuickViewDesign(DESIGNS[0]);
                }
              }}
            >
              <img
                src="/img/thank-you-floral.webp"
                width={736}
                height={1075}
                alt={DESIGNS[0].n[lang]}
                fetchPriority="high"
              />
              <figcaption>{t.c1}</figcaption>
            </figure>
            <figure
              className="f2 fan-interactive"
              role="button"
              tabIndex={0}
              aria-label={DESIGNS[1].n[lang]}
              onClick={() => setQuickViewDesign(DESIGNS[1])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setQuickViewDesign(DESIGNS[1]);
                }
              }}
            >
              <img
                src="/img/helping-me-grow.webp"
                width={736}
                height={981}
                alt={DESIGNS[1].n[lang]}
                fetchPriority="high"
              />
              <figcaption>{t.c2}</figcaption>
            </figure>
            <figure
              className="f3 fan-interactive"
              role="button"
              tabIndex={0}
              aria-label={DESIGNS[2].n[lang]}
              onClick={() => setQuickViewDesign(DESIGNS[2])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setQuickViewDesign(DESIGNS[2]);
                }
              }}
            >
              <img
                src="/img/happy-birthday.webp"
                width={736}
                height={574}
                alt={DESIGNS[2].n[lang]}
              />
              <figcaption>{t.c3}</figcaption>
            </figure>
            <div className="seedtag" aria-hidden="true">
              <div>
                <span>{t.tagb}</span>
                <span
                  style={{
                    font: 'inherit',
                    color: 'inherit',
                    textTransform: 'uppercase',
                  }}
                >
                  {t.tags}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div id="tick">
          {[0, 1].map((dup) =>
            t.tick.map((item, idx) => (
              <span key={`${dup}-${idx}`}>{item}</span>
            )),
          )}
        </div>
      </div>

      <section id="designs">
        <div className="w">
          <div className="head rv">
            <div>
              <div className="kicker">{t.dk}</div>
              <h2>
                {lang === 'en' ? (
                  <>
                    Cards that <em>bloom</em> after the moment.
                  </>
                ) : (
                  <>
                    कार्ड जो पल के बाद <em>खिलते</em> हैं।
                  </>
                )}
              </h2>
            </div>
            <p className="mu">{t.ds}</p>
          </div>
          <div className="designs" id="dgrid">
            {DESIGNS.map((d, i) => (
              <article className="design rv in" key={d.id}>
                <div
                  className="ph ph-clickable"
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.n[lang]} — ${t.inspect}`}
                  onClick={() => setQuickViewDesign(d)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setQuickViewDesign(d);
                    }
                  }}
                >
                  <img
                    src={d.img}
                    width={d.w}
                    height={d.h}
                    loading="lazy"
                    decoding="async"
                    alt={d.n[lang]}
                  />
                  <span className="ph-inspect">
                    <Eye size={14} /> {t.inspect}
                  </span>
                </div>
                <span className="no">No. 0{i + 1}</span>
                <h3>{d.n[lang]}</h3>
                <p className="tag">{d.t[lang]}</p>
                <div className="design-actions">
                  <a
                    className="btn"
                    href="#order"
                    onClick={() => setSelectedDesign(d.id)}
                  >
                    {t.pick}
                  </a>
                  <button
                    type="button"
                    className="design-studio-link"
                    onClick={() => {
                      setSelectedDesign(d.id);
                      scrollToSection('studio');
                    }}
                  >
                    <Sparkles size={14} /> {t.nStudio}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CardStudio
        lang={lang}
        selectedDesign={selectedDesign}
        onApplyToOrder={handleApplyFromStudio}
      />

      <section id="film" className="film rv">
        <div className="w">
          <div>
            <div className="kicker">{t.vk}</div>
            <h2>
              {lang === 'en' ? (
                <>
                  Watch a card <em>come alive.</em>
                </>
              ) : (
                <>
                  कार्ड को <em>ज़िंदा होते</em> देखिए।
                </>
              )}
            </h2>
            <p>{t.vs}</p>
            <p
              className="hand"
              style={{ fontSize: '26px', color: 'var(--sun)', marginTop: '24px' }}
            >
              {t.vn}
            </p>
          </div>
          <div className={`vid${videoPlaying ? ' on' : ''}`} id="vid">
            <video
              ref={videoRef}
              id="video"
              src="/video.mp4"
              playsInline
              controls
              preload="none"
              poster="/img/helping-me-grow.webp"
              onPlay={() => setVideoPlaying(true)}
            />
            <button
              className="play"
              id="play"
              type="button"
              aria-label="Play video"
              onClick={handlePlayVideo}
            >
              <i>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                </svg>
              </i>
              <small>{t.tap}</small>
            </button>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="w">
          <div className="head rv">
            <div>
              <div className="kicker">{t.hwk}</div>
              <h2>
                {lang === 'en' ? (
                  <>
                    No green thumb <em>needed.</em>
                  </>
                ) : (
                  <>
                    बागवानी का <em>अनुभव ज़रूरी नहीं।</em>
                  </>
                )}
              </h2>
            </div>
            <p className="mu">{t.hws}</p>
          </div>
          <div className="steps" id="steps">
            <svg
              className="vine"
              viewBox="0 0 1100 60"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M40 30 C 200 -10, 300 70, 420 30 S 640 -10, 760 30 S 980 70, 1080 20" />
              <ellipse
                className="lf"
                cx="250"
                cy="22"
                rx="12"
                ry="6"
                transform="rotate(-30 250 22)"
              />
              <ellipse
                className="lf"
                cx="600"
                cy="26"
                rx="12"
                ry="6"
                transform="rotate(25 600 26)"
              />
              <ellipse
                className="lf"
                cx="930"
                cy="40"
                rx="12"
                ry="6"
                transform="rotate(-20 930 40)"
              />
            </svg>
            <div className="step rv">
              <div className="ic">
                <svg viewBox="0 0 48 48">
                  <path d="M6 34h36l-4 10H10z" />
                  <path d="M14 34c2-6 6-9 10-9s8 3 10 9" />
                  <rect
                    x="17"
                    y="10"
                    width="14"
                    height="10"
                    rx="1"
                    transform="rotate(-8 24 15)"
                  />
                  <path d="M24 20v5" />
                </svg>
              </div>
              <span className="n">01</span>
              <h3>{t.s1}</h3>
              <p className="mu">{t.s1d}</p>
            </div>
            <div className="step rv">
              <div className="ic">
                <svg viewBox="0 0 48 48">
                  <path d="M8 20h20v14a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" />
                  <path d="M28 24l12-8" />
                  <path d="M8 24H4v-4" />
                  <path d="M40 22v3M37 27v3M43 28v3" />
                </svg>
              </div>
              <span className="n">02</span>
              <h3>{t.s2}</h3>
              <p className="mu">{t.s2d}</p>
            </div>
            <div className="step rv">
              <div className="ic">
                <svg viewBox="0 0 48 48">
                  <path d="M24 42V22" />
                  <path d="M24 26c0-8-6-13-15-13 0 9 6 13 15 13z" />
                  <path d="M24 22c0-7 5-12 14-12 0 8-5 12-14 12z" />
                  <path d="M12 42h24" />
                </svg>
              </div>
              <span className="n">03</span>
              <h3>{t.s3}</h3>
              <p className="mu">{t.s3d}</p>
            </div>
          </div>
        </div>
      </section>

      <BloomSimulator lang={lang} onApplyPack={handleApplyPackFromCalc} />

      <section
        id="packs"
        style={{
          background:
            'linear-gradient(180deg,transparent,var(--paper2) 30%,var(--paper2) 70%,transparent)',
        }}
      >
        <div className="w">
          <div className="head rv">
            <div>
              <div className="kicker">{t.pk}</div>
              <h2>
                {lang === 'en' ? (
                  <>
                    Pick your <em>pack.</em>
                  </>
                ) : (
                  <>
                    अपना <em>पैक</em> चुनें।
                  </>
                )}
              </h2>
            </div>
            <p className="mu">{t.ss}</p>
          </div>
          <div className="packs" id="pgrid">
            {PRODUCTS.map((x, i) => (
              <article
                className={`pack rv in${x.best ? ' best' : ''}`}
                key={x.n}
              >
                {x.best ? <span className="stamp">{t.best}</span> : null}
                <div className="count tabular-nums">
                  {x.c} {t.cards}
                </div>
                <h3>{x.n.replace('Seed Paper – ', '')}</h3>
                <div className="price tabular-nums">
                  <small>{t.inr}</small>
                  {x.p}
                </div>
                <div className="per mu tabular-nums">
                  {t.inr}
                  {(x.p / x.c).toFixed(0)} {t.per}
                </div>
                <ul>
                  {x.d[lang].map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                <a
                  className="btn"
                  href="#order"
                  onClick={() => setSelectedPackIdx(i)}
                >
                  {t.buy}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="order">
        <div className="w order">
          <aside className="rv">
            <div className="kicker">{t.ok}</div>
            <h2>
              {lang === 'en' ? (
                <>
                  Let's get your <em>cards</em> growing.
                </>
              ) : (
                <>
                  चलिए आपके <em>कार्ड</em> उगाते हैं।
                </>
              )}
            </h2>
            <p className="mu">{t.os}</p>
            <ol>
              <li>
                <span>{t.o1}</span>
              </li>
              <li>
                <span>{t.o2}</span>
              </li>
              <li>
                <span>{t.o3}</span>
              </li>
            </ol>
          </aside>

          <form
            className={`sheet rv${sendingForm === 'orders' ? ' sending' : ''}`}
            id="orderForm"
            name="orders"
            onSubmit={handleOrderSubmit}
          >
            <input type="hidden" name="form-name" value="orders" />
            <p hidden>
              <label>
                Leave empty <input name="bot" />
              </label>
            </p>

            <div className="sheet-head-row">
              <h3>{t.ofh}</h3>
              {user ? (
                <div className="order-member-line">
                  <span>
                    {t.memberSignedIn} <b>{user.displayName || user.email}</b>
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="inline-link-btn"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    {t.memberOrdersLink}
                  </button>
                </div>
              ) : (
                <div className="order-member-line">
                  <span className="mu">{t.guestSignInHint}</span>
                  <button
                    type="button"
                    className="inline-link-btn"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    {t.guestSignInBtn}
                  </button>
                </div>
              )}
            </div>

            {activeBan.isBanned && (
              <div className="ban-banner" role="alert" style={{ marginBottom: 16 }}>
                <div className="ban-banner-top">
                  <strong>
                    {lang === 'hi'
                      ? 'अकाउंट अस्थायी रूप से बैन है'
                      : 'Account temporarily suspended'}
                  </strong>
                  <span className="tabular-nums">
                    {activeBan.daysLeft}{' '}
                    {lang === 'hi' ? 'दिन बाकी' : 'day(s) left'}
                  </span>
                </div>
                <p className="ban-banner-reason">
                  {lang === 'hi' ? 'कारण:' : 'Reason:'} {activeBan.reason}
                </p>
                <p className="ban-banner-meta tabular-nums">
                  {lang === 'hi' ? 'बैन समाप्त होगा:' : 'Active until'}{' '}
                  {activeBan.untilDate?.toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ·{' '}
                  <a
                    href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                      `Hi GrowWish, my account (${user?.email}) is suspended. Please help review my payment.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp Support →
                  </a>
                </p>
              </div>
            )}

            <div className="f">
              <span>{t.lDesign}</span>
              <div className="chips" id="dchips">
                {DESIGNS.map((d, i) => (
                  <div className="chip" key={d.id}>
                    <input
                      type="radio"
                      name="design"
                      value={d.id}
                      id={`dc${i}`}
                      required
                      checked={selectedDesign === d.id}
                      onChange={() => setSelectedDesign(d.id)}
                    />
                    <label htmlFor={`dc${i}`}>
                      <img src={d.img} alt="" loading="lazy" />
                      {d.n[lang]}
                    </label>
                  </div>
                ))}
                <div className="chip">
                  <input
                    type="radio"
                    name="design"
                    value="Mixed"
                    id="dcm"
                    checked={selectedDesign === 'Mixed'}
                    onChange={() => setSelectedDesign('Mixed')}
                  />
                  <label htmlFor="dcm" style={{ paddingLeft: '14px' }}>
                    {t.mixed}
                  </label>
                </div>
              </div>
            </div>

            <div className="row">
              <label className="f">
                <span>{t.lPack}</span>
                <select
                  name="product"
                  id="psel"
                  required
                  value={PRODUCTS[selectedPackIdx].n}
                  onChange={(e) => {
                    const idx = PRODUCTS.findIndex((p) => p.n === e.target.value);
                    if (idx >= 0) setSelectedPackIdx(idx);
                  }}
                >
                  {PRODUCTS.map((x) => (
                    <option key={x.n} value={x.n}>
                      {x.n} – {t.inr}
                      {x.p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="f">
                <span>{t.qty}</span>
                <input
                  name="qty"
                  id="qty"
                  type="number"
                  min={1}
                  max={999}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="row">
              <label className="f">
                <span>{t.name}</span>
                <input
                  name="name"
                  autoComplete="name"
                  placeholder={t.namep}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <small className="err">{t.eReq}</small>
              </label>
              <label className="f">
                <span>{t.phone}</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  pattern="[0-9+\s\-]{10,18}"
                  placeholder={t.phonep}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  maxLength={18}
                />
                <small className="err">{t.ePhone}</small>
              </label>
            </div>

            <label className="f">
              <span>{t.addr}</span>
              <textarea
                name="address"
                rows={3}
                autoComplete="street-address"
                placeholder={t.addrp}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                required
                minLength={5}
                maxLength={500}
              />
              <small className="err">{t.eReq}</small>
            </label>

            <label className="f">
              <span>{t.lMsg}</span>
              <input
                name="message"
                placeholder={t.msgp}
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                maxLength={400}
              />
            </label>

            <div className="total">
              <span className="mu">{t.est}</span>
              <b id="total" className="tabular-nums">
                {estimatedTotal}
              </b>
            </div>

            <UpiPaymentBox
              lang={lang}
              amount={totalAmount}
              orderCode={draftOrderCode}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              utrNumber={utrNumber}
              onUtrChange={setUtrNumber}
            />

            {formError && (
              <p style={{ color: 'var(--clay2)', fontSize: 14, margin: '8px 0' }}>
                {formError}
              </p>
            )}

            <button
              className="btn clay"
              type="submit"
              disabled={sendingForm === 'orders' || activeBan.isBanned}
            >
              {activeBan.isBanned
                ? lang === 'hi'
                  ? `अकाउंट बैन (${activeBan.daysLeft} दिन बाकी)`
                  : `Account Suspended (${activeBan.daysLeft}d left)`
                : sendingForm === 'orders'
                  ? t.submitting
                  : paymentMethod === 'upi'
                    ? t.placeUpi
                    : t.placeCod}
            </button>
            <p className="mu small">
              {paymentMethod === 'upi' ? t.payUpiNote : t.payCodNote}
            </p>
          </form>
        </div>
      </section>

      <section id="voices">
        <div className="w">
          <div className="head rv">
            <div>
              <div className="kicker">{t.rk}</div>
              <h2>
                {lang === 'en' ? (
                  <>
                    Planted one? <em>Tell us.</em>
                  </>
                ) : (
                  <>
                    पौधा लगाया? <em>बताइए।</em>
                  </>
                )}
              </h2>
            </div>
            <p className="mu">{t.rs}</p>
          </div>

          {approvedReviews.length > 0 && (
            <div className="approved-reviews">
              {approvedReviews.map((r) => (
                <article className="rev-card" key={r.id}>
                  <div className="rev-stars" aria-label={`${r.rating} out of 5 stars`}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </div>
                  <p>“{r.review}”</p>
                  <footer>— {r.name}</footer>
                </article>
              ))}
            </div>
          )}

          <div className="voices">
            <form
              className={`sheet rv${sendingForm === 'reviews' ? ' sending' : ''}`}
              name="reviews"
              onSubmit={handleReviewSubmit}
            >
              <input type="hidden" name="form-name" value="reviews" />
              <p hidden>
                <label>
                  Leave empty <input name="bot" />
                </label>
              </p>
              <h3>{t.rfh}</h3>
              <div className="stars" role="radiogroup" aria-label="Rating">
                <input type="radio" name="rating" value="5" id="s5" required />
                <label htmlFor="s5" title="5">
                  ★
                </label>
                <input type="radio" name="rating" value="4" id="s4" />
                <label htmlFor="s4" title="4">
                  ★
                </label>
                <input type="radio" name="rating" value="3" id="s3" />
                <label htmlFor="s3" title="3">
                  ★
                </label>
                <input type="radio" name="rating" value="2" id="s2" />
                <label htmlFor="s2" title="2">
                  ★
                </label>
                <input type="radio" name="rating" value="1" id="s1" />
                <label htmlFor="s1" title="1">
                  ★
                </label>
              </div>
              <label className="f">
                <span>{t.name}</span>
                <input
                  name="name"
                  placeholder={t.namep}
                  defaultValue={user?.displayName || ''}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label className="f">
                <span>{t.rl}</span>
                <textarea
                  name="review"
                  rows={3}
                  placeholder={t.rph}
                  required
                  minLength={3}
                  maxLength={1000}
                />
              </label>
              <label className="file f">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="M21 16l-5-5-8 8" />
                </svg>
                <span
                  id="fname"
                  style={{
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontWeight: 500,
                    margin: 0,
                    fontSize: '15px',
                  }}
                >
                  {fileName || t.photo}
                </span>
                <input
                  type="file"
                  name="photo"
                  id="photo"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setFileName(f ? f.name : null);
                  }}
                />
              </label>
              <button
                className="btn"
                type="submit"
                disabled={sendingForm === 'reviews'}
              >
                {t.send}
              </button>
            </form>

            <form
              className={`sheet rv${sendingForm === 'feedback' ? ' sending' : ''}`}
              name="feedback"
              onSubmit={handleFeedbackSubmit}
            >
              <input type="hidden" name="form-name" value="feedback" />
              <p hidden>
                <label>
                  Leave empty <input name="bot" />
                </label>
              </p>
              <h3>{t.fh}</h3>
              <p className="mu" style={{ marginTop: '-10px' }}>
                {t.fs}
              </p>
              <label className="f">
                <span>{t.ft}</span>
                <select name="type">
                  <option value="Suggestion">Suggestion / सुझाव</option>
                  <option value="Bulk / Corporate">
                    Bulk or corporate / बल्क ऑर्डर
                  </option>
                  <option value="Complaint">Complaint / शिकायत</option>
                  <option value="Other">Other / अन्य</option>
                </select>
              </label>
              <label className="f">
                <span>{t.fm}</span>
                <textarea
                  name="message"
                  rows={4}
                  placeholder={t.fph}
                  required
                  minLength={3}
                  maxLength={1500}
                />
              </label>
              <label className="f">
                <span>{t.fcl}</span>
                <input
                  name="contact"
                  placeholder={t.fc}
                  defaultValue={user?.email || ''}
                  maxLength={120}
                />
              </label>
              <button
                className="btn ghost"
                type="submit"
                disabled={sendingForm === 'feedback'}
              >
                {t.fsend}
              </button>
            </form>
          </div>
        </div>
      </section>

      <FaqSection lang={lang} />

      <footer>
        <div className="w">
          <p className="big">
            {lang === 'en' ? (
              <>
                Gift <em>growth,</em>
                <br />
                not waste.
              </>
            ) : (
              <>
                कचरा नहीं,
                <br />
                <em>हरियाली</em> गिफ्ट करें।
              </>
            )}
          </p>
          <div className="bot">
            <span>
              <b>GrowWish</b> · <span>{t.foot}</span>
            </span>
            <div className="footer-links">
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => {
                  setTrackerInitialCode('');
                  setTrackerOpen(true);
                }}
              >
                {t.track}
              </button>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => setAuthModalOpen(true)}
              >
                {user ? t.memberOrdersLink : t.signIn}
              </button>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('admin');
                }}
              >
                {t.admin}
              </a>
              <span>
                © <span id="yr">{currentYear}</span> GrowWish
              </span>
            </div>
          </div>
        </div>
      </footer>

      <a
        className="wa"
        id="wa"
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t.wa)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
        </svg>
        WhatsApp
      </a>

      {/* Compact mobile thumb-zone quick dock */}
      <div className="mobile-dock" role="navigation" aria-label="Quick actions">
        <a href="#studio" className="mobile-dock-item">
          <Sparkles size={17} />
          <span>{t.nStudio}</span>
        </a>
        <button
          type="button"
          className="mobile-dock-item"
          onClick={() => {
            setTrackerInitialCode('');
            setTrackerOpen(true);
          }}
        >
          <PackageSearch size={17} />
          <span>{t.track}</span>
        </button>
        <button
          type="button"
          className="mobile-dock-item"
          onClick={() => setAuthModalOpen(true)}
        >
          <UserIcon size={17} />
          <span>{user ? firstName : t.signIn}</span>
        </button>
        <a href="#order" className="mobile-dock-item mobile-dock-cta">
          <ShoppingBag size={17} />
          <span>{t.n5}</span>
        </a>
      </div>

      {storeToast && (
        <div className="store-toast" role="status" aria-live="polite">
          {storeToast}
        </div>
      )}

      {quickViewDesign && (
        <DesignQuickViewModal
          design={quickViewDesign}
          lang={lang}
          onClose={() => setQuickViewDesign(null)}
          onCustomizeInStudio={(id) => {
            setSelectedDesign(id);
            scrollToSection('studio');
          }}
          onOrderDesign={(id) => {
            setSelectedDesign(id);
            scrollToSection('order');
          }}
        />
      )}

      {trackerOpen && (
        <OrderTrackerModal
          lang={lang}
          initialCode={trackerInitialCode}
          onClose={() => setTrackerOpen(false)}
        />
      )}

      {authModalOpen && (
        <AuthAccountModal
          lang={lang}
          user={user}
          profile={userProfile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onOpenAdmin={() => navigate('admin')}
          onTrackOrder={(orderCode) => {
            setTrackerInitialCode(orderCode);
            setTrackerOpen(true);
          }}
          onProfileUpdated={(phone, address) => {
            setCustomerPhone(phone);
            setCustomerAddress(address);
            setUserProfile((prev) =>
              prev ? { ...prev, phone, address } : prev,
            );
          }}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </>
  );
}

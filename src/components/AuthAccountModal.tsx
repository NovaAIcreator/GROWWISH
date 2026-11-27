import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  getActiveBanInfo,
  isAdminEmail,
  Lang,
  OrderRecord,
  updateUserDeliveryProfile,
  UserProfileRecord,
  WHATSAPP,
} from '../catalog';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface AuthAccountModalProps {
  lang: Lang;
  user: User | null;
  profile: UserProfileRecord | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenAdmin: () => void;
  onTrackOrder: (orderCode: string) => void;
  onProfileUpdated: (phone: string, address: string) => void;
  onClose: () => void;
}

const STEPS = ['new', 'confirmed', 'packed', 'shipped', 'delivered'] as const;

const COPY = {
  en: {
    brandSub: 'Plantable Seed Paper',
    leftTitle: 'Your GrowWish account.',
    leftDesc:
      'Sign in once with Google to track every order in real time, save your delivery address, and view your full gift history.',
    perks: [
      'Instant live order tracking & UPI UTR verification updates',
      'One-tap checkout with your saved phone and address',
      'Full history of every seed-paper pack you have gifted',
    ],
    rightKicker: 'Member Access',
    rightTitle: 'Welcome to GrowWish',
    rightSub:
      'Fast, password-free sign in using your Google account. Store administrators unlock the Command Center automatically.',
    googleBtn: 'Continue with Google',
    signingIn: 'Signing in…',
    privacyNote: 'We only use your name and email to link your orders.',
    tabOrders: 'My Orders',
    tabProfile: 'Saved Delivery',
    adminBtn: 'Open Admin Dashboard',
    signOut: 'Sign out',
    noOrdersTitle: 'No orders linked yet',
    noOrdersSub:
      'Orders you place while signed in appear here automatically with live UPI and shipping updates.',
    shopNow: 'Browse Seed Cards',
    phone: 'Phone number',
    phoneP: '10-digit mobile number',
    address: 'Default delivery address',
    addressP: 'House no., street, city, PIN code',
    saveProfile: 'Save delivery details',
    saving: 'Saving…',
    savedMsg: 'Saved! Your next order will auto-fill automatically.',
    loginsLabel: 'Sign-ins',
    banTitle: 'Account temporarily suspended',
    banUntil: 'Suspended until',
    banDaysLeft: 'day(s) remaining',
    banHelp: 'New orders are paused until the ban expires. Believe this is a mistake? Contact us on WhatsApp.',
    liveTrackBtn: 'Open Live Tracker',
    courierLabel: 'Courier / Delivery Update',
    utrLabel: 'UTR / Txn ID',
  },
  hi: {
    brandSub: 'प्लांटेबल सीड पेपर',
    leftTitle: 'आपका GrowWish अकाउंट।',
    leftDesc:
      'Google से एक बार लॉगिन करें — अपने हर ऑर्डर को लाइव ट्रैक करें, पता सेव रखें और अपना पूरा ऑर्डर इतिहास देखें।',
    perks: [
      'हर ऑर्डर और UPI वेरिफिकेशन का लाइव स्टेटस',
      'सेव किए गए फोन और पते से 1-क्लिक ऑर्डर',
      'आपके सभी गिफ्ट ऑर्डर का पूरा रिकॉर्ड',
    ],
    rightKicker: 'मेंबर लॉगिन',
    rightTitle: 'GrowWish में स्वागत है',
    rightSub:
      'अपने Google अकाउंट से सुरक्षित और तुरंत लॉगिन करें। स्टोर एडमिन को डैशबोर्ड अपने आप मिल जाएगा।',
    googleBtn: 'Google से लॉगिन करें',
    signingIn: 'लॉगिन हो रहा है…',
    privacyNote: 'हम आपका नाम और ईमेल केवल ऑर्डर जोड़ने के लिए उपयोग करते हैं।',
    tabOrders: 'मेरे ऑर्डर',
    tabProfile: 'सेव किया पता',
    adminBtn: 'Admin Dashboard खोलें',
    signOut: 'लॉग आउट',
    noOrdersTitle: 'अभी कोई ऑर्डर नहीं है',
    noOrdersSub:
      'लॉगिन करने के बाद किए गए आपके सभी ऑर्डर यहाँ लाइव स्टेटस के साथ दिखेंगे।',
    shopNow: 'डिज़ाइन देखें',
    phone: 'फोन नंबर',
    phoneP: '10 अंकों का मोबाइल नंबर',
    address: 'डिलीवरी पता',
    addressP: 'मकान नं., गली, शहर, पिन कोड',
    saveProfile: 'डिलीवरी जानकारी सेव करें',
    saving: 'सेव हो रहा है…',
    savedMsg: 'सेव हो गया! अगले ऑर्डर में पता अपने आप भर जाएगा।',
    loginsLabel: 'लॉगिन',
    banTitle: 'अकाउंट अस्थायी रूप से बैन है',
    banUntil: 'बैन समाप्त होगा:',
    banDaysLeft: 'दिन बाकी',
    banHelp: 'बैन हटने तक नए ऑर्डर बंद हैं। अगर कोई गलती हुई है तो WhatsApp पर संपर्क करें।',
    liveTrackBtn: 'लाइव ट्रैकर खोलें',
    courierLabel: 'कूरियर / डिलीवरी अपडेट',
    utrLabel: 'UTR / Txn ID',
  },
} as const;

function formatDate(ts?: { toDate?: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatBanDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AuthAccountModal: React.FC<AuthAccountModalProps> = ({
  lang,
  user,
  profile,
  onSignIn,
  onSignOut,
  onOpenAdmin,
  onTrackOrder,
  onProfileUpdated,
  onClose,
}) => {
  const c = COPY[lang];
  const [signingIn, setSigningIn] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [tab, setTab] = useState<'orders' | 'profile'>('orders');
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const banInfo = getActiveBanInfo(profile);

  useEffect(() => {
    setPhone(profile?.phone || '');
    setAddress(profile?.address || '');
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    setOrdersLoading(true);
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as OrderRecord)
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
          );
        setMyOrders(list);
        setOrdersLoading(false);
      },
      (err) => {
        setOrdersLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        } catch {
          // handled safely
        }
      },
    );
    return () => unsub();
  }, [user]);

  const handleGoogleClick = async () => {
    setErrMsg('');
    setSigningIn(true);
    try {
      await onSignIn();
    } catch (err) {
      setErrMsg(
        err instanceof Error ? err.message : 'Sign-in could not be completed.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSavedNotice(false);
    try {
      await updateUserDeliveryProfile(user.uid, { phone, address });
      onProfileUpdated(phone, address);
      setSavedNotice(true);
    } catch {
      setErrMsg('Could not save your delivery details right now.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={c.rightTitle}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="auth-split-card">
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>

          <div className="auth-left">
            <div className="auth-brand">
              <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
                <path
                  d="M16 30V15"
                  stroke="#fbf6ea"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <path d="M16 17C16 9 10 5 3 5c0 8 6 12 13 12z" fill="#88b878" />
                <path d="M16 14c0-6 5-10 13-10 0 7-5 10-13 10z" fill="#e2a93b" />
              </svg>
              <span>
                Grow<i>Wish</i>
              </span>
            </div>
            <h3>{c.leftTitle}</h3>
            <p>{c.leftDesc}</p>
            <ul className="auth-perks">
              {c.perks.map((p, i) => (
                <li key={i}>
                  <span className="auth-num">0{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="auth-right">
            <div className="kicker">{c.rightKicker}</div>
            <h2>{c.rightTitle}</h2>
            <p className="mu">{c.rightSub}</p>

            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleClick}
              disabled={signingIn}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.27c0-.85-.08-1.68-.22-2.47H12v4.68h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.83z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29A7.18 7.18 0 0 1 4.9 12c0-.79.14-1.56.37-2.29V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75z"
                />
              </svg>
              <span>{signingIn ? c.signingIn : c.googleBtn}</span>
            </button>

            {errMsg && <p className="auth-err">{errMsg}</p>}
            <p className="auth-foot-note">{c.privacyNote}</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = isAdminEmail(user.email);
  const initials = (user.displayName || user.email || 'G')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="account-modal">
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="account-head">
          <div className="account-identity">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="account-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="account-avatar fallback">{initials}</div>
            )}
            <div>
              <h3>{user.displayName || 'GrowWish Member'}</h3>
              <div className="account-meta">
                <span>{user.email}</span>
                {profile?.loginCount ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {profile.loginCount} {c.loginsLabel}
                    </span>
                  </>
                ) : null}
                {isAdmin && (
                  <>
                    <span aria-hidden="true">·</span>
                    <strong style={{ color: 'var(--leaf)' }}>Store Admin</strong>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="account-head-actions">
            {isAdmin && (
              <button
                type="button"
                className="btn clay"
                style={{ padding: '10px 16px', fontSize: 13.5 }}
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
              >
                {c.adminBtn}
              </button>
            )}
            <button
              type="button"
              className="btn ghost"
              style={{ padding: '10px 16px', fontSize: 13.5 }}
              onClick={async () => {
                await onSignOut();
                onClose();
              }}
            >
              {c.signOut}
            </button>
          </div>
        </div>

        {banInfo.isBanned && (
          <div className="ban-banner" role="alert">
            <div className="ban-banner-top">
              <strong>{c.banTitle}</strong>
              <span className="tabular-nums">
                {banInfo.daysLeft} {c.banDaysLeft}
              </span>
            </div>
            <p className="ban-banner-reason">Reason: {banInfo.reason}</p>
            <p className="ban-banner-meta tabular-nums">
              {c.banUntil} {formatBanDate(banInfo.untilDate)} · {c.banHelp}{' '}
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                  `Hi GrowWish, my account (${user.email}) is temporarily suspended. Please help review my UPI payment.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp Support →
              </a>
            </p>
          </div>
        )}

        <div className="account-tabs">
          <button
            type="button"
            className={tab === 'orders' ? 'active' : ''}
            onClick={() => setTab('orders')}
          >
            {c.tabOrders} ({myOrders.length})
          </button>
          <button
            type="button"
            className={tab === 'profile' ? 'active' : ''}
            onClick={() => setTab('profile')}
          >
            {c.tabProfile}
          </button>
        </div>

        {tab === 'orders' ? (
          <div className="account-body">
            {ordersLoading ? (
              <p className="mu">Loading your orders…</p>
            ) : myOrders.length === 0 ? (
              <div className="account-empty">
                <h4>{c.noOrdersTitle}</h4>
                <p className="mu">{c.noOrdersSub}</p>
                <a
                  href="#designs"
                  className="btn clay"
                  style={{ marginTop: 8, padding: '11px 20px', fontSize: 14 }}
                  onClick={onClose}
                >
                  {c.shopNow}
                </a>
              </div>
            ) : (
              <div className="account-order-list">
                {myOrders.map((o) => {
                  const stepIdx = STEPS.indexOf(
                    o.orderStatus as (typeof STEPS)[number],
                  );
                  const payLabel =
                    o.paymentStatus === 'verified'
                      ? 'Real Payment Verified ✓'
                      : o.paymentStatus === 'fake'
                        ? 'Fake / Unmatched Payment'
                        : o.paymentStatus === 'pending_verification'
                          ? 'Verifying UTR'
                          : o.paymentStatus === 'cod'
                            ? 'Pay on Confirm'
                            : 'Payment Issue';
                  const payColor =
                    o.paymentStatus === 'verified'
                      ? 'var(--leaf)'
                      : o.paymentStatus === 'fake' || o.paymentStatus === 'failed'
                        ? '#b91c1c'
                        : 'var(--clay)';

                  return (
                    <article className="account-order-row" key={o.orderCode}>
                      <div className="account-order-top">
                        <div>
                          <strong className="tabular-nums">{o.orderCode}</strong>
                          <span className="mu" style={{ marginLeft: 10, fontSize: 13 }}>
                            {formatDate(o.createdAt)}
                          </span>
                        </div>
                        <div className="account-order-status tabular-nums">
                          <span>₹{o.totalAmount.toLocaleString('en-IN')}</span>
                          <span aria-hidden="true">·</span>
                          <span style={{ color: payColor }}>{payLabel}</span>
                        </div>
                      </div>

                      <div className="mu" style={{ fontSize: 14, marginTop: 4 }}>
                        {o.product} × {o.qty} · {o.design}
                      </div>

                      {o.paymentMethod === 'upi' && (
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          <span className="mu">{c.utrLabel}: </span>
                          <code className="tabular-nums">
                            {o.utrNumber || 'Not entered'}
                          </code>
                        </div>
                      )}

                      {o.paymentStatus === 'fake' && (
                        <div className="track-fake-alert" style={{ marginTop: 10 }}>
                          <strong>Payment flagged as fake / unmatched</strong>
                          <p>
                            {o.paymentReason ||
                              'The submitted Transaction ID did not match our UPI statement.'}
                          </p>
                        </div>
                      )}

                      {o.trackingNote && (
                        <div className="track-courier-box" style={{ marginTop: 10 }}>
                          <span className="upi-meta-lbl">{c.courierLabel}</span>
                          <p>{o.trackingNote}</p>
                        </div>
                      )}

                      {o.orderStatus === 'cancelled' ? (
                        <div className="track-cancelled" style={{ marginTop: 10 }}>
                          Cancelled
                        </div>
                      ) : (
                        <div className="track-steps" style={{ marginTop: 12 }}>
                          {STEPS.map((st, idx) => (
                            <div
                              key={st}
                              className={`track-step${idx <= stepIdx ? ' done' : ''}`}
                            >
                              <span className="dot" />
                              <small style={{ textTransform: 'capitalize' }}>
                                {st}
                              </small>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="account-order-foot">
                        <button
                          type="button"
                          className="inline-link-btn"
                          onClick={() => {
                            onClose();
                            onTrackOrder(o.orderCode);
                          }}
                        >
                          {c.liveTrackBtn} →
                        </button>
                        <a
                          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                            `Hi GrowWish, checking on my order ${o.orderCode} (${o.product} × ${o.qty}).`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mu"
                          style={{ fontSize: 13 }}
                        >
                          WhatsApp Help
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form className="account-body" onSubmit={handleSaveProfile}>
            <label className="f">
              <span>{c.phone}</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={c.phoneP}
                maxLength={18}
              />
            </label>
            <label className="f">
              <span>{c.address}</span>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={c.addressP}
                maxLength={500}
              />
            </label>
            {savedNotice && (
              <p style={{ color: 'var(--leaf)', fontSize: 14, margin: '6px 0 12px' }}>
                {c.savedMsg}
              </p>
            )}
            {errMsg && <p className="auth-err">{errMsg}</p>}
            <button type="submit" className="btn clay" disabled={saving}>
              {saving ? c.saving : c.saveProfile}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

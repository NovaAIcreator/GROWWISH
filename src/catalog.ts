import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export type Lang = 'en' | 'hi';

/* ====== Store Configuration ====== */
export const WHATSAPP = '918287572661';
export const UPI_ID = '8287572661@fam';
export const PAYEE_NAME = 'GrowWish';
export const ADMIN_EMAIL = 'rd354856@gmail.com';

export const DESIGNS = [
  {
    id: 'Wildflower Thank You',
    img: '/img/thank-you-floral.webp',
    w: 736,
    h: 1075,
    n: { en: 'Wildflower Thank You', hi: 'वाइल्डफ्लावर थैंक यू' },
    t: {
      en: 'Weddings · Return gifts · Events',
      hi: 'शादी · रिटर्न गिफ्ट · इवेंट',
    },
  },
  {
    id: 'Thank You For Helping Me Grow',
    img: '/img/helping-me-grow.webp',
    w: 736,
    h: 981,
    n: {
      en: 'Thanks for Helping Me Grow',
      hi: 'मुझे बढ़ने में मदद के लिए शुक्रिया',
    },
    t: {
      en: "Teachers' Day · Mentors · Parents",
      hi: 'टीचर्स डे · गुरु · माता-पिता',
    },
  },
  {
    id: 'Happy Birthday Blooms',
    img: '/img/happy-birthday.webp',
    w: 736,
    h: 574,
    n: { en: 'Happy Birthday Blooms', hi: 'हैप्पी बर्थडे ब्लूम्स' },
    t: { en: 'Birthdays · Kids · Friends', hi: 'जन्मदिन · बच्चे · दोस्त' },
  },
] as const;

export const PRODUCTS = [
  {
    n: 'Seed Paper – Pack of 5',
    c: 5,
    p: 149,
    best: 0,
    d: {
      en: ['5 plantable cards', 'Mix any designs', 'Kraft envelopes'],
      hi: ['5 प्लांटेबल कार्ड', 'कोई भी डिज़ाइन मिलाएं', 'क्राफ्ट लिफाफे'],
    },
  },
  {
    n: 'Seed Paper – Pack of 10',
    c: 10,
    p: 269,
    best: 1,
    d: {
      en: [
        '10 plantable cards',
        'Mix any designs',
        'Kraft envelopes',
        'Planting guide card',
      ],
      hi: [
        '10 प्लांटेबल कार्ड',
        'कोई भी डिज़ाइन मिलाएं',
        'क्राफ्ट लिफाफे',
        'पौधा लगाने की गाइड',
      ],
    },
  },
  {
    n: 'Seed Paper – Pack of 25',
    c: 25,
    p: 599,
    best: 0,
    d: {
      en: [
        '25 plantable cards',
        'For events & corporate gifting',
        'Custom message on request',
      ],
      hi: [
        '25 प्लांटेबल कार्ड',
        'इवेंट और कॉर्पोरेट गिफ्टिंग',
        'अपना मैसेज (अनुरोध पर)',
      ],
    },
  },
] as const;

export type PaymentMethod = 'upi' | 'cod';
export type PaymentStatus =
  | 'pending_verification'
  | 'verified'
  | 'fake'
  | 'cod'
  | 'failed';
export type OrderStatusValue =
  | 'new'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  loginCount: number;
  phone: string;
  address: string;
  bannedUntil?: Timestamp | null;
  banReason?: string;
  fakePaymentStrikes?: number;
  createdAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LoginLogRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  userAgent: string;
  createdAt?: Timestamp | null;
}

export interface OrderRecord {
  orderCode: string;
  userId: string;
  userEmail: string;
  design: string;
  product: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  upiId: string;
  utrNumber: string;
  paymentStatus: PaymentStatus;
  paymentReason?: string;
  trackingNote?: string;
  orderStatus: OrderStatusValue;
  name: string;
  phone: string;
  address: string;
  message: string;
  adminNote: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface OrderStatusRecord {
  orderCode: string;
  design: string;
  product: string;
  qty: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReason?: string;
  trackingNote?: string;
  orderStatus: OrderStatusValue;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ReviewRecord {
  id: string;
  rating: number;
  name: string;
  review: string;
  photoName: string;
  approved: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FeedbackRecord {
  id: string;
  type: 'Suggestion' | 'Bulk / Corporate' | 'Complaint' | 'Other';
  message: string;
  contact: string;
  status: 'open' | 'resolved';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

export function getActiveBanInfo(profile?: UserProfileRecord | null): {
  isBanned: boolean;
  untilDate: Date | null;
  daysLeft: number;
  reason: string;
} {
  if (!profile?.bannedUntil || typeof profile.bannedUntil.toMillis !== 'function') {
    return { isBanned: false, untilDate: null, daysLeft: 0, reason: '' };
  }
  const untilMs = profile.bannedUntil.toMillis();
  const nowMs = Date.now();
  if (untilMs <= nowMs) {
    return { isBanned: false, untilDate: null, daysLeft: 0, reason: '' };
  }
  const daysLeft = Math.max(1, Math.ceil((untilMs - nowMs) / 86400000));
  return {
    isBanned: true,
    untilDate: new Date(untilMs),
    daysLeft,
    reason: profile.banReason || 'Unmatched / fake UPI transaction ID',
  };
}

/**
 * Generates an unambiguous uppercase order reference code like GW-7K4M9P
 * matching firestore.rules `^GW-[A-Z0-9]{4,12}$`.
 */
export function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let suffix = '';
  for (let i = 0; i < bytes.length; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `GW-${suffix}`;
}

/**
 * Builds standard NPCI UPI deep-link URI for QR codes and direct mobile pay intents.
 */
export function buildUpiUri(params: {
  amount: number;
  note?: string;
  ref?: string;
  scheme?: 'upi' | 'gpay' | 'phonepe' | 'paytm';
}): string {
  const query = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: params.amount.toFixed(2),
    cu: 'INR',
    tn: (params.note || 'GrowWish Seed Paper Order').slice(0, 60),
  });
  if (params.ref) {
    query.set('tr', params.ref.slice(0, 24));
  }
  const qs = query.toString();
  switch (params.scheme) {
    case 'gpay':
      return `tez://upi/pay?${qs}`;
    case 'phonepe':
      return `phonepe://pay?${qs}`;
    case 'paytm':
      return `paytmmp://pay?${qs}`;
    default:
      return `upi://pay?${qs}`;
  }
}

/**
 * Synchronizes a verified Firebase Auth user profile into `/users/{uid}`
 * and appends a login session audit entry into `/login_logs/{logId}`.
 */
export async function syncUserLogin(
  user: User,
  recordNewSession: boolean,
): Promise<UserProfileRecord | null> {
  if (!user.email || !user.emailVerified) return null;

  const userRef = doc(db, 'users', user.uid);
  const now = serverTimestamp();
  const safeName = (user.displayName || user.email.split('@')[0] || 'Member').slice(0, 120);
  const safePhoto = (user.photoURL || '').slice(0, 500);
  const safeEmail = user.email.slice(0, 160);

  try {
    const snap = await getDoc(userRef);
    let profile: UserProfileRecord;

    if (!snap.exists()) {
      const payload = {
        uid: user.uid,
        email: safeEmail,
        displayName: safeName,
        photoURL: safePhoto,
        role: 'user' as const,
        loginCount: 1,
        phone: '',
        address: '',
        bannedUntil: null,
        banReason: '',
        fakePaymentStrikes: 0,
        createdAt: now,
        lastLoginAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, payload);
      profile = { ...payload, createdAt: null, lastLoginAt: null, updatedAt: null };
    } else {
      const existing = snap.data() as UserProfileRecord;
      if (recordNewSession) {
        const nextCount = Math.min(100000, (existing.loginCount || 1) + 1);
        await updateDoc(userRef, {
          displayName: safeName,
          photoURL: safePhoto,
          loginCount: nextCount,
          lastLoginAt: now,
          updatedAt: now,
        });
        profile = {
          ...existing,
          displayName: safeName,
          photoURL: safePhoto,
          loginCount: nextCount,
        };
      } else {
        profile = existing;
      }
    }

    if (recordNewSession) {
      const logRef = doc(collection(db, 'login_logs'));
      const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web').slice(0, 240);
      await setDoc(logRef, {
        uid: user.uid,
        email: safeEmail,
        displayName: safeName,
        photoURL: safePhoto,
        userAgent: ua,
        createdAt: serverTimestamp(),
      });
    }

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function updateUserDeliveryProfile(
  uid: string,
  updates: { phone: string; address: string },
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      phone: updates.phone.trim().slice(0, 18),
      address: updates.address.trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function createOrderAtomic(input: {
  orderCode: string;
  userId?: string;
  userEmail?: string;
  design: string;
  product: string;
  qty: number;
  paymentMethod: PaymentMethod;
  utrNumber: string;
  name: string;
  phone: string;
  address: string;
  message: string;
}): Promise<OrderRecord> {
  const catalogItem = PRODUCTS.find((p) => p.n === input.product) || PRODUCTS[0];
  const qty = Math.min(999, Math.max(1, Math.floor(input.qty) || 1));
  const unitPrice = catalogItem.p;
  const totalAmount = unitPrice * qty;
  const cleanUtr =
    input.paymentMethod === 'upi'
      ? input.utrNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
      : '';
  const paymentStatus: PaymentStatus =
    input.paymentMethod === 'upi' ? 'pending_verification' : 'cod';

  const cleanOrderCode = input.orderCode.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const now = serverTimestamp();

  const orderDoc = {
    orderCode: cleanOrderCode,
    userId: (input.userId || '').slice(0, 128),
    userEmail: (input.userEmail || '').slice(0, 160),
    design: input.design.slice(0, 80),
    product: catalogItem.n,
    qty,
    unitPrice,
    totalAmount,
    paymentMethod: input.paymentMethod,
    upiId: input.paymentMethod === 'upi' ? UPI_ID : '',
    utrNumber: cleanUtr,
    paymentStatus,
    paymentReason: '',
    trackingNote: '',
    orderStatus: 'new' as OrderStatusValue,
    name: input.name.trim().slice(0, 100),
    phone: input.phone.trim().slice(0, 18),
    address: input.address.trim().slice(0, 500),
    message: input.message.trim().slice(0, 400),
    adminNote: '',
    createdAt: now,
    updatedAt: now,
  };

  const statusDoc = {
    orderCode: cleanOrderCode,
    design: orderDoc.design,
    product: orderDoc.product,
    qty,
    totalAmount,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    paymentReason: '',
    trackingNote: '',
    orderStatus: 'new' as OrderStatusValue,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'orders', cleanOrderCode), orderDoc);
  batch.set(doc(db, 'order_status', cleanOrderCode), statusDoc);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${cleanOrderCode}`);
  }

  return {
    ...orderDoc,
    createdAt: null,
    updatedAt: null,
  };
}

export async function trackOrderByCode(rawCode: string): Promise<OrderStatusRecord | null> {
  const code = rawCode.trim().toUpperCase();
  if (!/^GW-[A-Z0-9]{4,12}$/.test(code)) {
    return null;
  }
  const path = `order_status/${code}`;
  try {
    const snap = await getDoc(doc(db, 'order_status', code));
    if (!snap.exists()) return null;
    return snap.data() as OrderStatusRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeOrderStatus(
  rawCode: string,
  onData: (record: OrderStatusRecord | null) => void,
  onError?: () => void,
): () => void {
  const code = rawCode.trim().toUpperCase();
  if (!/^GW-[A-Z0-9]{4,12}$/.test(code)) {
    onData(null);
    return () => {};
  }
  const path = `order_status/${code}`;
  return onSnapshot(
    doc(db, 'order_status', code),
    (snap) => {
      onData(snap.exists() ? (snap.data() as OrderStatusRecord) : null);
    },
    (error) => {
      onError?.();
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        // handled by caller UI
      }
    },
  );
}

export async function submitReview(input: {
  rating: number;
  name: string;
  review: string;
  photoName: string;
}): Promise<string> {
  const ref = doc(collection(db, 'reviews'));
  const now = serverTimestamp();
  const payload = {
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    name: input.name.trim().slice(0, 80),
    review: input.review.trim().slice(0, 1000),
    photoName: input.photoName.trim().slice(0, 160),
    approved: false,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await setDoc(ref, payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${ref.id}`);
  }
}

export async function submitFeedback(input: {
  type: 'Suggestion' | 'Bulk / Corporate' | 'Complaint' | 'Other';
  message: string;
  contact: string;
}): Promise<string> {
  const ref = doc(collection(db, 'feedback'));
  const now = serverTimestamp();
  const payload = {
    type: input.type,
    message: input.message.trim().slice(0, 1500),
    contact: input.contact.trim().slice(0, 120),
    status: 'open' as const,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await setDoc(ref, payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `feedback/${ref.id}`);
  }
}

export async function updateOrderAdmin(
  orderCode: string,
  updates: {
    paymentStatus?: PaymentStatus;
    paymentReason?: string;
    trackingNote?: string;
    orderStatus?: OrderStatusValue;
    adminNote?: string;
    utrNumber?: string;
  },
): Promise<void> {
  const now = serverTimestamp();
  const batch = writeBatch(db);
  const orderPatch: Record<string, unknown> = { updatedAt: now };
  const statusPatch: Record<string, unknown> = { updatedAt: now };
  let syncPublicStatus = false;

  if (updates.paymentStatus !== undefined) {
    orderPatch.paymentStatus = updates.paymentStatus;
    statusPatch.paymentStatus = updates.paymentStatus;
    syncPublicStatus = true;
  }
  if (updates.paymentReason !== undefined) {
    const clean = updates.paymentReason.trim().slice(0, 240);
    orderPatch.paymentReason = clean;
    statusPatch.paymentReason = clean;
    syncPublicStatus = true;
  }
  if (updates.trackingNote !== undefined) {
    const clean = updates.trackingNote.trim().slice(0, 240);
    orderPatch.trackingNote = clean;
    statusPatch.trackingNote = clean;
    syncPublicStatus = true;
  }
  if (updates.orderStatus !== undefined) {
    orderPatch.orderStatus = updates.orderStatus;
    statusPatch.orderStatus = updates.orderStatus;
    syncPublicStatus = true;
  }
  if (updates.adminNote !== undefined) {
    orderPatch.adminNote = updates.adminNote.slice(0, 400);
  }
  if (updates.utrNumber !== undefined) {
    orderPatch.utrNumber = updates.utrNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  }

  batch.update(doc(db, 'orders', orderCode), orderPatch);
  if (syncPublicStatus) {
    batch.update(doc(db, 'order_status', orderCode), statusPatch);
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderCode}`);
  }
}

export async function markPaymentRealAdmin(
  orderCode: string,
  currentOrderStatus: OrderStatusValue,
): Promise<void> {
  const nextStatus: OrderStatusValue =
    currentOrderStatus === 'new' || currentOrderStatus === 'cancelled'
      ? 'confirmed'
      : currentOrderStatus;
  await updateOrderAdmin(orderCode, {
    paymentStatus: 'verified',
    paymentReason: '',
    orderStatus: nextStatus,
  });
}

export async function markPaymentFakeAndBanAdmin(params: {
  orderCode: string;
  userId?: string;
  reason: string;
  banDays: number;
  currentStrikes?: number;
}): Promise<void> {
  const now = serverTimestamp();
  const cleanReason =
    params.reason.trim().slice(0, 240) ||
    'Fake / unmatched UPI Transaction ID (UTR)';
  const safeDays = Math.min(365, Math.max(0, Math.floor(params.banDays) || 0));

  const batch = writeBatch(db);
  batch.update(doc(db, 'orders', params.orderCode), {
    paymentStatus: 'fake',
    paymentReason: cleanReason,
    orderStatus: 'cancelled',
    updatedAt: now,
  });
  batch.update(doc(db, 'order_status', params.orderCode), {
    paymentStatus: 'fake',
    paymentReason: cleanReason,
    orderStatus: 'cancelled',
    updatedAt: now,
  });

  if (params.userId && safeDays > 0) {
    const until = Timestamp.fromMillis(Date.now() + safeDays * 86400000);
    batch.update(doc(db, 'users', params.userId), {
      bannedUntil: until,
      banReason: cleanReason,
      fakePaymentStrikes: Math.min(1000, (params.currentStrikes || 0) + 1),
      updatedAt: now,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${params.orderCode}`);
  }
}

export async function banUserAdmin(
  uid: string,
  banDays: number,
  reason: string,
  currentStrikes?: number,
): Promise<void> {
  const safeDays = Math.min(365, Math.max(1, Math.floor(banDays) || 3));
  const cleanReason =
    reason.trim().slice(0, 240) || 'Account temporarily suspended for fake payment';
  const until = Timestamp.fromMillis(Date.now() + safeDays * 86400000);
  try {
    await updateDoc(doc(db, 'users', uid), {
      bannedUntil: until,
      banReason: cleanReason,
      fakePaymentStrikes: Math.min(1000, (currentStrikes || 0) + 1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function unbanUserAdmin(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      bannedUntil: null,
      banReason: '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function deleteOrderAdmin(orderCode: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'orders', orderCode));
  batch.delete(doc(db, 'order_status', orderCode));
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${orderCode}`);
  }
}

export async function toggleReviewApproval(reviewId: string, approved: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), {
      approved,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reviews/${reviewId}`);
  }
}

export async function deleteReviewAdmin(reviewId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'open' | 'resolved',
): Promise<void> {
  try {
    await updateDoc(doc(db, 'feedback', feedbackId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `feedback/${feedbackId}`);
  }
}

export async function deleteFeedbackAdmin(feedbackId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'feedback', feedbackId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `feedback/${feedbackId}`);
  }
}

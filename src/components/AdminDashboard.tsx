import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ADMIN_EMAIL,
  banUserAdmin,
  deleteFeedbackAdmin,
  deleteOrderAdmin,
  deleteReviewAdmin,
  DESIGNS,
  FeedbackRecord,
  getActiveBanInfo,
  isAdminEmail,
  LoginLogRecord,
  markPaymentFakeAndBanAdmin,
  markPaymentRealAdmin,
  OrderRecord,
  OrderStatusValue,
  PaymentStatus,
  PRODUCTS,
  ReviewRecord,
  toggleReviewApproval,
  unbanUserAdmin,
  updateFeedbackStatus,
  updateOrderAdmin,
  UserProfileRecord,
  WHATSAPP,
} from '../catalog';

interface AdminDashboardProps {
  user: User | null;
  authReady: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onBackToStore: () => void;
}

type AdminNav = 'overview' | 'orders' | 'users' | 'reviews' | 'feedback';

function formatDateTime(ts?: { toDate?: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseDevice(ua: string): string {
  const s = ua || '';
  const os = /Android/i.test(s)
    ? 'Android'
    : /iPhone|iPad|iOS/i.test(s)
      ? 'iOS'
      : /Mac OS/i.test(s)
        ? 'macOS'
        : /Windows/i.test(s)
          ? 'Windows'
          : /Linux/i.test(s)
            ? 'Linux'
            : 'Web';
  const browser = /Edg/i.test(s)
    ? 'Edge'
    : /Chrome/i.test(s)
      ? 'Chrome'
      : /Safari/i.test(s)
        ? 'Safari'
        : /Firefox/i.test(s)
          ? 'Firefox'
          : 'Browser';
  return `${browser} · ${os}`;
}

function csvSafeCell(val: unknown): string {
  const raw = String(val ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function normalizeUtr(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  authReady,
  onSignIn,
  onSignOut,
  onBackToStore,
}) => {
  const [nav, setNav] = useState<AdminNav>('overview');
  const [authError, setAuthError] = useState('');
  const [permError, setPermError] = useState('');

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [users, setUsers] = useState<UserProfileRecord[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [globalUtrCheck, setGlobalUtrCheck] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSubTab, setUserSubTab] = useState<'directory' | 'sessions'>('directory');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Per-order drafts & UTR verification UI state
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [utrCompareDrafts, setUtrCompareDrafts] = useState<Record<string, string>>({});
  const [copiedUtrCode, setCopiedUtrCode] = useState<string | null>(null);

  // Inline Fake Payment + Ban modal/panel per order
  const [fakePanelOrder, setFakePanelOrder] = useState<string | null>(null);
  const [fakeReason, setFakeReason] = useState('Fake / unmatched UPI Transaction ID (UTR)');
  const [fakeBanDays, setFakeBanDays] = useState<number>(7);

  // Inline Ban form in Users table
  const [banPanelUid, setBanPanelUid] = useState<string | null>(null);
  const [userBanDays, setUserBanDays] = useState<number>(7);
  const [userBanReason, setUserBanReason] = useState('Fake / unmatched UPI payment submitted');

  const isVerifiedAdmin = Boolean(
    user && user.emailVerified && isAdminEmail(user.email),
  );

  useEffect(() => {
    if (!authReady || !user || !isVerifiedAdmin) {
      setOrders([]);
      setUsers([]);
      setLoginLogs([]);
      setReviews([]);
      setFeedbacks([]);
      return;
    }

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((d) => d.data() as OrderRecord));
      },
      (err) => {
        setPermError(err.message);
        try {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        } catch {
          // captured in UI
        }
      },
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('lastLoginAt', 'desc')),
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserProfileRecord));
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'users');
        } catch {
          // captured
        }
      },
    );

    const unsubLogins = onSnapshot(
      query(collection(db, 'login_logs'), orderBy('createdAt', 'desc')),
      (snap) => {
        setLoginLogs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<LoginLogRecord, 'id'>),
          })),
        );
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'login_logs');
        } catch {
          // captured
        }
      },
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), orderBy('createdAt', 'desc')),
      (snap) => {
        setReviews(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ReviewRecord, 'id'>),
          })),
        );
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'reviews');
        } catch {
          // captured
        }
      },
    );

    const unsubFeedback = onSnapshot(
      query(collection(db, 'feedback'), orderBy('createdAt', 'desc')),
      (snap) => {
        setFeedbacks(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FeedbackRecord, 'id'>),
          })),
        );
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'feedback');
        } catch {
          // captured
        }
      },
    );

    return () => {
      unsubOrders();
      unsubUsers();
      unsubLogins();
      unsubReviews();
      unsubFeedback();
    };
  }, [authReady, user, isVerifiedAdmin]);

  const userById = useMemo(() => {
    const map = new Map<string, UserProfileRecord>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const utrCounts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const norm = normalizeUtr(o.utrNumber || '');
      if (norm.length >= 6) {
        map.set(norm, (map.get(norm) || 0) + 1);
      }
    });
    return map;
  }, [orders]);

  const globalUtrMatches = useMemo(() => {
    const q = normalizeUtr(globalUtrCheck);
    if (q.length < 4) return [];
    return orders.filter((o) => {
      const norm = normalizeUtr(o.utrNumber || '');
      return norm && norm.includes(q);
    });
  }, [orders, globalUtrCheck]);

  // Analytics computed 100% from real Firestore collections
  const analytics = useMemo(() => {
    const totalUsers = users.length;
    const activeBansCount = users.filter((u) => getActiveBanInfo(u).isBanned).length;
    const totalLogins =
      loginLogs.length ||
      users.reduce((acc, u) => acc + (u.loginCount || 0), 0);
    const totalOrders = orders.length;
    const validOrders = orders.filter(
      (o) => o.orderStatus !== 'cancelled' && o.paymentStatus !== 'fake',
    );
    const grossRevenue = validOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const verifiedRevenue = orders
      .filter((o) => o.paymentStatus === 'verified')
      .reduce((acc, o) => acc + o.totalAmount, 0);
    const pendingUpiCount = orders.filter(
      (o) =>
        o.paymentStatus === 'pending_verification' &&
        o.orderStatus !== 'cancelled',
    ).length;
    const pendingUpiRevenue = orders
      .filter(
        (o) =>
          o.paymentStatus === 'pending_verification' &&
          o.orderStatus !== 'cancelled',
      )
      .reduce((acc, o) => acc + o.totalAmount, 0);
    const fakePaymentCount = orders.filter((o) => o.paymentStatus === 'fake').length;
    const signedInOrderUsers = new Set(
      orders.filter((o) => o.userId).map((o) => o.userId),
    );
    const conversionRate =
      totalUsers > 0
        ? Math.round((signedInOrderUsers.size / totalUsers) * 100)
        : 0;
    const avgOrderValue =
      validOrders.length > 0 ? Math.round(grossRevenue / validOrders.length) : 0;
    const pendingReviews = reviews.filter((r) => !r.approved).length;
    const openFeedback = feedbacks.filter((f) => f.status === 'open').length;

    // 7-day timeline
    const days: { key: string; label: string; orders: number; revenue: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      days.push({ key, label, orders: 0, revenue: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.key, d]));
    validOrders.forEach((o) => {
      const dt = o.createdAt?.toDate?.();
      if (!dt) return;
      const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
        .toISOString()
        .slice(0, 10);
      const bucket = dayMap.get(key);
      if (bucket) {
        bucket.orders += 1;
        bucket.revenue += o.totalAmount;
      }
    });

    // Pack breakdown
    const packStats = PRODUCTS.map((p) => {
      const matched = validOrders.filter((o) => o.product === p.n);
      return {
        name: p.n.replace('Seed Paper – ', ''),
        orders: matched.length,
        packsSold: matched.reduce((a, o) => a + o.qty, 0),
        revenue: matched.reduce((a, o) => a + o.totalAmount, 0),
      };
    });

    // Design breakdown
    const designKeys = [...DESIGNS.map((d) => d.id), 'Mixed'];
    const designStats = designKeys.map((dk) => {
      const matched = validOrders.filter((o) => o.design === dk);
      return {
        name: dk,
        orders: matched.length,
        revenue: matched.reduce((a, o) => a + o.totalAmount, 0),
      };
    });

    // Pipeline counts
    const pipeline: Record<OrderStatusValue, number> = {
      new: 0,
      confirmed: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      if (pipeline[o.orderStatus] !== undefined) {
        pipeline[o.orderStatus] += 1;
      }
    });

    // Per-user order aggregations
    const userOrderMap = new Map<string, { count: number; spent: number }>();
    orders.forEach((o) => {
      const key = o.userId || o.userEmail?.toLowerCase();
      if (!key) return;
      const cur = userOrderMap.get(key) || { count: 0, spent: 0 };
      cur.count += 1;
      if (o.orderStatus !== 'cancelled' && o.paymentStatus !== 'fake') {
        cur.spent += o.totalAmount;
      }
      userOrderMap.set(key, cur);
    });

    // Combined live activity stream
    type ActivityItem = {
      id: string;
      kind: 'order' | 'login';
      title: string;
      detail: string;
      timeMs: number;
      timeLabel: string;
    };
    const activities: ActivityItem[] = [
      ...orders.slice(0, 8).map((o) => ({
        id: `ord-${o.orderCode}`,
        kind: 'order' as const,
        title: `${o.name} placed ${o.orderCode}`,
        detail: `${o.product} × ${o.qty} · ₹${o.totalAmount.toLocaleString('en-IN')} (${o.paymentMethod.toUpperCase()}${o.utrNumber ? ` · UTR ${o.utrNumber}` : ''})`,
        timeMs: o.createdAt?.toMillis?.() ?? Date.now(),
        timeLabel: formatDateTime(o.createdAt),
      })),
      ...loginLogs.slice(0, 8).map((l) => ({
        id: `log-${l.id}`,
        kind: 'login' as const,
        title: `${l.displayName || l.email} signed in`,
        detail: `${l.email} · ${parseDevice(l.userAgent)}`,
        timeMs: l.createdAt?.toMillis?.() ?? Date.now(),
        timeLabel: formatDateTime(l.createdAt),
      })),
    ]
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 10);

    return {
      totalUsers,
      activeBansCount,
      totalLogins,
      totalOrders,
      grossRevenue,
      verifiedRevenue,
      pendingUpiCount,
      pendingUpiRevenue,
      fakePaymentCount,
      conversionRate,
      avgOrderValue,
      pendingReviews,
      openFeedback,
      days,
      packStats,
      designStats,
      pipeline,
      userOrderMap,
      activities,
    };
  }, [orders, users, loginLogs, reviews, feedbacks]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        (o.userEmail || '').toLowerCase().includes(q) ||
        o.utrNumber.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, paymentFilter, orderSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const filteredFeedbacks = useMemo(() => {
    if (feedbackFilter === 'all') return feedbacks;
    return feedbacks.filter((f) => f.status === feedbackFilter);
  }, [feedbacks, feedbackFilter]);

  const handleCopyUtr = async (orderCode: string, utr: string) => {
    if (!utr) return;
    try {
      await navigator.clipboard.writeText(utr);
      setCopiedUtrCode(orderCode);
      setTimeout(() => setCopiedUtrCode(null), 1800);
    } catch {
      // ignore
    }
  };

  const exportOrdersCsv = () => {
    const headers = [
      'OrderCode',
      'Date',
      'Customer',
      'AccountEmail',
      'Phone',
      'Address',
      'Design',
      'Product',
      'Qty',
      'TotalINR',
      'PaymentMethod',
      'UTR',
      'PaymentStatus',
      'PaymentReason',
      'TrackingNote',
      'OrderStatus',
      'CustomerNote',
      'AdminNote',
    ];
    const rows = orders.map((o) =>
      [
        o.orderCode,
        formatDateTime(o.createdAt),
        o.name,
        o.userEmail || 'Guest',
        o.phone,
        o.address,
        o.design,
        o.product,
        o.qty,
        o.totalAmount,
        o.paymentMethod,
        o.utrNumber,
        o.paymentStatus,
        o.paymentReason || '',
        o.trackingNote || '',
        o.orderStatus,
        o.message,
        o.adminNote,
      ]
        .map(csvSafeCell)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growwish-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUsersCsv = () => {
    const headers = [
      'Name',
      'Email',
      'Role',
      'AccountStatus',
      'FakePaymentStrikes',
      'LoginCount',
      'OrdersPlaced',
      'TotalSpentINR',
      'Phone',
      'Address',
      'FirstLogin',
      'LastLogin',
    ];
    const rows = users.map((u) => {
      const agg = analytics.userOrderMap.get(u.uid) || { count: 0, spent: 0 };
      const ban = getActiveBanInfo(u);
      return [
        u.displayName,
        u.email,
        isAdminEmail(u.email) ? 'Admin' : 'Customer',
        ban.isBanned
          ? `Banned (${ban.daysLeft}d left - ${ban.reason})`
          : 'Active',
        u.fakePaymentStrikes || 0,
        u.loginCount,
        agg.count,
        agg.spent,
        u.phone,
        u.address,
        formatDateTime(u.createdAt),
        formatDateTime(u.lastLoginAt),
      ]
        .map(csvSafeCell)
        .join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growwish-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildCustomerWhatsApp = (o: OrderRecord) => {
    const digits = o.phone.replace(/\D/g, '');
    const waNum = digits.length === 10 ? `91${digits}` : digits || WHATSAPP;
    const paySummary =
      o.paymentStatus === 'verified'
        ? 'Real Payment Verified'
        : o.paymentStatus === 'fake'
          ? `Payment Rejected (${o.paymentReason || 'Unmatched UTR'})`
          : o.paymentStatus;
    const trackExtra = o.trackingNote ? ` Tracking: ${o.trackingNote}.` : '';
    const msg = `Hi ${o.name}! Your GrowWish order ${o.orderCode} (${o.product} × ${o.qty}, ₹${o.totalAmount}) status is now: ${o.orderStatus.toUpperCase()}. Payment: ${paySummary}.${trackExtra}`;
    return `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;
  };

  if (!authReady) {
    return (
      <div className="thanks-page">
        <div>
          <h1>GROWWISH ADMIN</h1>
          <p className="mu">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="thanks-page">
        <div className="sheet" style={{ maxWidth: 460, width: '100%' }}>
          <div className="kicker">Command Center</div>
          <h2 style={{ fontSize: 36, marginBottom: 10 }}>
            GrowWish <em>Admin</em>
          </h2>
          <p className="mu" style={{ marginBottom: 22 }}>
            Sign in with <b>{ADMIN_EMAIL}</b> to match UPI Transaction IDs (UTR),
            verify real payments, flag fake payments & ban accounts, and manage
            orders and users.
          </p>
          <button
            type="button"
            className="btn clay"
            onClick={async () => {
              setAuthError('');
              try {
                await onSignIn();
              } catch (err) {
                setAuthError(
                  err instanceof Error ? err.message : 'Sign-in failed',
                );
              }
            }}
          >
            Sign in with Google
          </button>
          {authError && <p className="auth-err">{authError}</p>}
          <p style={{ marginTop: 18 }}>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBackToStore();
              }}
            >
              ← Back to GrowWish store
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (!isVerifiedAdmin) {
    return (
      <div className="thanks-page">
        <div className="sheet" style={{ maxWidth: 480, width: '100%' }}>
          <div className="kicker">Access Restricted</div>
          <h2 style={{ fontSize: 32 }}>Admin access required</h2>
          <p className="mu">
            Signed in as <b>{user.email}</b>. Only the authorized store owner (
            <code>{ADMIN_EMAIL}</code>) can access the GrowWish Admin Command
            Center.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              marginTop: 18,
              flexWrap: 'wrap',
            }}
          >
            <button type="button" className="btn ghost" onClick={onSignOut}>
              Switch account
            </button>
            <button type="button" className="btn" onClick={onBackToStore}>
              Back to store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxDayRevenue = Math.max(
    1,
    ...analytics.days.map((d) => d.revenue),
  );
  const maxPackRev = Math.max(1, ...analytics.packStats.map((p) => p.revenue));
  const maxDesignOrders = Math.max(
    1,
    ...analytics.designStats.map((d) => d.orders),
  );

  const navTitleMap: Record<AdminNav, string> = {
    overview: 'Overview & Analytics',
    orders: 'Orders, UTR Matcher & Verification',
    users: 'Users, Logins & Bans',
    reviews: 'Reviews Moderation',
    feedback: 'Feedback & Bulk Inquiries',
  };

  return (
    <div className="exec-shell">
      <aside className="exec-sidebar">
        <div className="exec-brand">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackToStore();
            }}
          >
            <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
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
          </a>
        </div>

        <nav className="exec-nav" aria-label="Admin sections">
          <button
            type="button"
            className={nav === 'overview' ? 'active' : ''}
            onClick={() => setNav('overview')}
          >
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={nav === 'orders' ? 'active' : ''}
            onClick={() => setNav('orders')}
          >
            <span>Orders & UTR Check</span>
            <span className="exec-count tabular-nums">{orders.length}</span>
          </button>
          <button
            type="button"
            className={nav === 'users' ? 'active' : ''}
            onClick={() => setNav('users')}
          >
            <span>Users & Bans</span>
            <span className="exec-count tabular-nums">{users.length}</span>
          </button>
          <button
            type="button"
            className={nav === 'reviews' ? 'active' : ''}
            onClick={() => setNav('reviews')}
          >
            <span>Reviews</span>
            <span className="exec-count tabular-nums">{reviews.length}</span>
          </button>
          <button
            type="button"
            className={nav === 'feedback' ? 'active' : ''}
            onClick={() => setNav('feedback')}
          >
            <span>Feedback & Bulk</span>
            <span className="exec-count tabular-nums">{feedbacks.length}</span>
          </button>
        </nav>

        <div className="exec-side-foot">
          <div className="exec-admin-me">
            <div className="exec-admin-name">{user.displayName || 'Admin'}</div>
            <div className="exec-admin-email">{user.email}</div>
          </div>
          <div className="exec-side-actions">
            <button type="button" onClick={onBackToStore}>
              View Storefront
            </button>
            <button type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="exec-main">
        <header className="exec-topbar">
          <div className="exec-crumb">
            <span>GrowWish Admin</span>
            <span aria-hidden="true">/</span>
            <strong>{navTitleMap[nav]}</strong>
          </div>
          <div className="exec-top-actions">
            {nav === 'users' ? (
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '9px 16px', fontSize: 13.5 }}
                onClick={exportUsersCsv}
              >
                Export Users CSV
              </button>
            ) : (
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '9px 16px', fontSize: 13.5 }}
                onClick={exportOrdersCsv}
              >
                Export Orders CSV
              </button>
            )}
          </div>
        </header>

        <div className="exec-content">
          {permError && (
            <div className="admin-alert">
              Firestore permission notice: {permError}
            </div>
          )}

          {nav === 'overview' && (
            <>
              <div className="exec-kpi-grid">
                <div className="exec-kpi">
                  <div className="exec-kpi-lbl">Registered Users</div>
                  <div className="exec-kpi-val tabular-nums">
                    {analytics.totalUsers}
                  </div>
                  <div className="exec-kpi-sub tabular-nums">
                    {analytics.totalLogins} sign-ins
                    {analytics.activeBansCount > 0
                      ? ` · ${analytics.activeBansCount} banned`
                      : ''}
                  </div>
                </div>

                <div className="exec-kpi">
                  <div className="exec-kpi-lbl">Total Orders</div>
                  <div className="exec-kpi-val tabular-nums">
                    {analytics.totalOrders}
                  </div>
                  <div className="exec-kpi-sub tabular-nums">
                    Avg. order value ₹{analytics.avgOrderValue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="exec-kpi">
                  <div className="exec-kpi-lbl">Verified Real UPI Revenue</div>
                  <div className="exec-kpi-val tabular-nums">
                    ₹{analytics.verifiedRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="exec-kpi-sub tabular-nums">
                    Gross valid value ₹{analytics.grossRevenue.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="exec-kpi">
                  <div className="exec-kpi-lbl">Pending UTR Verification</div>
                  <div
                    className="exec-kpi-val tabular-nums"
                    style={{
                      color:
                        analytics.pendingUpiCount > 0
                          ? 'var(--clay)'
                          : 'var(--ink)',
                    }}
                  >
                    {analytics.pendingUpiCount}
                  </div>
                  <div className="exec-kpi-sub tabular-nums">
                    ₹{analytics.pendingUpiRevenue.toLocaleString('en-IN')} pending ·{' '}
                    {analytics.fakePaymentCount} fake flagged
                  </div>
                </div>

                <div className="exec-kpi">
                  <div className="exec-kpi-lbl">Login-to-Order Rate</div>
                  <div className="exec-kpi-val tabular-nums">
                    {analytics.conversionRate}%
                  </div>
                  <div className="exec-kpi-sub">
                    Signed-in members who ordered
                  </div>
                </div>

                <div className="exec-kpi">
                  <div className="exec-kpi-lbl">Trust & Moderation</div>
                  <div className="exec-kpi-val tabular-nums">
                    {analytics.activeBansCount +
                      analytics.pendingReviews +
                      analytics.openFeedback}
                  </div>
                  <div className="exec-kpi-sub tabular-nums">
                    {analytics.activeBansCount} bans · {analytics.pendingReviews}{' '}
                    reviews · {analytics.openFeedback} inquiries
                  </div>
                </div>
              </div>

              <div className="exec-two-col">
                <section className="exec-panel">
                  <div className="exec-panel-head">
                    <div>
                      <h3>7-Day Revenue & Orders</h3>
                      <p className="mu">Daily valid order volume from live Firestore records</p>
                    </div>
                  </div>
                  <div className="exec-bars">
                    {analytics.days.map((d) => {
                      const pct = Math.max(
                        d.revenue > 0 ? 12 : 4,
                        Math.round((d.revenue / maxDayRevenue) * 100),
                      );
                      return (
                        <div className="exec-bar-col" key={d.key}>
                          <div className="exec-bar-top tabular-nums">
                            {d.revenue > 0 ? `₹${d.revenue}` : '—'}
                          </div>
                          <div className="exec-bar-track">
                            <div
                              className={`exec-bar-fill${d.revenue > 0 ? ' has-val' : ''}`}
                              style={{ height: `${pct}%` }}
                              title={`${d.label}: ${d.orders} orders, ₹${d.revenue}`}
                            />
                          </div>
                          <div className="exec-bar-lbl">{d.label}</div>
                          <div className="exec-bar-sub tabular-nums">
                            {d.orders} ord
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="exec-panel">
                  <div className="exec-panel-head">
                    <div>
                      <h3>Packs & Designs Breakdown</h3>
                      <p className="mu">Best-selling seed paper packs and artwork</p>
                    </div>
                  </div>

                  <div className="exec-metric-rows">
                    {analytics.packStats.map((p) => (
                      <div className="exec-meter" key={p.name}>
                        <div className="exec-meter-head">
                          <strong>{p.name}</strong>
                          <span className="tabular-nums">
                            {p.packsSold} packs · ₹{p.revenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="exec-meter-track">
                          <div
                            className="exec-meter-fill"
                            style={{
                              width: `${p.revenue > 0 ? Math.max(8, Math.round((p.revenue / maxPackRev) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="exec-metric-rows"
                    style={{
                      marginTop: 18,
                      paddingTop: 16,
                      borderTop: '1px dashed var(--bd)',
                    }}
                  >
                    {analytics.designStats.map((d) => (
                      <div className="exec-meter" key={d.name}>
                        <div className="exec-meter-head">
                          <span>{d.name}</span>
                          <span className="tabular-nums">
                            {d.orders} orders
                          </span>
                        </div>
                        <div className="exec-meter-track">
                          <div
                            className="exec-meter-fill clay"
                            style={{
                              width: `${d.orders > 0 ? Math.max(8, Math.round((d.orders / maxDesignOrders) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="exec-two-col">
                <section className="exec-panel">
                  <div className="exec-panel-head">
                    <div>
                      <h3>Fulfillment Pipeline</h3>
                      <p className="mu">Click any stage to filter orders immediately</p>
                    </div>
                  </div>
                  <div className="exec-pipeline-grid">
                    {(
                      [
                        'new',
                        'confirmed',
                        'packed',
                        'shipped',
                        'delivered',
                        'cancelled',
                      ] as OrderStatusValue[]
                    ).map((st) => (
                      <button
                        type="button"
                        key={st}
                        className="exec-pipe-tile"
                        onClick={() => {
                          setStatusFilter(st);
                          setNav('orders');
                        }}
                      >
                        <span className="exec-pipe-name">{st}</span>
                        <b className="tabular-nums">{analytics.pipeline[st]}</b>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="exec-panel">
                  <div className="exec-panel-head">
                    <div>
                      <h3>Live Activity Stream</h3>
                      <p className="mu">Latest user logins and incoming orders</p>
                    </div>
                  </div>
                  {analytics.activities.length === 0 ? (
                    <p className="mu">No activity recorded yet.</p>
                  ) : (
                    <ul className="exec-feed">
                      {analytics.activities.map((a) => (
                        <li key={a.id}>
                          <div>
                            <div className="exec-feed-title">
                              <span
                                className={`exec-feed-type ${a.kind === 'order' ? 'ord' : 'log'}`}
                              >
                                {a.kind === 'order' ? 'Order' : 'Login'}
                              </span>
                              <strong>{a.title}</strong>
                            </div>
                            <div className="mu" style={{ fontSize: 13 }}>
                              {a.detail}
                            </div>
                          </div>
                          <time className="tabular-nums">{a.timeLabel}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}

          {nav === 'orders' && (
            <>
              {/* Quick FamPay UTR Statement Matcher */}
              <section className="utr-global-matcher">
                <div className="utr-global-head">
                  <div>
                    <h3>Quick UPI Transaction ID (UTR) Matcher</h3>
                    <p className="mu">
                      Paste any Transaction ID from FamPay to instantly locate the
                      order and verify Real vs Fake payment.
                    </p>
                  </div>
                  <div className="utr-global-stats tabular-nums">
                    <span>{analytics.pendingUpiCount} Pending</span>
                    <span aria-hidden="true">·</span>
                    <span style={{ color: '#b91c1c' }}>
                      {analytics.fakePaymentCount} Fake
                    </span>
                  </div>
                </div>

                <div className="utr-global-bar">
                  <input
                    type="text"
                    placeholder="Paste FamPay / UPI Transaction ID (e.g. 432198765432)…"
                    value={globalUtrCheck}
                    onChange={(e) => setGlobalUtrCheck(e.target.value)}
                    className="utr-mono-input"
                  />
                  {globalUtrCheck && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '9px 14px', fontSize: 13 }}
                      onClick={() => setGlobalUtrCheck('')}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {normalizeUtr(globalUtrCheck).length >= 4 && (
                  <div className="utr-global-result">
                    {globalUtrMatches.length === 0 ? (
                      <div className="utr-res-miss">
                        No order found with UTR matching{' '}
                        <code>{normalizeUtr(globalUtrCheck)}</code>.
                      </div>
                    ) : (
                      <div className="utr-res-hits">
                        {globalUtrMatches.map((m) => (
                          <div className="utr-res-row" key={m.orderCode}>
                            <div>
                              <strong className="tabular-nums">{m.orderCode}</strong>{' '}
                              · {m.name} ·{' '}
                              <strong className="tabular-nums">
                                ₹{m.totalAmount.toLocaleString('en-IN')}
                              </strong>{' '}
                              · UTR: <code>{m.utrNumber}</code>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                className="utr-mini-action"
                                onClick={() => setOrderSearch(m.orderCode)}
                              >
                                Focus Order
                              </button>
                              {m.paymentStatus !== 'verified' && (
                                <button
                                  type="button"
                                  className="utr-mini-action real"
                                  disabled={busyId === m.orderCode}
                                  onClick={async () => {
                                    setBusyId(m.orderCode);
                                    try {
                                      await markPaymentRealAdmin(
                                        m.orderCode,
                                        m.orderStatus,
                                      );
                                    } finally {
                                      setBusyId(null);
                                    }
                                  }}
                                >
                                  ✓ Mark Real
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <div className="admin-filters" style={{ marginBottom: 18 }}>
                <input
                  type="search"
                  placeholder="Search order code, name, phone, email, UTR…"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  style={{ minWidth: 260, flex: 1 }}
                />
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="all">All payments</option>
                  <option value="pending_verification">UPI Pending Check</option>
                  <option value="verified">Real Payment Verified</option>
                  <option value="fake">Fake Payment Flagged</option>
                  <option value="cod">Pay on Confirmation</option>
                  <option value="failed">Payment Failed</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="admin-list">
                {filteredOrders.length === 0 ? (
                  <div className="exec-panel" style={{ textAlign: 'center' }}>
                    <p className="mu">No matching orders found.</p>
                  </div>
                ) : (
                  filteredOrders.map((o) => {
                    const draftNote =
                      noteDrafts[o.orderCode] !== undefined
                        ? noteDrafts[o.orderCode]
                        : o.adminNote || '';
                    const draftTracking =
                      trackingDrafts[o.orderCode] !== undefined
                        ? trackingDrafts[o.orderCode]
                        : o.trackingNote || '';
                    const compareInput = utrCompareDrafts[o.orderCode] || '';
                    const submittedNorm = normalizeUtr(o.utrNumber || '');
                    const compareNorm = normalizeUtr(compareInput);
                    const isExactMatch =
                      Boolean(submittedNorm) &&
                      Boolean(compareNorm) &&
                      submittedNorm === compareNorm;
                    const isMismatch =
                      Boolean(compareNorm) && submittedNorm !== compareNorm;
                    const dupCount = submittedNorm
                      ? utrCounts.get(submittedNorm) || 0
                      : 0;
                    const linkedUser = o.userId ? userById.get(o.userId) : undefined;
                    const linkedBan = getActiveBanInfo(linkedUser);
                    const isFakePanelOpen = fakePanelOrder === o.orderCode;

                    const payStatusLabel =
                      o.paymentStatus === 'verified'
                        ? 'Real Payment Verified ✓'
                        : o.paymentStatus === 'fake'
                          ? 'Fake Payment ✕'
                          : o.paymentStatus === 'pending_verification'
                            ? 'Pending UTR Check'
                            : o.paymentStatus === 'cod'
                              ? 'Pay on Confirmation'
                              : 'Payment Failed';

                    const payStatusColor =
                      o.paymentStatus === 'verified'
                        ? 'var(--leaf)'
                        : o.paymentStatus === 'fake' || o.paymentStatus === 'failed'
                          ? '#b91c1c'
                          : 'var(--clay)';

                    return (
                      <article className="admin-card" key={o.orderCode}>
                        <div className="admin-card-head">
                          <div>
                            <strong className="admin-code tabular-nums">
                              {o.orderCode}
                            </strong>
                            <span
                              className="mu tabular-nums"
                              style={{ marginLeft: 10, fontSize: 13 }}
                            >
                              {formatDateTime(o.createdAt)}
                            </span>
                            <span
                              className="mu"
                              style={{ marginLeft: 10, fontSize: 13 }}
                            >
                              ·{' '}
                              {o.userEmail
                                ? `Account: ${o.userEmail}`
                                : 'Guest Checkout'}
                            </span>
                            {linkedBan.isBanned && (
                              <span className="ban-inline-tag tabular-nums">
                                · Account Banned ({linkedBan.daysLeft}d left)
                              </span>
                            )}
                          </div>
                          <div className="admin-meta-text">
                            <span style={{ color: payStatusColor, fontWeight: 700 }}>
                              {o.paymentMethod.toUpperCase()} · {payStatusLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <strong style={{ textTransform: 'capitalize' }}>
                              {o.orderStatus}
                            </strong>
                          </div>
                        </div>

                        {/* Dedicated UPI Transaction ID (UTR) Verification Box */}
                        {o.paymentMethod === 'upi' && (
                          <div className="utr-verify-box">
                            <div className="utr-verify-top">
                              <div>
                                <div className="admin-lbl">
                                  Customer Submitted Transaction ID (UTR)
                                </div>
                                <div className="utr-code-line">
                                  <code className="utr-big-code tabular-nums">
                                    {o.utrNumber || 'NOT ENTERED BY CUSTOMER'}
                                  </code>
                                  {o.utrNumber && (
                                    <button
                                      type="button"
                                      className="utr-copy-chip"
                                      onClick={() =>
                                        handleCopyUtr(o.orderCode, o.utrNumber)
                                      }
                                    >
                                      {copiedUtrCode === o.orderCode
                                        ? 'Copied ✓'
                                        : 'Copy UTR'}
                                    </button>
                                  )}
                                  <span className="mu tabular-nums" style={{ fontSize: 13 }}>
                                    Expected: <b>₹{o.totalAmount.toLocaleString('en-IN')}</b>{' '}
                                    → {o.upiId}
                                  </span>
                                </div>
                                {dupCount > 1 && (
                                  <div className="utr-dup-warn">
                                    Duplicate Transaction ID detected — this exact UTR
                                    appears on {dupCount} orders!
                                  </div>
                                )}
                              </div>

                              <div className="utr-decision-btns">
                                <button
                                  type="button"
                                  className={`utr-btn-real${o.paymentStatus === 'verified' ? ' done' : ''}`}
                                  disabled={
                                    busyId === o.orderCode ||
                                    o.paymentStatus === 'verified'
                                  }
                                  onClick={async () => {
                                    setBusyId(o.orderCode);
                                    try {
                                      await markPaymentRealAdmin(
                                        o.orderCode,
                                        o.orderStatus,
                                      );
                                      if (isFakePanelOpen) setFakePanelOrder(null);
                                    } finally {
                                      setBusyId(null);
                                    }
                                  }}
                                >
                                  {o.paymentStatus === 'verified'
                                    ? '✓ Real Payment Verified'
                                    : '✓ Real Payment'}
                                </button>

                                <button
                                  type="button"
                                  className={`utr-btn-fake${o.paymentStatus === 'fake' ? ' flagged' : ''}`}
                                  disabled={busyId === o.orderCode}
                                  onClick={() => {
                                    if (isFakePanelOpen) {
                                      setFakePanelOrder(null);
                                    } else {
                                      setFakeReason(
                                        o.paymentReason ||
                                          'Fake / unmatched UPI Transaction ID (UTR)',
                                      );
                                      setFakeBanDays(o.userId ? 7 : 0);
                                      setFakePanelOrder(o.orderCode);
                                    }
                                  }}
                                >
                                  {isFakePanelOpen
                                    ? 'Close Fake Panel'
                                    : o.paymentStatus === 'fake'
                                      ? '✕ Marked Fake (Edit / Ban)'
                                      : '✕ Fake Payment & Ban'}
                                </button>
                              </div>
                            </div>

                            {/* Side-by-side Transaction ID Matcher */}
                            <div className="utr-compare-row">
                              <input
                                type="text"
                                className="utr-mono-input"
                                placeholder="Paste Transaction ID from FamPay to match against customer's UTR…"
                                value={compareInput}
                                onChange={(e) =>
                                  setUtrCompareDrafts((prev) => ({
                                    ...prev,
                                    [o.orderCode]: e.target.value,
                                  }))
                                }
                              />
                              <div className="utr-match-verdict">
                                {!compareNorm ? (
                                  <span className="mu">Waiting to compare</span>
                                ) : isExactMatch ? (
                                  <strong style={{ color: '#15803d' }}>
                                    ✓ EXACT MATCH
                                  </strong>
                                ) : isMismatch ? (
                                  <strong style={{ color: '#b91c1c' }}>
                                    ✕ MISMATCH
                                  </strong>
                                ) : null}
                              </div>
                            </div>

                            {o.paymentStatus === 'fake' && o.paymentReason && (
                              <div className="utr-fake-reason-note">
                                Flagged fake reason: <b>{o.paymentReason}</b>
                              </div>
                            )}

                            {/* Inline Fake Payment + Ban Days Action Panel */}
                            {isFakePanelOpen && (
                              <div className="fake-ban-panel">
                                <div className="fake-ban-title">
                                  Mark Payment as Fake &amp; Cancel Order {o.orderCode}
                                </div>
                                <div className="fake-ban-grid">
                                  <label>
                                    <span>Rejection / Ban Reason (visible to customer)</span>
                                    <input
                                      type="text"
                                      maxLength={240}
                                      value={fakeReason}
                                      onChange={(e) => setFakeReason(e.target.value)}
                                    />
                                  </label>

                                  {o.userId ? (
                                    <div>
                                      <span className="fake-ban-lbl">
                                        Ban Customer Account ({o.userEmail} ·{' '}
                                        {linkedUser?.fakePaymentStrikes || 0} prior
                                        strikes)
                                      </span>
                                      <div className="ban-day-presets">
                                        {[0, 1, 3, 7, 14, 30].map((days) => (
                                          <button
                                            type="button"
                                            key={days}
                                            className={
                                              fakeBanDays === days ? 'active' : ''
                                            }
                                            onClick={() => setFakeBanDays(days)}
                                          >
                                            {days === 0 ? 'No Ban' : `${days}d`}
                                          </button>
                                        ))}
                                        <input
                                          type="number"
                                          min={0}
                                          max={365}
                                          value={fakeBanDays}
                                          onChange={(e) =>
                                            setFakeBanDays(
                                              Math.max(
                                                0,
                                                Math.min(
                                                  365,
                                                  parseInt(e.target.value, 10) || 0,
                                                ),
                                              ),
                                            )
                                          }
                                          aria-label="Custom ban days"
                                          className="ban-days-num tabular-nums"
                                        />
                                        <span className="mu" style={{ fontSize: 12.5 }}>
                                          days
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mu" style={{ fontSize: 13 }}>
                                      Guest checkout order (no signed-in account linked).
                                      This will mark the payment as Fake and cancel the
                                      order.
                                    </div>
                                  )}
                                </div>

                                <div className="fake-ban-actions">
                                  <button
                                    type="button"
                                    className="utr-btn-fake confirm"
                                    disabled={busyId === o.orderCode}
                                    onClick={async () => {
                                      setBusyId(o.orderCode);
                                      try {
                                        await markPaymentFakeAndBanAdmin({
                                          orderCode: o.orderCode,
                                          userId: o.userId || undefined,
                                          reason: fakeReason,
                                          banDays: o.userId ? fakeBanDays : 0,
                                          currentStrikes:
                                            linkedUser?.fakePaymentStrikes || 0,
                                        });
                                        setFakePanelOrder(null);
                                      } finally {
                                        setBusyId(null);
                                      }
                                    }}
                                  >
                                    {o.userId && fakeBanDays > 0
                                      ? `Confirm Fake Payment & Ban for ${fakeBanDays} Day(s)`
                                      : 'Confirm Fake Payment & Cancel Order'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn ghost"
                                    style={{ padding: '8px 14px', fontSize: 13 }}
                                    onClick={() => setFakePanelOrder(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="admin-card-grid">
                          <div>
                            <div className="admin-lbl">Customer & Delivery</div>
                            <div>
                              <b>{o.name}</b> ·{' '}
                              <a href={`tel:${o.phone.replace(/[^0-9+\-]/g, '')}`}>
                                {o.phone}
                              </a>
                            </div>
                            <div className="mu" style={{ fontSize: 14 }}>
                              {o.address}
                            </div>
                            {o.message && (
                              <div className="admin-note-box">
                                Customer Note: {o.message}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="admin-lbl">Order & Live Customer Tracking</div>
                            <div className="tabular-nums">
                              <b>{o.product}</b> × {o.qty} —{' '}
                              <b style={{ color: 'var(--ink)' }}>
                                ₹{o.totalAmount.toLocaleString('en-IN')}
                              </b>
                            </div>
                            <div className="mu" style={{ fontSize: 14 }}>
                              Design: {o.design}
                            </div>

                            {/* Customer-visible live tracking note */}
                            <div className="admin-inline-note">
                              <input
                                type="text"
                                placeholder="Live tracking update visible to customer (courier, AWB)…"
                                value={draftTracking}
                                maxLength={240}
                                onChange={(e) =>
                                  setTrackingDrafts((prev) => ({
                                    ...prev,
                                    [o.orderCode]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                disabled={busyId === o.orderCode}
                                onClick={async () => {
                                  setBusyId(o.orderCode);
                                  try {
                                    await updateOrderAdmin(o.orderCode, {
                                      trackingNote: draftTracking,
                                    });
                                  } finally {
                                    setBusyId(null);
                                  }
                                }}
                              >
                                Update Tracker
                              </button>
                            </div>

                            {/* Internal admin-only note */}
                            <div className="admin-inline-note">
                              <input
                                type="text"
                                placeholder="Private internal admin note…"
                                value={draftNote}
                                maxLength={400}
                                onChange={(e) =>
                                  setNoteDrafts((prev) => ({
                                    ...prev,
                                    [o.orderCode]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className="secondary"
                                disabled={busyId === o.orderCode}
                                onClick={async () => {
                                  setBusyId(o.orderCode);
                                  try {
                                    await updateOrderAdmin(o.orderCode, {
                                      adminNote: draftNote,
                                    });
                                  } finally {
                                    setBusyId(null);
                                  }
                                }}
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="admin-actions">
                          <select
                            aria-label="Payment status"
                            value={o.paymentStatus}
                            disabled={busyId === o.orderCode}
                            onChange={async (e) => {
                              setBusyId(o.orderCode);
                              try {
                                await updateOrderAdmin(o.orderCode, {
                                  paymentStatus: e.target.value as PaymentStatus,
                                });
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            <option value="pending_verification">UPI Pending</option>
                            <option value="verified">Real Payment Verified</option>
                            <option value="fake">Fake Payment</option>
                            <option value="cod">Pay on Confirmation</option>
                            <option value="failed">Payment Failed</option>
                          </select>

                          <select
                            aria-label="Order status"
                            value={o.orderStatus}
                            disabled={busyId === o.orderCode}
                            onChange={async (e) => {
                              setBusyId(o.orderCode);
                              try {
                                await updateOrderAdmin(o.orderCode, {
                                  orderStatus: e.target.value as OrderStatusValue,
                                });
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            <option value="new">New</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <a
                            href={buildCustomerWhatsApp(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn ghost"
                            style={{ padding: '9px 14px', fontSize: 13 }}
                          >
                            WhatsApp Customer
                          </a>

                          <button
                            type="button"
                            className="admin-del"
                            disabled={busyId === o.orderCode}
                            onClick={async () => {
                              setBusyId(o.orderCode);
                              try {
                                await deleteOrderAdmin(o.orderCode);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}

          {nav === 'users' && (
            <>
              <div className="admin-toolbar">
                <div className="exec-seg">
                  <button
                    type="button"
                    className={userSubTab === 'directory' ? 'active' : ''}
                    onClick={() => setUserSubTab('directory')}
                  >
                    Registered Users ({users.length})
                  </button>
                  <button
                    type="button"
                    className={userSubTab === 'sessions' ? 'active' : ''}
                    onClick={() => setUserSubTab('sessions')}
                  >
                    Login Activity Log ({loginLogs.length})
                  </button>
                </div>

                {userSubTab === 'directory' && (
                  <div className="admin-filters">
                    <input
                      type="search"
                      placeholder="Search name, email, or phone…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ minWidth: 240 }}
                    />
                  </div>
                )}
              </div>

              {userSubTab === 'directory' ? (
                <div className="exec-table-wrap">
                  {filteredUsers.length === 0 ? (
                    <div className="exec-panel" style={{ textAlign: 'center' }}>
                      <p className="mu">No registered users yet.</p>
                    </div>
                  ) : (
                    <table className="exec-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Status</th>
                          <th className="num">Logins</th>
                          <th className="num">Orders</th>
                          <th className="num">Spent</th>
                          <th>Last Login</th>
                          <th>Account Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const agg = analytics.userOrderMap.get(u.uid) || {
                            count: 0,
                            spent: 0,
                          };
                          const ban = getActiveBanInfo(u);
                          const isOwnerAdmin = isAdminEmail(u.email);
                          const initials = (u.displayName || u.email || 'U')
                            .slice(0, 2)
                            .toUpperCase();
                          const isBanRowOpen = banPanelUid === u.uid;

                          return (
                            <React.Fragment key={u.uid}>
                              <tr>
                                <td>
                                  <div className="exec-user-cell">
                                    {u.photoURL ? (
                                      <img
                                        src={u.photoURL}
                                        alt={u.displayName}
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <span className="exec-user-init">
                                        {initials}
                                      </span>
                                    )}
                                    <div>
                                      <strong>{u.displayName || 'Member'}</strong>
                                      <div className="mu" style={{ fontSize: 12.5 }}>
                                        {u.email}
                                      </div>
                                      {u.phone && (
                                        <div className="mu" style={{ fontSize: 12 }}>
                                          {u.phone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {isOwnerAdmin ? (
                                    <strong style={{ color: 'var(--leaf)' }}>
                                      Admin
                                    </strong>
                                  ) : ban.isBanned ? (
                                    <div>
                                      <strong
                                        style={{ color: '#b91c1c' }}
                                        className="tabular-nums"
                                      >
                                        Banned · {ban.daysLeft}d left
                                      </strong>
                                      <div
                                        className="mu"
                                        style={{ fontSize: 12, maxWidth: 180 }}
                                        title={ban.reason}
                                      >
                                        {ban.reason}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span style={{ color: 'var(--leaf)', fontWeight: 600 }}>
                                        Active
                                      </span>
                                      {(u.fakePaymentStrikes || 0) > 0 && (
                                        <div className="mu tabular-nums" style={{ fontSize: 12 }}>
                                          {u.fakePaymentStrikes} fake strike(s)
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="num tabular-nums">
                                  {u.loginCount}
                                </td>
                                <td className="num tabular-nums">{agg.count}</td>
                                <td className="num tabular-nums">
                                  ₹{agg.spent.toLocaleString('en-IN')}
                                </td>
                                <td className="tabular-nums" style={{ fontSize: 13 }}>
                                  {formatDateTime(u.lastLoginAt)}
                                </td>
                                <td>
                                  {isOwnerAdmin ? (
                                    <span className="mu" style={{ fontSize: 12.5 }}>
                                      Protected
                                    </span>
                                  ) : ban.isBanned ? (
                                    <button
                                      type="button"
                                      className="utr-mini-action real"
                                      disabled={busyId === u.uid}
                                      onClick={async () => {
                                        setBusyId(u.uid);
                                        try {
                                          await unbanUserAdmin(u.uid);
                                        } finally {
                                          setBusyId(null);
                                        }
                                      }}
                                    >
                                      Unban Account
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="utr-mini-action danger"
                                      disabled={busyId === u.uid}
                                      onClick={() => {
                                        if (isBanRowOpen) {
                                          setBanPanelUid(null);
                                        } else {
                                          setUserBanDays(7);
                                          setUserBanReason(
                                            'Fake / unmatched UPI payment submitted',
                                          );
                                          setBanPanelUid(u.uid);
                                        }
                                      }}
                                    >
                                      {isBanRowOpen ? 'Close' : 'Ban User'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {isBanRowOpen && (
                                <tr>
                                  <td colSpan={7} style={{ background: 'var(--paper)' }}>
                                    <div className="user-ban-inline">
                                      <div className="ban-day-presets">
                                        {[1, 3, 7, 14, 30].map((d) => (
                                          <button
                                            type="button"
                                            key={d}
                                            className={userBanDays === d ? 'active' : ''}
                                            onClick={() => setUserBanDays(d)}
                                          >
                                            {d}d
                                          </button>
                                        ))}
                                        <input
                                          type="number"
                                          min={1}
                                          max={365}
                                          value={userBanDays}
                                          onChange={(e) =>
                                            setUserBanDays(
                                              Math.max(
                                                1,
                                                Math.min(
                                                  365,
                                                  parseInt(e.target.value, 10) || 1,
                                                ),
                                              ),
                                            )
                                          }
                                          className="ban-days-num tabular-nums"
                                          aria-label="Ban days"
                                        />
                                        <span className="mu" style={{ fontSize: 12.5 }}>
                                          days
                                        </span>
                                      </div>
                                      <input
                                        type="text"
                                        value={userBanReason}
                                        maxLength={240}
                                        placeholder="Ban reason…"
                                        onChange={(e) => setUserBanReason(e.target.value)}
                                        className="user-ban-reason-input"
                                      />
                                      <button
                                        type="button"
                                        className="utr-btn-fake confirm"
                                        disabled={busyId === u.uid}
                                        onClick={async () => {
                                          setBusyId(u.uid);
                                          try {
                                            await banUserAdmin(
                                              u.uid,
                                              userBanDays,
                                              userBanReason,
                                              u.fakePaymentStrikes || 0,
                                            );
                                            setBanPanelUid(null);
                                          } finally {
                                            setBusyId(null);
                                          }
                                        }}
                                      >
                                        Ban for {userBanDays}d
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="exec-table-wrap">
                  {loginLogs.length === 0 ? (
                    <div className="exec-panel" style={{ textAlign: 'center' }}>
                      <p className="mu">No sign-in sessions logged yet.</p>
                    </div>
                  ) : (
                    <table className="exec-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Device & Browser</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map((l) => (
                          <tr key={l.id}>
                            <td>
                              <div className="exec-user-cell">
                                {l.photoURL ? (
                                  <img
                                    src={l.photoURL}
                                    alt={l.displayName}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="exec-user-init">
                                    {(l.displayName || l.email || 'U')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                                <strong>{l.displayName || 'Member'}</strong>
                              </div>
                            </td>
                            <td style={{ fontSize: 13.5 }}>{l.email}</td>
                            <td className="mu" style={{ fontSize: 13 }}>
                              {parseDevice(l.userAgent)}
                            </td>
                            <td className="tabular-nums" style={{ fontSize: 13 }}>
                              {formatDateTime(l.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}

          {nav === 'reviews' && (
            <div className="admin-list">
              {reviews.length === 0 ? (
                <div className="exec-panel" style={{ textAlign: 'center' }}>
                  <p className="mu">No customer reviews submitted yet.</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <article className="admin-card" key={r.id}>
                    <div className="admin-card-head">
                      <div>
                        <b>{r.name}</b>
                        <span style={{ color: 'var(--sun)', marginLeft: 10 }}>
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </span>
                        <span
                          className="mu tabular-nums"
                          style={{ marginLeft: 10, fontSize: 13 }}
                        >
                          {formatDateTime(r.createdAt)}
                        </span>
                      </div>
                      <strong
                        style={{
                          fontSize: 13,
                          color: r.approved ? 'var(--leaf)' : 'var(--clay)',
                        }}
                      >
                        {r.approved ? 'Published on Store' : 'Pending Approval'}
                      </strong>
                    </div>
                    <p style={{ margin: '10px 0' }}>{r.review}</p>
                    {r.photoName && (
                      <div className="mu" style={{ fontSize: 13 }}>
                        Attached photo: {r.photoName}
                      </div>
                    )}
                    <div className="admin-actions">
                      <button
                        type="button"
                        className={r.approved ? 'btn ghost' : 'btn clay'}
                        style={{ padding: '9px 14px', fontSize: 13 }}
                        onClick={() => toggleReviewApproval(r.id, !r.approved)}
                      >
                        {r.approved ? 'Hide from Store' : 'Approve & Publish'}
                      </button>
                      <button
                        type="button"
                        className="admin-del"
                        onClick={() => deleteReviewAdmin(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {nav === 'feedback' && (
            <>
              <div className="admin-toolbar">
                <div className="exec-seg">
                  <button
                    type="button"
                    className={feedbackFilter === 'all' ? 'active' : ''}
                    onClick={() => setFeedbackFilter('all')}
                  >
                    All ({feedbacks.length})
                  </button>
                  <button
                    type="button"
                    className={feedbackFilter === 'open' ? 'active' : ''}
                    onClick={() => setFeedbackFilter('open')}
                  >
                    Open ({feedbacks.filter((f) => f.status === 'open').length})
                  </button>
                  <button
                    type="button"
                    className={feedbackFilter === 'resolved' ? 'active' : ''}
                    onClick={() => setFeedbackFilter('resolved')}
                  >
                    Resolved (
                    {feedbacks.filter((f) => f.status === 'resolved').length})
                  </button>
                </div>
              </div>

              <div className="admin-list">
                {filteredFeedbacks.length === 0 ? (
                  <div className="exec-panel" style={{ textAlign: 'center' }}>
                    <p className="mu">No feedback or bulk inquiries found.</p>
                  </div>
                ) : (
                  filteredFeedbacks.map((f) => (
                    <article className="admin-card" key={f.id}>
                      <div className="admin-card-head">
                        <div>
                          <b>{f.type}</b>
                          <span
                            className="mu tabular-nums"
                            style={{ marginLeft: 10, fontSize: 13 }}
                          >
                            {formatDateTime(f.createdAt)}
                          </span>
                        </div>
                        <strong
                          style={{
                            fontSize: 13,
                            textTransform: 'capitalize',
                            color:
                              f.status === 'resolved'
                                ? 'var(--leaf)'
                                : 'var(--clay)',
                          }}
                        >
                          {f.status}
                        </strong>
                      </div>
                      <p style={{ margin: '10px 0' }}>{f.message}</p>
                      {f.contact && (
                        <div style={{ fontSize: 14 }}>
                          Contact: <b>{f.contact}</b>
                        </div>
                      )}
                      <div className="admin-actions">
                        <button
                          type="button"
                          className={
                            f.status === 'resolved' ? 'btn ghost' : 'btn clay'
                          }
                          style={{ padding: '9px 14px', fontSize: 13 }}
                          onClick={() =>
                            updateFeedbackStatus(
                              f.id,
                              f.status === 'resolved' ? 'open' : 'resolved',
                            )
                          }
                        >
                          {f.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                        </button>
                        <button
                          type="button"
                          className="admin-del"
                          onClick={() => deleteFeedbackAdmin(f.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

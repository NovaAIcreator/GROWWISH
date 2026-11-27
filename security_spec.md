# GrowWish Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **Default Deny**: All unspecified paths under `/databases/{database}/documents` are rejected.
2. **Admin Authorization**: Only verified Google accounts with `email == 'rd354856@gmail.com'` (with `email_verified == true`) or a UID present in `/admins/{uid}` may read all orders, read all users/login logs, verify or flag fake UPI payments, ban/unban user accounts, moderate reviews, or manage feedback.
3. **Self-Unban & Role-Escalation Lockout**: Users can never modify `role`, `bannedUntil`, `banReason`, or `fakePaymentStrikes` on `/users/{uid}`. On self-registration, `role == 'user'`, `bannedUntil == null`, `banReason == ''`, and `fakePaymentStrikes == 0`.
4. **Server-Side Ban Enforcement**: Signed-in users whose `/users/{uid}.bannedUntil > request.time` are blocked at the Firestore rule layer from creating new `/orders/{orderId}` or `/reviews/{reviewId}`.
5. **Catalog Price & Atomic Tracking Integrity**: Order `unitPrice` must match the official GrowWish pack price (`149`, `269`, `599`), `totalAmount == unitPrice * qty`, and `/orders/{orderId}` + `/order_status/{orderId}` must be created atomically with identical totals and statuses.
6. **PII Isolation**: Public order tracking reads `/order_status/{orderId}` which contains zero PII (no name, email, phone, or address) while exposing live `paymentStatus` (including `verified` and `fake`), `paymentReason`, `trackingNote`, and `orderStatus`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Unban Attack**: Banned user sends `update` on `/users/{ownUid}` setting `bannedUntil: null, banReason: ""` -> Rejected by `affectedKeys().hasOnly(...)` excluding ban fields.
2. **Banned User Order Creation**: Signed-in user with `bannedUntil > request.time` attempts `create` on `/orders/GW-BAN123` -> Rejected by `!isUserBanned(request.auth.uid)`.
3. **Role Self-Escalation**: User attempts `create` or `update` on `/users/{ownUid}` with `role: "admin"` -> Rejected.
4. **Fake Payment Self-Clear**: User attempts `update` on `/orders/GW-7K4M9P` changing `paymentStatus: "verified"` -> Rejected (`orders` updates require `isAdmin()`).
5. **Catalog Price Tampering**: Client creates order with `product: "Seed Paper – Pack of 25"`, `unitPrice: 1`, `totalAmount: 1` -> Rejected by `isValidCatalogPrice`.
6. **Orphan Order Without Tracking Projection**: Client creates `/orders/GW-ORPHAN` without `/order_status/GW-ORPHAN` -> Rejected by `existsAfter`.
7. **Shadow Ghost Field Injection**: Client creates order with extra key `isPaid: true` -> Rejected by `data.keys().hasOnly(...)`.
8. **Cross-User Order Scraping**: User A queries `/orders` with `where('userId', '==', userB)` -> Rejected by `resource.data.userId == request.auth.uid`.
9. **Unverified Admin Email Spoof**: Token has `email: "rd354856@gmail.com"` with `email_verified: false` -> Rejected by `isVerifiedUser()`.
10. **Public List Scrape of Order Status**: Anonymous user runs `list` on `/order_status` -> Rejected (`allow list: if isAdmin()`).
11. **Oversized Tracking Note / Ban Reason Poisoning**: Payload includes 20KB string in `banReason` or `trackingNote` -> Rejected by `.size() <= 240`.
12. **Timestamp Backdating**: Client creates `/orders/GW-BACK1` with custom `createdAt` instead of `serverTimestamp()` -> Rejected by `incoming().createdAt == request.time`.

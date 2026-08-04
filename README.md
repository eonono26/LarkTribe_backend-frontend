# duka — Multi-vendor marketplace (Women, Kids, Beauty, Maternity, Home & Lifestyle)

A Noon-inspired multi-vendor marketplace with AI/ML personalization: Django REST
Framework backend, Next.js storefront + vendor dashboard + admin console, and a
Flutter mobile app.

## What's included

- `backend/` — Django + DRF API: accounts (email/phone/Google/Apple auth), catalog,
  vendors, cart, orders, **notifications**, **promotions** (coupons/campaigns),
  **analytics** (behavior tracking + admin reports), **ai_services** (recommendations,
  smart search, chatbot, dynamic pricing, forecasting, segmentation/churn, fraud detection)
- `frontend/` — Next.js (TypeScript) storefront, vendor dashboard, and admin console
- `mobile/` — Flutter app (lib/ only — see note below)

## 1. Backend setup

```bash
cd backend
pip install -r requirements.txt --break-system-packages
python manage.py migrate
python manage.py seed_demo        # departments, full category tree, demo vendor + admin + products
python manage.py runserver
```

API runs at `http://localhost:8000/api/`. Django admin at `http://localhost:8000/admin/`.

By default it uses SQLite (zero setup, good for local dev). For production, set these
environment variables to point at Postgres instead:
`DB_ENGINE=django.db.backends.postgresql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.

Demo logins (created by `seed_demo`):
- Vendor: `demo_vendor` / `demo1234`
- Admin (superuser): `demo_admin` / `demo1234`

### Key API groups
- `/api/auth/` — register, login, `social/` (Google/Apple), `phone/request-otp/` + `phone/verify-otp/`
- `/api/catalog/` — departments, categories, products, `wishlist/`, product reviews, `admin/products/` (moderation)
- `/api/vendors/` — apply, sales dashboard, `admin/` (approve/suspend)
- `/api/orders/` — checkout, my orders, order tracking
- `/api/notifications/` — inbox, preferences, support tickets
- `/api/promotions/` — coupons, campaigns, `validate-coupon/`
- `/api/analytics/` — `track/` (behavior events), `admin/reports/`
- `/api/ai/` — `recommended-for-you/`, `search/` (typo-corrected), `chatbot/`, `image-search/`,
  vendor `pricing-suggestions/` / `demand-forecast/`, admin `dashboard/` / `segments/` / `fraud-signals/`

M-Pesa Daraja integration is stubbed (`MPESA_*` settings + a TODO in
`orders/views.py CheckoutView`) — wire up the actual STK push call when you have
Daraja sandbox/production credentials. Google/Apple token verification and SMS OTP
delivery are also stubbed for local dev — see `accounts/social_auth.py` and
`_send_sms` in `accounts/views.py` for what to wire up in production.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`. Reads the API URL from `.env.local`
(`NEXT_PUBLIC_API_URL=http://localhost:8000/api` by default). `npm run build` passes clean.

- Storefront: `/`, `/search`, `/category/[slug]`, `/product/[slug]`, `/cart`, `/checkout`
- Customer account: `/login`, `/register`, `/account/wishlist`, `/account/notifications`,
  `/account/orders`, `/orders/[orderNumber]` (tracking + return/refund request)
- Vendor: `/vendor`, `/vendor/apply` (signup + logo upload), `/vendor/login`,
  `/vendor/dashboard` (products with photo upload, orders, AI pricing insights)
- Admin: `/admin/login`, `/admin` (reports + AI dashboard), `/admin/vendors`,
  `/admin/products` (moderation), `/admin/promotions`, `/admin/support`

An AI shopping-assistant chat widget floats on every page. Design tokens (colors,
department accent colors) live in `src/app/globals.css`.

## 3. Mobile app setup

**Important:** this was written without a Flutter SDK available in the build environment,
so it has not been compiled or run. You'll need to finish setup and shake out any issues locally:

```bash
cd mobile
flutter create . --platforms=android,ios   # generates the missing android/ios scaffolding
flutter pub get
flutter run
```

By default it points at `http://10.0.2.2:8000/api` (the Android emulator's alias for your
machine's localhost). Override at build/run time for a real device or production API:

```bash
flutter run --dart-define=API_BASE_URL=http://YOUR_LAN_IP:8000/api
```

Screens: home (departments, product grid, AI "Recommended for you" row), search
(typo-corrected), category browse, product detail (wishlist, reviews, similar /
frequently-bought-together rows), cart, checkout (guest/member + coupon field),
order tracking with return/refund request, wishlist, notifications inbox, and an
AI chat assistant bottom sheet. Sign-in supports username/password and phone OTP;
Google/Apple buttons are present but need `google_sign_in` / `sign_in_with_apple`
wired in (see the TODOs in `lib/screens/login_screen.dart` and `pubspec.yaml`).

## What's intentionally simplified

- **AI/ML engines** (`backend/ai_services/engines/`) are fast, dependency-free heuristics
  (content-based recommendations, RFM segmentation, rule-based fraud/pricing, weighted
  moving-average forecasting, difflib-based typo correction) rather than trained models —
  each module documents exactly where to swap in a trained model (e.g. scikit-learn,
  a CLIP embedding index for image search, Elasticsearch/OpenSearch for search) without
  changing the API contract.
- **Image search** returns broad in-stock/highly-rated candidates rather than true visual
  similarity, pending a vision embedding model.
- **M-Pesa, Google/Apple token verification, and SMS OTP delivery** are stubbed for local
  dev with clear TODOs at the integration points.

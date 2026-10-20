# M-Pesa Daraja checkout

LarkTribe checkout now has a server-side Safaricom Daraja STK Push path. The web and Flutter clients create an order, request an STK Push, and leave the order in `pending_payment` until the callback is received and reconciled. Cash on Delivery remains available. Card checkout is intentionally disabled until a real card processor is configured; saved-card display data alone is not a payment gateway.

## Configure sandbox

1. Create a Daraja application at https://developer.safaricom.co.ke/ and use sandbox credentials.
2. Copy `.env.mpesa.example` values into your backend environment (do not commit the filled-in file).
3. Set `MPESA_ENV=sandbox`, consumer key/secret, shortcode and passkey.
4. Expose the API over a public HTTPS URL for callbacks, then set `MPESA_CALLBACK_URL=https://YOUR_PUBLIC_API_HOST/api/orders/mpesa/callback/`.
5. Generate a long random value for `MPESA_CALLBACK_TOKEN`. The backend appends it as a query parameter to the callback URL and rejects callbacks without the matching token.
6. Install dependencies and migrate:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py test orders
```

## Endpoints

- `POST /api/orders/checkout/` — create the order.
- `POST /api/orders/mpesa/initiate/<order_number>/` — body `{"phone":"0712345678"}`; starts STK Push.
- `POST /api/orders/mpesa/callback/?token=...` — Safaricom callback configured by the server.
- `GET /api/orders/<order_number>/` — retrieve current order status.

The phone must be a valid Kenyan number and match the delivery phone on the order. Amounts are taken from the server-created order, never from the client. A successful callback must contain a receipt and the expected amount; duplicate callbacks do not re-apply payment.

## Important go-live checks

- Do not set `MPESA_ENV=production` until Safaricom has approved production credentials and the shortcode/passkey are configured.
- The callback URL must be reachable from Safaricom over HTTPS. A local-only address will not work.
- Run sandbox end-to-end tests for success, user cancellation, timeout, incorrect phone, duplicate callback, and callback amount mismatch.
- Before production, add Daraja STK Query reconciliation for uncertain callbacks and operational monitoring/manual review for unmatched payments. Never treat a client-side screen or a payment prompt as proof of payment.
- Card payments are not integrated yet. Use a PCI-compliant hosted/tokenized provider (e.g. a locally supported payment gateway) before enabling the card option.

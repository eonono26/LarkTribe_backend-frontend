# M-Pesa Till (STK Push) setup

1. `cd backend && pip install -r requirements.txt && python manage.py migrate`
2. Copy `.env.example` to `.env` and fill in your Daraja values:
   - `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` – from your Daraja app
   - `MPESA_SHORTCODE` – the Store/Head-Office number your passkey belongs to
   - `MPESA_TILL_NUMBER` – the Till customers pay (empty if same as shortcode)
   - `MPESA_PASSKEY`, `MPESA_ENV` (`sandbox` or `production`)
   - `MPESA_CALLBACK_BASE_URL` – public https URL of this backend (use ngrok locally)
   - `MPESA_CALLBACK_TOKEN` – any long random string (it is part of the callback URL)
3. Safaricom calls `POST /api/orders/mpesa/callback/<MPESA_CALLBACK_TOKEN>/`.
   If it cannot reach you (e.g. localhost) the order page still confirms payment by
   querying Daraja directly.
4. Run `python manage.py expire_unpaid_orders` every ~5 minutes (cron) so unpaid
   M-Pesa orders release their reserved stock after `MPESA_ORDER_EXPIRY_MINUTES` (30).
5. Admin: Orders -> each order shows its M-Pesa attempts; status `Needs manual review`
   means an under-payment, duplicate payment, or payment after cancellation (refund/fix by hand).

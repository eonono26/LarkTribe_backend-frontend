import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Minimal .env loader (no extra dependency): KEY=VALUE lines in backend/.env are
# loaded into the environment unless the variable is already set. Keeps M-Pesa
# keys out of the codebase and out of git.
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _v = _line.split("=", 1)
        os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

allowed_hosts_env = os.environ.get("ALLOWED_HOSTS", "*")
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(",") if h.strip()] or ["*"]

csrf_trusted_env = os.environ.get("CSRF_TRUSTED_ORIGINS", "")
if csrf_trusted_env:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_trusted_env.split(",") if o.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [
        "https://*.onrender.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "accounts",
    "catalog",
    "cart",
    "orders",
    "notifications",
    "promotions",
    "analytics",
    "ai_services",
    "localization",
    "delivery",
    "adminpanel",
    "tryon",
    "integrations",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
]

try:
    import whitenoise  # noqa: F401
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")
    STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
except ImportError:
    pass

MIDDLEWARE.extend([
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
])

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATA_DIR = os.environ.get("DATA_DIR")
if DATA_DIR:
    data_path = Path(DATA_DIR)
    data_path.mkdir(parents=True, exist_ok=True)
    DEFAULT_DB_PATH = data_path / "db.sqlite3"
    DEFAULT_MEDIA_ROOT = data_path / "media"
    DEFAULT_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

    # If mounting a fresh persistent disk, copy the seed database and media if present
    repo_db = BASE_DIR / "db.sqlite3"
    if repo_db.exists() and not DEFAULT_DB_PATH.exists():
        import shutil
        shutil.copy2(repo_db, DEFAULT_DB_PATH)

    repo_media = BASE_DIR / "media"
    if repo_media.exists() and not any(DEFAULT_MEDIA_ROOT.iterdir()):
        import shutil
        shutil.copytree(repo_media, DEFAULT_MEDIA_ROOT, dirs_exist_ok=True)
else:
    DEFAULT_DB_PATH = BASE_DIR / "db.sqlite3"
    DEFAULT_MEDIA_ROOT = BASE_DIR / "media"

# Database: SQLite only (single-shop LarkTribe). The file lives at
# backend/db.sqlite3, or under DATA_DIR when a persistent disk is mounted.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DB_NAME", str(DEFAULT_DB_PATH)),
        "OPTIONS": {"timeout": 20},
    }
}

# Shared Cloudflare R2 media storage. New uploads use R2; the storage class
# serves older GitHub-backed files until migrate_media_to_r2 copies them over.
if os.environ.get("AR_STORAGE_BUCKET_NAME"):
    INSTALLED_APPS.append("storages")
    STORAGES = {
        "default": {
            "BACKEND": "catalog.storage.UnifiedMediaStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# Optional GitHub-backed media storage for temporary Render testing.
# The repository can be private; the backend streams files through github_media.
if not os.environ.get("AR_STORAGE_BUCKET_NAME") and (os.environ.get("GITHUB_MEDIA_REPO") or os.environ.get("RENDER") == "true"):
    STORAGES = {
        "default": {
            "BACKEND": "catalog.github_storage.GitHubMediaStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# Optional shared S3-compatible media storage (AWS S3 / Cloudflare R2).
# Configure identical bucket credentials on the web service and worker.
if os.environ.get("AWS_STORAGE_BUCKET_NAME"):
    INSTALLED_APPS.append("storages")
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "bucket_name": os.environ["AWS_STORAGE_BUCKET_NAME"],
                "access_key": os.environ.get("AWS_ACCESS_KEY_ID", ""),
                "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY", ""),
                "endpoint_url": os.environ.get("AWS_S3_ENDPOINT_URL") or None,
                "region_name": os.environ.get("AWS_S3_REGION_NAME", "us-east-1"),
                "default_acl": None,
                "querystring_auth": False,
                "file_overwrite": False,
            },
        },
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", DEFAULT_MEDIA_ROOT))
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Email notifications (console backend for local dev; swap EMAIL_BACKEND for
# SMTP/SES/SendGrid in production). Push notifications go through DeviceToken
# records in the notifications app (FCM/APNs sender to be wired up in prod).
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "no-reply@duka.co.ke")

# Social login (Registration & Login: Email, Phone, Google, Apple)
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
APPLE_OAUTH_CLIENT_ID = os.environ.get("APPLE_OAUTH_CLIENT_ID", "")

# Elasticsearch/OpenSearch (optional — SmartSearchView falls back to Django ORM
# search + difflib typo-correction when this is not configured).
ELASTICSEARCH_URL = os.environ.get("ELASTICSEARCH_URL", "")

# M-Pesa Daraja (Lipa Na M-Pesa Online / STK Push) — Till (Buy Goods) setup.
#   MPESA_SHORTCODE  : the Store/Head-Office number the Daraja app is registered
#                      against; used to build the STK password with the passkey.
#   MPESA_TILL_NUMBER: the Till number customers actually pay (PartyB). If your
#                      shortcode IS the till, leave this empty.
#   MPESA_CALLBACK_BASE_URL: public https URL of this backend (e.g. your domain or
#                      an ngrok URL while testing). Safaricom posts results to
#                      <base>/api/orders/mpesa/callback/<MPESA_CALLBACK_TOKEN>/
MPESA_ENV = os.environ.get("MPESA_ENV", "sandbox")  # "sandbox" or "production"
MPESA_BASE_URL = os.environ.get("MPESA_BASE_URL", "")  # leave empty; only for local mocks
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "")
MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "")
MPESA_TILL_NUMBER = os.environ.get("MPESA_TILL_NUMBER", "")
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "")
MPESA_TRANSACTION_TYPE = os.environ.get("MPESA_TRANSACTION_TYPE", "CustomerBuyGoodsOnline")
MPESA_CALLBACK_BASE_URL = os.environ.get("MPESA_CALLBACK_BASE_URL", "")
MPESA_CALLBACK_TOKEN = os.environ.get("MPESA_CALLBACK_TOKEN", "change-me-callback-token")
# Unpaid M-Pesa orders hold stock; the expire_unpaid_orders command releases them after this.
MPESA_ORDER_EXPIRY_MINUTES = int(os.environ.get("MPESA_ORDER_EXPIRY_MINUTES", "30"))


# ---------------------------------------------------------------------------
# Public storefront URL (used for payment return URLs and share links)
# ---------------------------------------------------------------------------
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
PUBLIC_BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL", "").rstrip("/")

# ---------------------------------------------------------------------------
# AI Virtual Try-On (Proposal item 1)
#   TRYON_PROVIDER = "gemini" (Google image model, needs GEMINI_API_KEY) or
#                    "mock"   (Pillow composite, for local dev - no key needed).
#   Defaults to gemini when a key is present, otherwise mock.
# Privacy: customers must consent per request; the uploaded photo is deleted as
# soon as the preview is generated (TRYON_KEEP_SOURCE=0) and unsaved previews
# are purged after TRYON_RETENTION_DAYS (run `manage.py purge_tryon` daily).
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
TRYON_PROVIDER = os.environ.get("TRYON_PROVIDER", "gemini" if GEMINI_API_KEY else "mock")
TRYON_GEMINI_MODEL = os.environ.get("TRYON_GEMINI_MODEL", "gemini-2.5-flash-image")
TRYON_RETENTION_DAYS = int(os.environ.get("TRYON_RETENTION_DAYS", "30"))
TRYON_KEEP_SOURCE = os.environ.get("TRYON_KEEP_SOURCE", "0") == "1"
TRYON_DAILY_LIMIT = int(os.environ.get("TRYON_DAILY_LIMIT", "10"))
TRYON_MAX_UPLOAD_MB = int(os.environ.get("TRYON_MAX_UPLOAD_MB", "8"))
# Pilot rollout: only products in these category slugs / flagged ids can be tried on.
# Empty = every product is eligible.
TRYON_PILOT_PRODUCT_IDS = [int(x) for x in os.environ.get("TRYON_PILOT_PRODUCT_IDS", "").split(",") if x.strip().isdigit()]

# ---------------------------------------------------------------------------
# Card payments (Proposal item 7): Stripe primary, Paystack backup (works fully in Kenya)
#   CARD_PROVIDERS  - comma list in priority order; a provider is only offered
#                     when its secret key is set.
# Webhooks to register in each dashboard:
#   Stripe   -> <backend>/api/orders/webhooks/stripe/
#   Paystack -> <backend>/api/orders/webhooks/paystack/
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_CURRENCY = os.environ.get("STRIPE_CURRENCY", "kes").lower()
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")
PAYSTACK_CURRENCY = os.environ.get("PAYSTACK_CURRENCY", "KES").upper()
CARD_PROVIDERS = [p.strip() for p in os.environ.get("CARD_PROVIDERS", "stripe,paystack").split(",") if p.strip()]

# ---------------------------------------------------------------------------
# Social / marketing (Proposal item 4) - exposed to the storefront via
# /api/integrations/public-config/. Leave blank to disable.
# ---------------------------------------------------------------------------
META_PIXEL_ID = os.environ.get("META_PIXEL_ID", "")
TIKTOK_PIXEL_ID = os.environ.get("TIKTOK_PIXEL_ID", "")
WHATSAPP_NUMBER = os.environ.get("WHATSAPP_NUMBER", "")  # international, digits only e.g. 254712345678
SOCIAL_INSTAGRAM_URL = os.environ.get("SOCIAL_INSTAGRAM_URL", "")
SOCIAL_FACEBOOK_URL = os.environ.get("SOCIAL_FACEBOOK_URL", "")
SOCIAL_TIKTOK_URL = os.environ.get("SOCIAL_TIKTOK_URL", "")
# Secret in the product-feed URL so Meta/TikTok can pull the catalogue without it being public-guessable.
FEED_TOKEN = os.environ.get("FEED_TOKEN", "")

# WhatsApp Business Cloud API - order updates (optional). Free-form text only
# reaches customers who messaged you in the last 24h; for proactive updates
# create an approved template and set WHATSAPP_TEMPLATE_NAME (body: 2 params
# = order number, status).
WHATSAPP_CLOUD_TOKEN = os.environ.get("WHATSAPP_CLOUD_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_TEMPLATE_NAME = os.environ.get("WHATSAPP_TEMPLATE_NAME", "")
WHATSAPP_TEMPLATE_LANG = os.environ.get("WHATSAPP_TEMPLATE_LANG", "en")

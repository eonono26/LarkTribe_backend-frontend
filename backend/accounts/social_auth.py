"""Google / Apple ID-token verification for 'Registration & Login (Google, Apple)'.

Uses google-auth when installed (recommended for production); falls back to an
unverified decode in DEBUG so the endpoint is exercisable without extra infra.
Apple's identity token is a standard JWT signed by Apple's keys — verifying it
properly requires fetching https://appleid.apple.com/auth/keys; that call is
stubbed out here behind `verify_apple_token` for the same reason.
"""
from django.conf import settings


class SocialAuthError(Exception):
    pass


def verify_google_token(id_token_str):
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        info = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), settings.GOOGLE_OAUTH_CLIENT_ID or None
        )
        return {"sub": info["sub"], "email": info.get("email"), "first_name": info.get("given_name", ""), "last_name": info.get("family_name", "")}
    except ImportError:
        if not settings.DEBUG:
            raise SocialAuthError("google-auth is not installed on the server.")
        import base64, json
        try:
            payload = id_token_str.split(".")[1]
            padded = payload + "=" * (-len(payload) % 4)
            info = json.loads(base64.urlsafe_b64decode(padded))
            return {"sub": info.get("sub", "dev-google-user"), "email": info.get("email"), "first_name": info.get("given_name", ""), "last_name": info.get("family_name", "")}
        except Exception as exc:
            raise SocialAuthError(f"Could not decode Google id_token (dev fallback): {exc}")
    except Exception as exc:
        raise SocialAuthError(f"Invalid Google id_token: {exc}")


def verify_apple_token(id_token_str):
    try:
        import jwt
        # Production: fetch Apple's JWKS from https://appleid.apple.com/auth/keys and
        # verify signature + audience == APPLE_OAUTH_CLIENT_ID. Decoding without
        # verification here is a documented placeholder for local/dev use only.
        info = jwt.decode(id_token_str, options={"verify_signature": False})
        if not settings.DEBUG:
            raise SocialAuthError("Apple token signature verification is not wired up yet.")
        return {"sub": info.get("sub", "dev-apple-user"), "email": info.get("email")}
    except ImportError:
        raise SocialAuthError("PyJWT is not installed on the server.")
    except SocialAuthError:
        raise
    except Exception as exc:
        raise SocialAuthError(f"Invalid Apple id_token: {exc}")


def verify_provider_token(provider, id_token_str):
    if provider == "google":
        return verify_google_token(id_token_str)
    if provider == "apple":
        return verify_apple_token(id_token_str)
    raise SocialAuthError("Unsupported provider")

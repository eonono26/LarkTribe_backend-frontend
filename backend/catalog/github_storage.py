"""Temporary GitHub-backed media storage for Render testing.

Set GITHUB_MEDIA_OWNER, GITHUB_MEDIA_REPO, GITHUB_MEDIA_BRANCH and
GITHUB_MEDIA_TOKEN in the backend environment. The token is never exposed to
clients; media is streamed through this backend.
"""
import mimetypes
import os
from urllib.parse import quote

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.http import FileResponse, Http404

API_ROOT = "https://api.github.com"
TIMEOUT = (10, 90)


class GitHubMediaStorage(Storage):
    def __init__(self):
        self.owner = os.environ.get("GITHUB_MEDIA_OWNER", "kojeffi").strip()
        self.repo = os.environ.get("GITHUB_MEDIA_REPO", "ml_dataset").strip()
        self.branch = os.environ.get("GITHUB_MEDIA_BRANCH", "main").strip()
        self.token = os.environ.get("GITHUB_MEDIA_TOKEN", "").strip()

    @property
    def configured(self):
        return bool(self.owner and self.repo and self.branch and self.token)

    def _headers(self, raw=False):
        if not self.token:
            raise RuntimeError("GITHUB_MEDIA_TOKEN is not configured on the backend.")
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if raw:
            headers["Accept"] = "application/vnd.github.raw+json"
        return headers

    def _api_url(self, name):
        safe_path = quote(name.lstrip("/"), safe="/")
        return f"{API_ROOT}/repos/{self.owner}/{self.repo}/contents/{safe_path}"

    def _open(self, name, mode="rb"):
        if mode not in ("rb", "r"):
            raise ValueError("GitHub media storage supports read-only open modes.")
        response = requests.get(
            self._api_url(name),
            headers=self._headers(raw=True),
            params={"ref": self.branch},
            timeout=TIMEOUT,
        )
        if response.status_code == 404:
            raise FileNotFoundError(name)
        response.raise_for_status()
        return ContentFile(response.content, name=name)

    def _save(self, name, content):
        import base64

        chunks = []
        for chunk in content.chunks():
            chunks.append(chunk)
        payload_bytes = b"".join(chunks)
        if not payload_bytes:
            raise ValueError("Cannot upload an empty media file to GitHub.")
        payload = {
            "message": f"Upload test media: {name}",
            "content": base64.b64encode(payload_bytes).decode("ascii"),
            "branch": self.branch,
        }
        response = requests.put(
            self._api_url(name),
            headers=self._headers(),
            json=payload,
            timeout=TIMEOUT,
        )
        if response.status_code not in (200, 201):
            detail = response.text[:500]
            raise RuntimeError(f"GitHub media upload failed ({response.status_code}): {detail}")
        return name

    def delete(self, name):
        response = requests.get(
            self._api_url(name),
            headers=self._headers(),
            params={"ref": self.branch},
            timeout=TIMEOUT,
        )
        if response.status_code == 404:
            return
        response.raise_for_status()
        sha = response.json().get("sha")
        if not sha:
            raise RuntimeError(f"GitHub did not return a blob SHA for {name}.")
        deleted = requests.delete(
            self._api_url(name),
            headers=self._headers(),
            json={"message": f"Delete test media: {name}", "sha": sha, "branch": self.branch},
            timeout=TIMEOUT,
        )
        deleted.raise_for_status()

    def exists(self, name):
        response = requests.get(
            self._api_url(name),
            headers=self._headers(),
            params={"ref": self.branch},
            timeout=TIMEOUT,
        )
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return True

    def url(self, name):
        return f"/api/catalog/github-media/{quote(name.lstrip('/'), safe='/')}"

    def size(self, name):
        response = requests.get(
            self._api_url(name),
            headers=self._headers(),
            params={"ref": self.branch},
            timeout=TIMEOUT,
        )
        if response.status_code == 404:
            raise FileNotFoundError(name)
        response.raise_for_status()
        return int(response.json().get("size", 0))


def github_media(request, path):
    """Public product-media delivery; the GitHub token stays server-side."""
    if not os.environ.get("GITHUB_MEDIA_TOKEN", "").strip():
        raise Http404
    storage = GitHubMediaStorage()
    try:
        file_obj = storage.open(path, "rb")
    except (FileNotFoundError, requests.RequestException, RuntimeError):
        raise Http404
    content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    response = FileResponse(file_obj, content_type=content_type)
    response["Cache-Control"] = "public, max-age=3600"
    response["X-Content-Type-Options"] = "nosniff"
    return response

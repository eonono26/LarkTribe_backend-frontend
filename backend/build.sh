#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate --no-input

# Create/update the deployment administrator only when credentials are configured.
if [[ -n "${DJANGO_ADMIN_PASSWORD:-}" ]]; then
  python manage.py create_deploy_admin
else
  echo "DJANGO_ADMIN_PASSWORD is not set; skipping deployment admin creation."
fi

python manage.py collectstatic --no-input

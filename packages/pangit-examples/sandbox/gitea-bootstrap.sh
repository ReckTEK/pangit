#!/bin/sh
set -eu

umask 077
rm -f /sandbox-auth/gitea-ready /sandbox-auth/gitea-token

until wget -qO- http://127.0.0.1:3000/api/v1/version >/dev/null; do
  sleep 1
done

gitea --config /data/gitea/conf/app.ini admin user create \
  --username "$GITEA_USERNAME" \
  --password "$GITEA_PASSWORD" \
  --email "$GITEA_EMAIL" \
  --admin \
  --must-change-password=false

gitea --config /data/gitea/conf/app.ini admin user generate-access-token \
  --username "$GITEA_USERNAME" \
  --token-name pangit-example \
  --scopes all \
  --raw > /sandbox-auth/gitea-token

touch /sandbox-auth/gitea-ready

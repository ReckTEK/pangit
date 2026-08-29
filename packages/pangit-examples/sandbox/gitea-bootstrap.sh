#!/bin/sh
set -eu

umask 077
rm -f /sandbox-auth/gitea-ready

until wget -qO- http://127.0.0.1:3000/api/v1/version >/dev/null; do
  sleep 1
done

if [ -s /sandbox-auth/gitea-token ] && [ -s /sandbox-auth/gitea-oauth-client-id ]; then
  persisted_token=$(cat /sandbox-auth/gitea-token)
  persisted_client_id=$(cat /sandbox-auth/gitea-oauth-client-id)
  if wget -qO- \
      --header="Authorization: token $persisted_token" \
      http://127.0.0.1:3000/api/v1/user | grep -q '"login":"sandbox"' && \
    wget -qO- \
      --header="Authorization: token $persisted_token" \
      http://127.0.0.1:3000/api/v1/user/applications/oauth2 | \
      grep -Fq "\"client_id\":\"$persisted_client_id\""; then
    touch /sandbox-auth/gitea-ready
    exit 0
  fi
fi

rm -f /sandbox-auth/gitea-oauth-client-id /sandbox-auth/gitea-token

if ! gitea --config /data/gitea/conf/app.ini admin user list 2>/dev/null | \
  awk -v wanted="$GITEA_USERNAME" 'NR > 1 && $2 == wanted { found=1 } END { exit !found }'; then
  gitea --config /data/gitea/conf/app.ini admin user create \
    --username "$GITEA_USERNAME" \
    --password "$GITEA_PASSWORD" \
    --email "$GITEA_EMAIL" \
    --admin \
    --must-change-password=false
fi

gitea_token=$(gitea --config /data/gitea/conf/app.ini admin user generate-access-token \
  --username "$GITEA_USERNAME" \
  --token-name "pangit-example-$(date +%s)-$$" \
  --scopes all \
  --raw)
printf '%s\n' "$gitea_token" > /sandbox-auth/gitea-token

oauth_application=$(wget -qO- \
  --header="Authorization: token $gitea_token" \
  --header="Content-Type: application/json" \
  --post-data='{"confidential_client":false,"name":"PanGit local OAuth example","redirect_uris":["http://127.0.0.1:5173/auth/callback?type=gitea","http://127.0.0.1/auth/callback?type=gitea"],"skip_secondary_authorization":true}' \
  http://127.0.0.1:3000/api/v1/user/applications/oauth2)
oauth_client_id=$(printf '%s' "$oauth_application" | tr -d '\n' | sed -n 's/.*"client_id":"\([^"]*\)".*/\1/p')
if [ -z "$oauth_client_id" ]; then
  echo "Gitea did not return an OAuth client ID" >&2
  exit 1
fi
printf '%s\n' "$oauth_client_id" > /sandbox-auth/gitea-oauth-client-id

touch /sandbox-auth/gitea-ready

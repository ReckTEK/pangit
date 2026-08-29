#!/bin/sh
set -eu

PANGIT_GITEA_CLIENT_ID=$(cat /sandbox-auth/gitea-oauth-client-id)
if [ -z "$PANGIT_GITEA_CLIENT_ID" ]; then
  echo "Gitea OAuth client ID is missing" >&2
  exit 1
fi

export PANGIT_GITEA_CLIENT_ID
exec deno task dev

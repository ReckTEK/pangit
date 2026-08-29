#!/bin/sh
set -eu

umask 077
rm -f /sandbox-auth/gitlab-ready /sandbox-auth/gitlab-token

until gitlab-rails runner \
  'abort "root user is not ready" unless User.find_by_username("root")' \
  >/dev/null 2>&1; do
  sleep 3
done

gitlab-rails runner '
  user = User.find_by_username!(ENV.fetch("GITLAB_USERNAME"))
  token = user.personal_access_tokens.create(
    scopes: ["api"],
    name: "pangit-example",
    expires_at: Date.current + 365
  )
  token.set_token(ENV.fetch("GITLAB_TOKEN"))
  token.save!
'

printf '%s\n' "$GITLAB_TOKEN" > /sandbox-auth/gitlab-token
touch /sandbox-auth/gitlab-ready

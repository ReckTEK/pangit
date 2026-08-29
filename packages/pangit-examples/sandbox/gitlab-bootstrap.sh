#!/bin/sh
set -eu

umask 077
rm -f /sandbox-auth/gitlab-ready

token_is_valid() {
  curl --fail --silent --header="PRIVATE-TOKEN: $GITLAB_TOKEN" \
    http://127.0.0.1/api/v4/user | grep -q '"username":"root"'
}

until token_is_valid || curl --fail --silent http://127.0.0.1/-/readiness >/dev/null; do
  sleep 3
done

if ! token_is_valid; then
  gitlab-rails runner '
    user = User.find_by_username!(ENV.fetch("GITLAB_USERNAME"))
    user.personal_access_tokens.where(name: "pangit-example").delete_all
    token = user.personal_access_tokens.create(
      scopes: ["api"],
      name: "pangit-example",
      expires_at: Date.current + 365
    )
    token.set_token(ENV.fetch("GITLAB_TOKEN"))
    token.save!
  '
fi

printf '%s\n' "$GITLAB_TOKEN" > /sandbox-auth/gitlab-token
touch /sandbox-auth/gitlab-ready

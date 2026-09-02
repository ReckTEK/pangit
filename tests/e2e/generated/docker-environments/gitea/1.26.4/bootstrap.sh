#!/bin/sh
set -eu
umask 077
rm -f /sandbox-auth/ready /sandbox-auth/id_ed25519 /sandbox-auth/id_ed25519.pub /sandbox-auth/admin_key /sandbox-auth/admin_key.pub /sandbox-auth/deploy_key /sandbox-auth/deploy_key.pub
until wget -qO- "$E2E_LOCAL_API/version" >/dev/null; do sleep 1; done
gitea --config /data/gitea/conf/app.ini admin user create --username "$E2E_USERNAME" --password "$E2E_PASSWORD" --email "$E2E_EMAIL" --admin --must-change-password=false
gitea --config /data/gitea/conf/app.ini admin user generate-access-token --username "$E2E_USERNAME" --token-name e2e --scopes all --raw > /sandbox-auth/api-token
ssh-keygen -q -t ed25519 -N '' -C e2e -f /sandbox-auth/id_ed25519
ssh-keygen -q -t ed25519 -N '' -C e2e-admin -f /sandbox-auth/admin_key
ssh-keygen -q -t ed25519 -N '' -C e2e-deploy -f /sandbox-auth/deploy_key
# Gitea strips leading zeroes from verification key IDs. Generate an unambiguous fixture key.
while :; do
  gpg --batch --pinentry-mode loopback --passphrase '' --quick-gen-key "$E2E_USERNAME <$E2E_EMAIL>" rsa2048 sign 0
  e2e_key_id="$(gpg --with-colons --list-keys "$E2E_EMAIL" | awk -F: '$1 == "pub" { print $5; exit }')"
  case "$e2e_key_id" in
    0*)
      e2e_fingerprint="$(gpg --with-colons --list-keys "$E2E_EMAIL" | awk -F: '$1 == "fpr" { print $10; exit }')"
      gpg --batch --yes --delete-secret-and-public-key "$e2e_fingerprint"
      ;;
    *) break ;;
  esac
done
gpg --armor --export "$E2E_EMAIL" > /sandbox-auth/gpg-public.asc
sqlite3 /data/gitea/gitea.db "INSERT INTO badge (slug, description, image_url) VALUES ('e2e', 'E2E fixture', 'http://gitea:3000/assets/img/logo.svg');"
curl --fail --silent --show-error -X PUT -H "Authorization: token $(cat /sandbox-auth/api-token)" --upload-file /sandbox-auth/id_ed25519.pub http://127.0.0.1:3000/api/packages/$E2E_USERNAME/generic/e2e-package/1.0.0/fixture.txt >/dev/null
curl --fail --silent --show-error -X PUT -H "Authorization: token $(cat /sandbox-auth/api-token)" --upload-file /sandbox-auth/id_ed25519.pub http://127.0.0.1:3000/api/packages/$E2E_USERNAME/generic/e2e-package/2.0.0/fixture.txt >/dev/null
curl --fail --silent --show-error -H "Authorization: token $(cat /sandbox-auth/api-token)" "$E2E_LOCAL_API/user/gpg_key_token" | gpg --batch --pinentry-mode loopback --passphrase '' --armor --detach-sign > /sandbox-auth/gpg-signature.asc
gitea --config /data/gitea/conf/app.ini actions generate-runner-token > /sandbox-auth/runner-token
mkdir -p /data/git/repositories/$E2E_USERNAME
git init --bare /data/git/repositories/$E2E_USERNAME/e2e-adopt.git
git init --bare /data/git/repositories/$E2E_USERNAME/e2e-unadopted.git
git config --global user.signingkey "$E2E_EMAIL"
git config --global user.name "$E2E_USERNAME"
git config --global user.email "$E2E_EMAIL"
git config --global commit.gpgsign true
touch /sandbox-auth/ready

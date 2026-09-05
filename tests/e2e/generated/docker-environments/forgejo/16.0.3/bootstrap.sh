#!/bin/sh
set -eu
umask 077
rm -f /sandbox-auth/ready /sandbox-auth/id_ed25519 /sandbox-auth/id_ed25519.pub /sandbox-auth/admin_key /sandbox-auth/admin_key.pub /sandbox-auth/deploy_key /sandbox-auth/deploy_key.pub
until wget -qO- "$E2E_LOCAL_API/version" >/dev/null; do sleep 1; done
forgejo --config /data/gitea/conf/app.ini admin user create --username "$E2E_USERNAME" --password "$E2E_PASSWORD" --email "$E2E_EMAIL" --admin --must-change-password=false
forgejo --config /data/gitea/conf/app.ini admin user generate-access-token --username "$E2E_USERNAME" --token-name e2e --scopes all --raw > /sandbox-auth/api-token
ssh-keygen -q -t ed25519 -N '' -C e2e -f /sandbox-auth/id_ed25519
ssh-keygen -q -t ed25519 -N '' -C e2e-admin -f /sandbox-auth/admin_key
ssh-keygen -q -t ed25519 -N '' -C e2e-deploy -f /sandbox-auth/deploy_key
# Forgejo strips leading zeroes from verification key IDs. Generate an unambiguous fixture key.
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
curl --fail --silent --show-error -X PUT -H "Authorization: token $(cat /sandbox-auth/api-token)" --upload-file /sandbox-auth/id_ed25519.pub http://127.0.0.1:3000/api/packages/$E2E_USERNAME/generic/e2e-package/1.0.0/fixture.txt >/dev/null
curl --fail --silent --show-error -X PUT -H "Authorization: token $(cat /sandbox-auth/api-token)" --upload-file /sandbox-auth/id_ed25519.pub http://127.0.0.1:3000/api/packages/$E2E_USERNAME/generic/e2e-package/2.0.0/fixture.txt >/dev/null
# Build one real Git tree containing a symlink and a gitlink. These object kinds cannot be created
# through Forgejo's file-content REST mutations, so the environment owns this static read fixture.
curl --fail --silent --show-error -X POST \
  -H "Authorization: token $(cat /sandbox-auth/api-token)" \
  -H "Content-Type: application/json" \
  --data '{"name":"e2e-links","auto_init":false,"default_branch":"main"}' \
  "$E2E_LOCAL_API/user/repos" >/dev/null
curl --fail --silent --show-error -X POST \
  -H "Authorization: token $(cat /sandbox-auth/api-token)" \
  -H "Content-Type: application/json" \
  --data '{"name":"e2e-submodule","auto_init":false,"default_branch":"main"}' \
  "$E2E_LOCAL_API/user/repos" >/dev/null
links_work="$(mktemp -d)"
submodule_work="$(mktemp -d)"
git init -q "$submodule_work"
git -C "$submodule_work" checkout -q -b main
echo submodule-fixture > "$submodule_work/README.md"
git -C "$submodule_work" add README.md
git -C "$submodule_work" -c user.name="$E2E_USERNAME" -c user.email="$E2E_EMAIL" -c commit.gpgsign=false commit -q -m 'submodule fixture'
submodule_sha="$(git -C "$submodule_work" rev-parse HEAD)"
git -C "$submodule_work" remote add origin "http://$E2E_USERNAME:$(cat /sandbox-auth/api-token)@127.0.0.1:3000/$E2E_USERNAME/e2e-submodule.git"
git -C "$submodule_work" push -q -u origin main
git init -q "$links_work"
git -C "$links_work" checkout -q -b main
echo symlink-target > "$links_work/target.txt"
ln -s target.txt "$links_work/link.txt"
cat > "$links_work/.gitmodules" <<EOF
[submodule "vendor/internal"]
	path = vendor/internal
	url = http://forgejo:3000/$E2E_USERNAME/e2e-submodule.git
[submodule "vendor/external"]
	path = vendor/external
	url = https://example.invalid/external.git
EOF
git -C "$links_work" add target.txt link.txt .gitmodules
git -C "$links_work" update-index --add --cacheinfo "160000,$submodule_sha,vendor/external"
git -C "$links_work" update-index --add --cacheinfo "160000,$submodule_sha,vendor/internal"
git -C "$links_work" -c user.name="$E2E_USERNAME" -c user.email="$E2E_EMAIL" -c commit.gpgsign=false commit -q -m 'symlink and submodule fixture'
git -C "$links_work" remote add origin "http://$E2E_USERNAME:$(cat /sandbox-auth/api-token)@127.0.0.1:3000/$E2E_USERNAME/e2e-links.git"
git -C "$links_work" push -q -u origin main
curl --fail --silent --show-error -H "Authorization: token $(cat /sandbox-auth/api-token)" "$E2E_LOCAL_API/user/gpg_key_token" | gpg --batch --pinentry-mode loopback --passphrase '' --armor --detach-sign > /sandbox-auth/gpg-signature.asc
forgejo --config /data/gitea/conf/app.ini actions generate-runner-token > /sandbox-auth/runner-token
mkdir -p /data/git/repositories/$E2E_USERNAME
git init --bare /data/git/repositories/$E2E_USERNAME/e2e-adopt.git
git init --bare /data/git/repositories/$E2E_USERNAME/e2e-unadopted.git
git config --global user.signingkey "$E2E_EMAIL"
git config --global user.name "$E2E_USERNAME"
git config --global user.email "$E2E_EMAIL"
git config --global commit.gpgsign true
touch /sandbox-auth/ready

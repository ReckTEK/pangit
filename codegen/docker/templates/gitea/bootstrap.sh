#!/bin/sh
# Generated Gitea __VERSION__ sandbox bootstrap. Do not edit.
set -eu

config=/data/gitea/conf/app.ini
results=/results
username=sandbox
password=gitea-sandbox-password

umask 077
rm -f "$results/api-token" "$results/id_ed25519" "$results/id_ed25519.pub" "$results/ready"

until wget -qO- http://127.0.0.1:3000/api/v1/version >/dev/null; do
  sleep 1
done

gitea --config "$config" admin user create \
  --username "$username" \
  --password "$password" \
  --email sandbox@example.invalid \
  --admin \
  --must-change-password=false

token="$(gitea --config "$config" admin user generate-access-token \
  --username "$username" \
  --token-name "sandbox-$(date +%s)" \
  --scopes all \
  --raw)"
printf '%s\n' "$token" > "$results/api-token"
printf '%s\n' "$password" > "$results/password"

ssh-keygen -q -t ed25519 -N '' -C 'gitea-sandbox-__VERSION__' -f "$results/id_ed25519"
public_key="$(cat "$results/id_ed25519.pub")"
wget -qO "$results/ssh-key.json" \
  --header="Authorization: token $token" \
  --header='Content-Type: application/json' \
  --post-data="{\"title\":\"sandbox-__VERSION__\",\"key\":\"$public_key\"}" \
  http://127.0.0.1:3000/api/v1/user/keys

cat > "$results/environment.json" <<'EOF'
{
  "provider": "gitea",
  "version": "__VERSION__",
  "httpUrl": "http://gitea:3000",
  "sshHost": "gitea",
  "sshPort": 22,
  "sshUser": "git",
  "username": "sandbox"
}
EOF

touch "$results/ready"

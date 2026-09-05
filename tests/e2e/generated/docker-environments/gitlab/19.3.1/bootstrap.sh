#!/bin/sh
# Disposable GitLab Free (EE) bootstrap. Tokens are generated at runtime and never printed.
set -eu
# Compose hides post-start hook output; retain diagnostics in the provider log.
exec >/proc/1/fd/1 2>&1
umask 077
rm -f /sandbox-auth/ready /sandbox-auth/api-token
attempt=0
until curl --fail --silent http://127.0.0.1/-/readiness >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 420 ]; then echo 'GitLab did not become ready within 14 minutes' >&2; exit 1; fi
  sleep 2
done
cat > /tmp/pangit-bootstrap.rb <<'RUBY'
user = User.find_by_username!('root')
user.email = ENV.fetch('E2E_EMAIL')
user.skip_reconfirmation!
user.save!
token = user.personal_access_tokens.create!(name: 'pangit-disposable-e2e', scopes: %w[api read_user read_repository write_repository sudo], expires_at: 7.days.from_now)
File.write('/tmp/pangit-api-token', token.token, perm: 0600)
ApplicationSetting.current.update!(allow_local_requests_from_web_hooks_and_services: true, allow_local_requests_from_system_hooks: true, signup_enabled: false, default_branch_name: 'main', default_branch_protection: 0)
RUBY
chmod 644 /tmp/pangit-bootstrap.rb
gitlab-rails runner /tmp/pangit-bootstrap.rb
install -m 600 -o 1000 -g 1000 /tmp/pangit-api-token /sandbox-auth/api-token
rm -f /tmp/pangit-api-token
rm -f /tmp/pangit-bootstrap.rb
chown -R 1000:1000 /sandbox-auth
chmod 700 /sandbox-auth
chmod 600 /sandbox-auth/api-token
# Register a real, isolated shell executor. No Docker socket or host repository is mounted.
mkdir -p /sandbox-auth/runner
curl --fail --silent --show-error -X POST -H "PRIVATE-TOKEN: $(cat /sandbox-auth/api-token)" \
  --data 'runner_type=instance_type&description=pangit-e2e&tag_list=pangit-e2e&run_untagged=false' \
  "$E2E_LOCAL_API/user/runners" > /tmp/pangit-runner.json
/opt/gitlab/embedded/bin/ruby -rjson -e 'print JSON.parse(File.read(ARGV[0])).fetch("token")' /tmp/pangit-runner.json > /sandbox-auth/runner/token
rm -f /tmp/pangit-runner.json
chmod 600 /sandbox-auth/runner/token
chown -R 1000:1000 /sandbox-auth/runner
# Static Git objects: real symlinks and gitlinks, which the Files API cannot create.
export PATH="/opt/gitlab/embedded/bin:$PATH"
for project in e2e-links e2e-submodule; do
  curl --fail --silent --show-error -X POST -H "PRIVATE-TOKEN: $(cat /sandbox-auth/api-token)" \
    --data "name=$project&path=$project&visibility=private&default_branch=main" "$E2E_LOCAL_API/projects" >/dev/null
done
work=$(mktemp -d)
sub=$(mktemp -d)
git init -q -b main "$sub"
echo submodule-fixture > "$sub/README.md"
git -C "$sub" add README.md
git -C "$sub" -c user.name=root -c user.email=root@example.invalid commit -q -m 'submodule fixture'
sub_sha=$(git -C "$sub" rev-parse HEAD)
auth=$(printf 'oauth2:%s' "$(cat /sandbox-auth/api-token)" | base64 | tr -d '\n')
git -C "$sub" -c "http.extraHeader=Authorization: Basic $auth" push -q http://127.0.0.1/root/e2e-submodule.git main
git init -q -b main "$work"
echo symlink-target > "$work/target.txt"
ln -s target.txt "$work/link.txt"
ln -s ../../outside "$work/escape.txt"
cat > "$work/.gitmodules" <<EOF
[submodule "vendor/internal"]
  path = vendor/internal
  url = http://gitlab/root/e2e-submodule.git
[submodule "vendor/external"]
  path = vendor/external
  url = https://example.invalid/external.git
EOF
git -C "$work" add .
git -C "$work" update-index --add --cacheinfo "160000,$sub_sha,vendor/internal"
git -C "$work" update-index --add --cacheinfo "160000,$sub_sha,vendor/external"
git -C "$work" -c user.name=root -c user.email=root@example.invalid commit -q -m 'link fixtures'
git -C "$work" -c "http.extraHeader=Authorization: Basic $auth" push -q http://127.0.0.1/root/e2e-links.git main
rm -rf "$work" "$sub"

touch /sandbox-auth/ready
chown 1000:1000 /sandbox-auth/ready

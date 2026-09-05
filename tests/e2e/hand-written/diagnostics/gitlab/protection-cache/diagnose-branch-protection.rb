#!/usr/bin/env ruby
# Run with the bundled Ruby inside the disposable GitLab container. No PanGit code is used.
# Emits JSON lines without credentials; leaves server fixtures available for inspection.
require 'json'
require 'net/http'
require 'open3'
require 'securerandom'
require 'tmpdir'
require 'time'
require 'date'

$stdout.sync = true
ROOT_TOKEN = File.read('/sandbox-auth/api-token').strip
API = 'http://127.0.0.1/api/v4'

def emit(event, fields = {})
  puts JSON.generate({ event: event, at: Time.now.utc.iso8601(6) }.merge(fields))
end

def request(method, path, body = nil, token: ROOT_TOKEN, expected: nil)
  uri = URI(API + path)
  req = Net::HTTP.const_get(method.capitalize).new(uri)
  req['PRIVATE-TOKEN'] = token
  if body
    req['Content-Type'] = 'application/json'
    req.body = JSON.generate(body)
  end
  response = Net::HTTP.start(uri.host, uri.port, open_timeout: 10, read_timeout: 30) { |http| http.request(req) }
  code = response.code.to_i
  unless expected ? Array(expected).include?(code) : (200...300).cover?(code)
    raise "#{method} #{path}: HTTP #{code}: #{response.body}"
  end
  value = response.body.to_s.empty? ? nil : JSON.parse(response.body)
  [value, response['x-request-id'], code]
end

def snapshot(project_id, branch, phase, developer_token = ROOT_TOKEN)
  rules, = request('get', "/projects/#{project_id}/protected_branches")
  state, request_id = request('get', "/projects/#{project_id}/repository/branches/#{branch}")
  developer, = request('get', "/projects/#{project_id}/repository/branches/#{branch}", token: developer_token)
  emit('snapshot', project_id: project_id, branch: branch, phase: phase,
    configured: rules.map { |rule| rule.fetch('name') }, protected: state['protected'],
    root_can_push: state['can_push'], second_reader_can_push: developer['can_push'],
    second_reader: developer_token == ROOT_TOKEN ? 'root' : 'developer', request_id: request_id)
  state
end

if ENV['PROBE_MODE'] == 'fresh'
  Integer(ENV.fetch('PROBE_CYCLES', '25')).times do |index|
    project, = request('post', '/projects', { name: "fresh-protection-#{SecureRandom.hex(6)}",
      initialize_with_readme: true, default_branch: 'main', visibility: 'private' })
    project_id = project.fetch('id')
    branch = 'rule-target'
    emit('fixture', project_id: project_id, cycle: index, path: project.fetch('path_with_namespace'))
    request('post', "/projects/#{project_id}/repository/branches", { branch: branch, ref: 'main' })
    request('post', "/projects/#{project_id}/protected_branches",
      { name: branch, push_access_level: 0, allow_force_push: false })
    protected_state = snapshot(project_id, branch, 'protected')
    request('patch', "/projects/#{project_id}/protected_branches/#{branch}", { allow_force_push: true })
    request('delete', "/projects/#{project_id}/protected_branches/#{branch}", expected: 204)
    deleted_state = snapshot(project_id, branch, 'deleted')
    if !protected_state['protected'] || deleted_state['protected']
      emit('mismatch', project_id: project_id, branch: branch)
      exit 1
    end
  end
  emit('completed')
  exit 0
end

suffix = "#{Time.now.to_i}-#{SecureRandom.hex(3)}"
user, = request('post', '/users', { username: "probe-#{suffix}", name: 'Protection probe',
  email: "probe-#{suffix}@example.invalid", password: SecureRandom.base64(32), skip_confirmation: true })
credential, = request('post', "/users/#{user.fetch('id')}/personal_access_tokens",
  { name: 'disposable-protection-probe', scopes: %w[api read_repository write_repository],
    expires_at: (Date.today + 1).iso8601 })
developer_token = credential.fetch('token')
project, = if ENV['PROBE_PROJECT']
  request('get', "/projects/#{Integer(ENV.fetch('PROBE_PROJECT'))}")
else
  request('post', '/projects', { name: "protection-probe-#{suffix}",
    initialize_with_readme: true, default_branch: 'main', visibility: 'private' })
end
project_id = project.fetch('id')
request('post', "/projects/#{project_id}/members", { user_id: user.fetch('id'), access_level: 30 })
emit('fixture', project_id: project_id, user_id: user.fetch('id'), path: project.fetch('path_with_namespace'))
# Membership creation queues a project-authorization refresh. Verify fixture access
# before testing protection; this does not retry or mask any protection result.
authorized = false
100.times do |attempt|
  _, _, status = request('get', "/projects/#{project_id}", token: developer_token, expected: [200, 404])
  if status == 200
    emit('developer_access_ready', attempts: attempt + 1)
    authorized = true
    break
  end
  sleep 0.1
end
raise 'Developer project authorization did not become available' unless authorized

git_env = {
  'GIT_CONFIG_COUNT' => '1', 'GIT_CONFIG_KEY_0' => 'http.extraHeader',
  'GIT_CONFIG_VALUE_0' => 'Authorization: Basic ' + ["oauth2:#{developer_token}"].pack('m0'),
  'GIT_TERMINAL_PROMPT' => '0', 'GIT_AUTHOR_NAME' => 'Protection probe',
  'GIT_AUTHOR_EMAIL' => 'probe@example.invalid', 'GIT_COMMITTER_NAME' => 'Protection probe',
  'GIT_COMMITTER_EMAIL' => 'probe@example.invalid'
}
git = '/opt/gitlab/embedded/bin/git'
Dir.mktmpdir('pangit-protection-probe-') do |directory|
  run_git = lambda do |*args|
    output, status = Open3.capture2e(git_env, git, '-C', directory, *args)
    [status.success?, output]
  end
  ok, output = run_git.call('clone', '--quiet', "http://127.0.0.1/#{project.fetch('path_with_namespace')}.git", '.')
  raise output unless ok
  push_probe = lambda do |branch, phase|
    ok, output = run_git.call('checkout', '--quiet', '-B', branch, 'origin/main')
    raise output unless ok
    ok, output = run_git.call('commit', '--quiet', '--allow-empty', '-m', "probe #{phase} #{SecureRandom.hex(4)}")
    raise output unless ok
    ok, output = run_git.call('push', '--porcelain', 'origin', "HEAD:refs/heads/#{branch}")
    emit('push', branch: branch, phase: phase, accepted: ok, output: output)
    ok
  end

  if ENV['PROBE_BRANCH']
    branch = ENV.fetch('PROBE_BRANCH')
    snapshot(project_id, branch, 'existing', developer_token)
    accepted = push_probe.call(branch, 'existing')
    exit(accepted ? 0 : 1)
  end

  Integer(ENV.fetch('PROBE_CYCLES', '25')).times do |index|
    branch = "probe-#{index}"
    request('post', "/projects/#{project_id}/repository/branches", { branch: branch, ref: 'main' })
    snapshot(project_id, branch, 'unprotected', developer_token)
    request('post', "/projects/#{project_id}/protected_branches",
      { name: branch, push_access_level: 0, allow_force_push: false })
    protected_state = snapshot(project_id, branch, 'protected', developer_token)
    request('patch', "/projects/#{project_id}/protected_branches/#{branch}", { allow_force_push: true })
    updated_state = snapshot(project_id, branch, 'updated', developer_token)
    # The first cycle verifies actual enforcement, not just API metadata.
    if index.zero? || !protected_state['protected'] || !updated_state['protected']
      raise 'GitLab accepted a push to the protected branch' if push_probe.call(branch, 'protected')
    end
    request('delete', "/projects/#{project_id}/protected_branches/#{branch}", expected: 204)
    deleted_state = snapshot(project_id, branch, 'deleted', developer_token)
    if index.zero? || deleted_state['protected']
      raise 'GitLab rejected a push after protection was deleted' unless push_probe.call(branch, 'deleted')
    end
    if !protected_state['protected'] || !updated_state['protected'] || deleted_state['protected']
      emit('mismatch', project_id: project_id, branch: branch)
      exit 1
    end
  end
end
emit('completed')

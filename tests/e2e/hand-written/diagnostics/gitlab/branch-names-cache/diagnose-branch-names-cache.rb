# Run with gitlab-rails runner inside a disposable GitLab instance.
# Forces an old cache reader to complete after branch creation invalidates Redis.
require 'json'
require 'net/http'
require 'securerandom'
$stdout.sync = true
PROBE_TOKEN = User.find_by_username!('root').personal_access_tokens.create!(
  name: 'disposable-branch-cache-probe', scopes: %w[api], expires_at: 1.day.from_now
)

def api(method, path, body = nil)
  uri = URI('http://127.0.0.1/api/v4' + path)
  request = Net::HTTP.const_get(method.capitalize).new(uri)
  request['PRIVATE-TOKEN'] = PROBE_TOKEN.token
  if body
    request['Content-Type'] = 'application/json'
    request.body = JSON.generate(body)
  end
  response = Net::HTTP.start(uri.host, uri.port, read_timeout: 30) { |http| http.request(request) }
  [response.code.to_i, JSON.parse(response.body)]
end

status, project = api('post', '/projects', {
  name: "branch-cache-probe-#{SecureRandom.hex(6)}", initialize_with_readme: true,
  default_branch: 'main', visibility: 'private'
})
raise "Project creation failed: #{status}" unless status == 201
id = project.fetch('id')
branch = 'feature'
reader = Project.find(id).repository
cache = reader.send(:redis_set_cache)
cache.expire(:branch_names)
created = nil
cache.fetch(:branch_names) do
  # An in-flight reader took its snapshot before the writer changed the repository.
  earlier_names = reader.raw_repository.branch_names
  created, = api('post', "/projects/#{id}/repository/branches", { branch: branch, ref: 'main' })
  raise "Branch creation failed: #{created}" unless created == 201
  earlier_names
end
fresh_project = Project.find(id)
repository = fresh_project.repository
cached_exists = repository.branch_exists?(branch)
raw_exists = !repository.raw_repository.find_branch(branch).nil?
result = Files::MultiService.new(fresh_project, User.find_by_username!('root'), {
  branch_name: branch, start_branch: branch, commit_message: 'Branch cache probe',
  actions: [{ action: 'create', file_path: 'probe.txt', content: 'probe' }]
}).execute
puts JSON.pretty_generate({
  gitlab_version: File.read(Rails.root.join('VERSION')).strip, gitlab_revision: File.read(Rails.root.join('REVISION')).strip,
  project_id: id, branch: branch, branch_creation_status: created,
  ref_existence_check_gitaly: Feature.enabled?(:ref_existence_check_gitaly, fresh_project),
  raw_branch_exists: raw_exists, cached_branch_exists: cached_exists,
  commit_status: result[:status], commit_message: result[:message]
})
raise 'Stale branch-name cache rejected a commit to an existing branch' if raw_exists && !cached_exists && result[:status] == :error

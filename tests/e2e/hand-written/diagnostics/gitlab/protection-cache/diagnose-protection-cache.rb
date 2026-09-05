# Run with gitlab-rails runner inside the disposable instance, after the HTTP probe.
# Uses real GitLab services, database records and Redis. Does not modify GitLab code.
require 'json'
$stdout.sync = true
project_id = Integer(ENV.fetch('PROBE_PROJECT'))
branch = ENV.fetch('PROBE_BRANCH', 'rule-target')
user = User.find_by_username!('root')
project = Project.find(project_id)
raise 'Choose an existing, currently unprotected diagnostic branch' if project.protected_branches.find_by(name: branch)

created = ProtectedBranches::CreateService.new(project, user, {
  name: branch,
  push_access_levels_attributes: [{ access_level: 0 }],
  merge_access_levels_attributes: [{ access_level: 40 }]
}).execute
raise created.errors.full_messages.join(', ') unless created.persisted?

# A request/background job has already loaded protection settings when another
# request deletes the rule. Preserve that first request's real ActiveRecord object.
earlier_reader = Project.find(project_id)
earlier_reader.all_protected_branches.load
writer = Project.find(project_id)
ProtectedBranches::DestroyService.new(writer, user).execute(writer.protected_branches.find_by!(name: branch))

fresh_reader = Project.find(project_id)
database_protected = ProtectedBranch.matching(branch, protected_refs: fresh_reader.all_protected_branches).present?
key = ProtectedBranches::CacheService.new(fresh_reader).send(:redis_key)
field = OpenSSL::Digest::SHA256.hexdigest(branch)
before = Gitlab::Redis::Cache.with { |redis| redis.hget(key, field) }
earlier_result = ProtectedBranch.protected?(earlier_reader, branch)
fresh_result = ProtectedBranch.protected?(Project.find(project_id), branch)
results = [{
  scenario: 'earlier_loaded_association',
  project_id: project_id, branch: branch, database_protected: database_protected,
  cache_after_deletion: before, earlier_reader_result: earlier_result,
  fresh_reader_result: fresh_result,
  earlier_reader_rules: earlier_reader.all_protected_branches.map(&:name),
  current_rules: fresh_reader.all_protected_branches.map(&:name)
}]

# Also force invalidation between calculating a result and writing that result.
# This schedule is deterministic; neither sleeps nor background-job timing is needed.
[true, false].each do |initial_protected|
  current = Project.find(project_id)
  create_rule = lambda do
    value = ProtectedBranches::CreateService.new(Project.find(project_id), user, {
      name: branch, push_access_levels_attributes: [{ access_level: 0 }],
      merge_access_levels_attributes: [{ access_level: 40 }]
    }).execute
    raise value.errors.full_messages.join(', ') unless value.persisted?
  end
  destroy_rule = lambda do
    writer = Project.find(project_id)
    ProtectedBranches::DestroyService.new(writer, user).execute(writer.protected_branches.find_by!(name: branch))
  end
  create_rule.call if initial_protected
  cache = ProtectedBranches::CacheService.new(current)
  cache.refresh
  earlier_result = cache.fetch(branch) do
    calculated = ProtectedBranch.matching(branch, protected_refs: Project.find(project_id).all_protected_branches).present?
    raise 'Incorrect initial fixture state' unless calculated == initial_protected
    initial_protected ? destroy_rule.call : create_rule.call
    calculated
  end
  fresh_result = ProtectedBranch.protected?(Project.find(project_id), branch)
  results << { scenario: initial_protected ? 'delete_during_cache_calculation' : 'create_during_cache_calculation',
    database_protected: !initial_protected, earlier_reader_result: earlier_result, fresh_reader_result: fresh_result }
  destroy_rule.call unless initial_protected
end
results.each { |result| puts JSON.generate(result) }
raise 'Earlier readers corrupted the shared permission cache' if results.any? { |result| result[:fresh_reader_result] != result[:database_protected] }

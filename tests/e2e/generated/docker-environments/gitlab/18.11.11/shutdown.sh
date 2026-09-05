#!/bin/sh
# Stop request handlers and workers while their database, Redis, and Gitaly remain available.
# The image's default alphabetical stop order shuts those dependencies down first.
set -eu
exec >/proc/1/fd/1 2>&1
for service in nginx gitlab-workhorse sidekiq puma gitlab-kas; do
  gitlab-ctl stop "$service"
done
# PID 1 then receives SIGTERM and stops the remaining bundled services normally.

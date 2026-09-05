FROM data.forgejo.org/forgejo/runner:13.1.0@sha256:c4af85fd9f0dd03788676a534781a87c71aa2c6a37737143e017eb94d4312952
USER root
RUN apk add --no-cache bash curl jq zip
USER 1000:1000

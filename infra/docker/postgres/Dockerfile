FROM apache/age:release_PG17_1.7.0

ARG PGVECTOR_VERSION=0.8.7

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        git \
        postgresql-server-dev-17 \
    && git clone --depth 1 --branch v${PGVECTOR_VERSION} https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make OPTFLAGS="" \
    && make install \
    && rm -rf /tmp/pgvector \
    && apt-get purge -y --auto-remove build-essential git postgresql-server-dev-17 \
    && rm -rf /var/lib/apt/lists/*

LABEL org.opencontainers.image.title="vibeDB PostgreSQL"
LABEL org.opencontainers.image.description="PostgreSQL 17.11 + Apache AGE 1.7.0 + pgvector 0.8.7"

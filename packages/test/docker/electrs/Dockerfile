# docker/electrs/Dockerfile

########################################
# Stage 1: Build electrs from source
########################################
FROM rust:1.72 AS builder

# Install dependencies for building + bindgen (libclang)
RUN --mount=type=cache,target=/var/cache/apt \
  --mount=type=cache,target=/var/lib/apt \
  apt-get update && \
  apt-get install -y --no-install-recommends \
  pkg-config \
  libssl-dev \
  ca-certificates \
  git \
  clang \
  libclang-dev && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/electrs

# Allow overriding the version at build time
ARG ELECTRS_VERSION=0.10.9

# Clone only the tagged release
RUN git clone --depth 1 --branch v${ELECTRS_VERSION} \
  https://github.com/romanz/electrs.git .

# Build in release mode
RUN --mount=type=cache,target=/usr/local/cargo/registry \
  --mount=type=cache,target=/usr/src/electrs/target \
  --mount=type=tmpfs,target=/tmp/build-output \
  CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-4} \
  RUSTFLAGS="${RUSTFLAGS:--C target-cpu=native}" \
  cargo build --release && \
  cp /usr/src/electrs/target/release/electrs /tmp/build-output/ && \
  ls -la /tmp/build-output/electrs

########################################
# Stage 2: Runtime image
########################################
FROM debian:bookworm-slim

# Runtime deps for electrs
RUN --mount=type=cache,target=/var/cache/apt \
  --mount=type=cache,target=/var/lib/apt \
  apt-get update && \
  apt-get install -y --no-install-recommends \
  libssl3 \
  ca-certificates && \
  rm -rf /var/lib/apt/lists/*

# Copy the statically-built binary
COPY --from=builder /tmp/build-output/electrs /usr/local/bin/electrs

# Copy your electrs config
COPY config/electrs.toml /etc/electrs/config.toml

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 60001

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--conf=/etc/electrs/config.toml"]
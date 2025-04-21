# docker/electrs/Dockerfile

########################################
# Stage 1: Build electrs from source
########################################
FROM rust:1.72 AS builder

# Install dependencies for building + bindgen (libclang)
RUN apt-get update && \
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
  CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-4} \
  RUSTFLAGS="${RUSTFLAGS:--C target-cpu=native}" \
  cargo build --release && \
  ls -la /usr/src/electrs/target/release/electrs

########################################
# Stage 2: Runtime image
########################################
FROM debian:bookworm-slim

# Runtime deps for electrs
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  libssl3 \
  ca-certificates && \
  rm -rf /var/lib/apt/lists/*

# Copy the statically-built binary
COPY --from=builder /usr/src/electrs/target/release/electrs /usr/local/bin/electrs

# Copy your electrs config
COPY config/electrs.toml /etc/electrs/config.toml

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 60001

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--conf=/etc/electrs/config.toml"]
# docker/electrs/Dockerfile

########################################
# Stage 1: Build electrs from source
########################################
FROM rust:1.85 AS builder

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

WORKDIR /usr/src/ord

# Allow overriding the version at build time
ARG ORD_VERSION=0.23.1

# Clone only the tagged release
RUN git clone --depth 1 --branch ${ORD_VERSION} \
  https://github.com/ordinals/ord.git .

# Build in release mode
RUN --mount=type=cache,target=/usr/local/cargo/registry \
  CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-4} \
  RUSTFLAGS="${RUSTFLAGS:--C target-cpu=native}" \
  cargo build --release && \
  ls -la /usr/src/ord/target/release/ord

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
COPY --from=builder /usr/src/ord/target/release/ord /usr/local/bin/ord

# Copy your electrs config
COPY config/ord.yml /etc/ord/config.yml

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/ord"]
CMD ["--config", "/etc/ord/config.yml", "server","--http-port", "80"]
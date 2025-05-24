# docker/bitcoind/Dockerfile
FROM bitcoin/bitcoin:28.1

# copy your regtest bitcoin.conf into place
COPY config/bitcoin.conf /home/bitcoin/.bitcoin/bitcoin.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bitcoin-cli -regtest getblockchaininfo || exit 1

VOLUME ["/bitcoin"]
EXPOSE 18443 18444 28332 28333


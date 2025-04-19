# docker/bitcoind/Dockerfile
FROM bitcoin/bitcoin:28.1

# copy your regtest bitcoin.conf into place
COPY config/bitcoin.conf /home/bitcoin/.bitcoin/bitcoin.conf

VOLUME ["/bitcoin"]
EXPOSE 18443 18444


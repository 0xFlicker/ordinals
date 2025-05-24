# @0xflick/ordinals-test

This package contains test utilities and test suites for the Ordinals project. It provides a testing environment with DynamoDB Local and S3 Server for local development and testing.

## Features

- Docker compose for launching bitcoind, electrs, and mempool against regtest
- Local DynamoDB instance for testing
- Local S3 Server for testing
- Jest test configuration with TypeScript support
- Test utilities for Bitcoin and Ordinals operations

## Prerequisites

- Node.js (Latest LTS version recommended)
- Yarn package manager
- Docker

## Installation

```bash
yarn
```

The package will automatically download DynamoDB Local during the prepare script.

## Available Scripts

- `yarn test`: Runs the test suite with Jest
- `yarn test:fix`: Runs the test suite with Jest, but keeps the bitcoin environment running for further testing

## Docker Compose Environment

The package includes a `docker-compose.yml` file that sets up a complete Bitcoin regtest environment with the following services:

- **bitcoind**: Bitcoin Core node running in regtest mode
- **electrs**: Electrum server for efficient blockchain querying
- **mempool**: Complete mempool.space stack (database, API, and web interface)

### Usage

To start the Bitcoin regtest environment:

```bash
docker-compose up -d
```

This will start all services in detached mode. The following ports will be available:

- Bitcoin RPC: 18443
- Electrum server: 60001
- Mempool web interface: 4080

To stop the environment:

```bash
docker-compose down
```

To stop and remove all data volumes:

```bash
docker-compose down -v
```

The Bitcoin environment is configured for testing purposes with default credentials:

- Bitcoin RPC username: test
- Bitcoin RPC password: test

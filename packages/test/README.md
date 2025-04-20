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

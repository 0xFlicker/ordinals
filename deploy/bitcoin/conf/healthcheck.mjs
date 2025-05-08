import { createServer } from 'http';
import { spawn } from 'child_process';
// Accept network flag and datadir as arguments: flag (e.g. -testnet) and data directory
const flag = process.argv[2] || '';
const dataDir = process.argv[3] || '/home/ec2-user/.bitcoin';

async function checkBitcoin() {
  return new Promise((resolve, reject) => {
    const bitcoin = spawn('bitcoin-cli', [flag, `-datadir=${dataDir}`, 'getblockchaininfo']);
    bitcoin.on('close', (code) => {
      if (code === 0) {
        resolve(void 0);
      } else {
        reject();
      }
    });
  });
}

const server = createServer(async (_, res) => {
  try {
    await checkBitcoin();
    res.writeHead(200);
    res.end();
  } catch (e) {
    res.writeHead(500);
    res.end();
  }
});

server.listen(8080);

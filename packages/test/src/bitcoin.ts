import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

// Function to create a new Bitcoin wallet
export async function createWallet({
  walletName,
  network = "regtest",
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  disablePrivateKeys = false,
  blank = false,
  avoidReuse = false,
}: {
  walletName: string;
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
  disablePrivateKeys?: boolean;
  blank?: boolean;
  avoidReuse?: boolean;
}): Promise<{ name: string; warning: string | null }> {
  const networkFlag = network === "regtest" ? "-regtest" : "";
  const args = [
    networkFlag,
    ...(rpcuser ? ["-rpcuser=" + rpcuser] : []),
    ...(rpcpassword ? ["-rpcpassword=" + rpcpassword] : []),
    "createwallet",
    walletName,
    ...(disablePrivateKeys ? ["disable_private_keys"] : []),
    ...(blank ? ["blank"] : []),
    ...(avoidReuse ? ["avoid_reuse"] : []),
  ].filter(Boolean);

  console.log("bitcoin-cli", args.join(" "));
  const { stdout } = await exec("bitcoin-cli " + args.join(" "));
  return JSON.parse(stdout);
}

// Function to load an existing Bitcoin wallet
export async function loadWallet({
  walletName,
  network = "regtest",
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
}: {
  walletName: string;
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
}): Promise<void> {
  const networkFlag = network === "regtest" ? "-regtest" : "";
  const args = [
    networkFlag,
    ...(rpcuser ? ["-rpcuser=" + rpcuser] : []),
    ...(rpcpassword ? ["-rpcpassword=" + rpcpassword] : []),
    "loadwallet",
    walletName,
  ].filter(Boolean);

  console.log("bitcoin-cli", args.join(" "));
  await exec("bitcoin-cli " + args.join(" "));
}

// Function to send bitcoin using bitcoin-cli
export async function sendBitcoin({
  address,
  amount,
  network = "regtest",
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  rpcwallet = process.env.RPC_WALLET,
  fee_rate = 1,
}: {
  address: string;
  amount: string;
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  fee_rate?: number;
}): Promise<{ txid: string }> {
  const networkFlag = network === "regtest" ? "-regtest" : "";
  const args = [
    networkFlag,
    ...(rpcuser ? ["-rpcuser=" + rpcuser] : []),
    ...(rpcpassword ? ["-rpcpassword=" + rpcpassword] : []),
    ...(rpcwallet ? ["-rpcwallet=" + rpcwallet] : []),
    "-named",
    "send",
    "outputs=" + JSON.stringify({ [address]: amount.toString() }),
    "fee_rate=" + fee_rate,
  ].filter(Boolean);

  console.log("bitcoin-cli", args.join(" "));
  const { stdout } = await exec("bitcoin-cli " + args.join(" "));
  return JSON.parse(stdout);
}

// Function to generate a new block
export async function generateBlock({
  network = "regtest",
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  rpcwallet = process.env.RPC_WALLET,
  address,
  amount = 1,
}: {
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  address: string;
  amount?: number;
}): Promise<void> {
  const networkFlag = network === "regtest" ? "-regtest" : "";
  const args = [
    networkFlag,
    ...(rpcuser ? ["-rpcuser=" + rpcuser] : []),
    ...(rpcpassword ? ["-rpcpassword=" + rpcpassword] : []),
    ...(rpcwallet ? ["-rpcwallet=" + rpcwallet] : []),
    "-named",
    "generatetoaddress",
    "address=" + address,
    "nblocks=" + amount,
  ].filter(Boolean);

  console.log("bitcoin-cli", args.join(" "));
  await exec("bitcoin-cli " + args.join(" "));
}

// Function to get a new Bitcoin address
export async function getNewAddress({
  network = "regtest",
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  rpcwallet = process.env.RPC_WALLET,
}: {
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
}): Promise<string> {
  const networkFlag = network === "regtest" ? "-regtest" : "";
  const args = [
    networkFlag,
    ...(rpcuser ? ["-rpcuser=" + rpcuser] : []),
    ...(rpcpassword ? ["-rpcpassword=" + rpcpassword] : []),
    ...(rpcwallet ? ["-rpcwallet=" + rpcwallet] : []),
    "getnewaddress",
    "-addresstype=bech32m",
  ].filter(Boolean);

  console.log("bitcoin-cli", args.join(" "));
  const { stdout } = await exec("bitcoin-cli " + args.join(" "));
  return stdout.trim();
}

import Client from "bitcoin-core";

const createClient = ({
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  rpcwallet = process.env.RPC_WALLET,
  rpchost = process.env.RPC_HOST,
}: {
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  rpchost?: string;
} = {}) =>
  new Client({
    username: rpcuser!,
    password: rpcpassword!,
    wallet: rpcwallet,
    host: rpchost!,
    version: "25.0.0",
  });
export async function createWallet({
  walletName,
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  rpchost = process.env.RPC_HOST,
}: {
  walletName: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpchost?: string;
}): Promise<{ name: string; warning: string | null }> {
  const client = createClient({ rpcuser, rpcpassword, rpchost });
  const res = await client.command("createwallet", {
    wallet_name: walletName,
  });
  return res;
}

export async function loadWallet({
  walletName,
  rpcuser,
  rpcpassword,
  rpchost,
}: {
  walletName: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpchost?: string;
}): Promise<void> {
  const client = createClient({ rpcuser, rpcpassword, rpchost });
  await client.command("loadwallet", {
    wallet_name: walletName,
  });
}

export async function sendRawTransaction({
  txhex,
  rpcuser,
  rpcpassword,
  rpchost,
}: {
  txhex: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpchost?: string;
}): Promise<string> {
  const client = createClient({ rpcuser, rpcpassword, rpchost });
  return await client.command("sendrawtransaction", {
    hexstring: txhex,
  });
}

export async function sendBitcoin({
  address,
  amount,
  rpcuser,
  rpcpassword,
  rpcwallet,
  fee_rate = 1,
  rpchost,
}: {
  address: string;
  amount: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  fee_rate?: number;
  rpchost?: string;
}): Promise<{ txid: string }> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet, rpchost });

  const outputs = { [address]: parseFloat(amount) };
  return await client.command("send", {
    outputs,
    fee_rate,
  });
}

export async function generateBlock({
  rpcuser,
  rpcpassword,
  rpcwallet,
  address,
  amount = 1,
  rpchost,
}: {
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  address: string;
  amount?: number;
  rpchost?: string;
}): Promise<string[]> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet, rpchost });
  return await client.command("generatetoaddress", {
    nblocks: amount,
    address,
  });
}

export async function getNewAddress({
  rpcuser,
  rpcpassword,
  rpcwallet,
  rpchost,
}: {
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  rpchost?: string;
}): Promise<string> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet, rpchost });
  return await client.command("getnewaddress", {
    address_type: "bech32",
  });
}

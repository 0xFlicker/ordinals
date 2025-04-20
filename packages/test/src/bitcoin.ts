import Client from "bitcoin-core";

const createClient = ({
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
  rpcwallet = process.env.RPC_WALLET,
}: {
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
} = {}) =>
  new Client({
    username: rpcuser!,
    password: rpcpassword!,
    wallet: rpcwallet,
    host: "http://localhost:18443",
    version: "25.0.0",
  });
export async function createWallet({
  walletName,
  rpcuser = process.env.RPC_USER,
  rpcpassword = process.env.RPC_PASSWORD,
}: {
  walletName: string;
  rpcuser?: string;
  rpcpassword?: string;
}): Promise<{ name: string; warning: string | null }> {
  const client = createClient({ rpcuser, rpcpassword });
  const res = await client.command("createwallet", {
    wallet_name: walletName,
  });
  return res;
}

export async function loadWallet({
  walletName,
  rpcuser,
  rpcpassword,
}: {
  walletName: string;
  rpcuser?: string;
  rpcpassword?: string;
}): Promise<void> {
  const client = createClient({ rpcuser, rpcpassword });
  await client.command("loadwallet", {
    wallet_name: walletName,
  });
}

export async function sendRawTransaction({
  txhex,
  rpcuser,
  rpcpassword,
}: {
  txhex: string;
  rpcuser?: string;
  rpcpassword?: string;
}): Promise<string> {
  const client = createClient({ rpcuser, rpcpassword });
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
}: {
  address: string;
  amount: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  fee_rate?: number;
}): Promise<{ txid: string }> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet });

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
}: {
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  address: string;
  amount?: number;
}): Promise<string[]> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet });
  return await client.command("generatetoaddress", {
    nblocks: amount,
    address,
  });
}

export async function getNewAddress({
  rpcuser,
  rpcpassword,
  rpcwallet,
}: {
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
}): Promise<string> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet });
  return await client.command("getnewaddress", {
    address_type: "bech32",
  });
}

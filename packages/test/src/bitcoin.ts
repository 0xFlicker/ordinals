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
  });

export async function createWallet({
  walletName,
  network,
  rpcuser,
  rpcpassword,
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
  const client = createClient({ rpcuser, rpcpassword });
  return await client.command("createwallet", {
    wallet_name: walletName,
    disable_private_keys: disablePrivateKeys,
    blank,
    avoid_reuse: avoidReuse,
    network,
  });
}

export async function loadWallet({
  walletName,
  network,
  rpcuser,
  rpcpassword,
}: {
  walletName: string;
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
}): Promise<void> {
  const client = createClient({ rpcuser, rpcpassword });
  await client.command("loadwallet", {
    wallet_name: walletName,
    network,
  });
}

export async function sendRawTransaction({
  txhex,
  network,
  rpcuser,
  rpcpassword,
}: {
  txhex: string;
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
}): Promise<string> {
  const client = createClient({ rpcuser, rpcpassword });
  return await client.command("sendrawtransaction", {
    txhex,
    network,
  });
}

export async function sendBitcoin({
  address,
  amount,
  network,
  rpcuser,
  rpcpassword,
  rpcwallet,
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
  const client = createClient({ rpcuser, rpcpassword, rpcwallet });

  const outputs = { [address]: parseFloat(amount) };
  const txid = await client.command("send", {
    outputs,
    fee_rate,
    network,
  });

  return { txid };
}

export async function generateBlock({
  network,
  rpcuser,
  rpcpassword,
  rpcwallet,
  address,
  amount = 1,
}: {
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
  address: string;
  amount?: number;
}): Promise<string[]> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet });
  return await client.command("generatetoaddress", {
    amount,
    address,
    network,
  });
}

export async function getNewAddress({
  network,
  rpcuser,
  rpcpassword,
  rpcwallet,
}: {
  network?: string;
  rpcuser?: string;
  rpcpassword?: string;
  rpcwallet?: string;
}): Promise<string> {
  const client = createClient({ rpcuser, rpcpassword, rpcwallet });
  return await client.command("getnewaddress", {
    address_type: "bech32",
    network,
  });
}

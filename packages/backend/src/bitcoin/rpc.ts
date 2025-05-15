import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { BitcoinNetworkNames } from "@0xflick/ordinals-models";

const lambdaClient = new LambdaClient();

const {
  MAINNET_RPC_LAMBDA_ARN,
  TESTNET_RPC_LAMBDA_ARN,
  TESTNET4_RPC_LAMBDA_ARN,
  REGTEST_RPC_LAMBDA_ARN,
} = process.env;

interface JsonRpcRequest {
  jsonrpc: "1.0";
  method: string;
  params: any[];
  id: number;
}

export interface JsonRpcResponse<R = unknown> {
  result: R;
  error: { code: number; message: string } | null;
  id: number;
}

/**
 * Invokes the RPC Lambda with a JSON-RPC payload and returns the
 * `result` or throws if RPC error.
 */
async function invokeRpc<R>(
  method: string,
  params: any[],
  network: BitcoinNetworkNames,
): Promise<R> {
  const RPC_FN_ARN = process.env[`${network.toUpperCase()}_RPC_LAMBDA_ARN`];
  if (!RPC_FN_ARN) {
    throw new Error(
      `${network.toUpperCase()}_RPC_LAMBDA_ARN env var is not set`,
    );
  }

  const payload: JsonRpcRequest = {
    jsonrpc: "1.0",
    method,
    params,
    id: Date.now(),
  };

  const cmd = new InvokeCommand({
    FunctionName: RPC_FN_ARN,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const resp = await lambdaClient.send(cmd);

  if (resp.FunctionError) {
    // Lambda itself errored
    const raw = Buffer.from(resp.Payload!).toString("utf-8");
    let errInfo: any;
    try {
      errInfo = JSON.parse(raw);
    } catch {
      throw new Error(`RPC Lambda error (malformed payload): ${raw}`);
    }
    throw new Error(`RPC Lambda exception: ${errInfo.errorMessage}`);
  }

  const raw = resp.Payload as Uint8Array;
  const text = Buffer.from(raw).toString("utf-8");
  const rpcResp = JSON.parse(text) as JsonRpcResponse<R>;

  // Check for RPC errors from the Bitcoin node
  if (rpcResp.error) {
    throw new Error(
      `Bitcoin RPC error: ${rpcResp.error.message} (code: ${rpcResp.error.code})`,
    );
  }

  return rpcResp.result;
}

/**
 * Invokes the RPC Lambda with a JSON-RPC payload and returns the
 * `result` or throws if RPC error.
 */
async function invokeBatchRpc<R>(
  requests: Omit<JsonRpcRequest, "id" | "jsonrpc">[],
  network: BitcoinNetworkNames,
): Promise<JsonRpcResponse<R>[]> {
  const RPC_FN_ARN = process.env[`${network.toUpperCase()}_RPC_LAMBDA_ARN`];
  if (!RPC_FN_ARN) {
    throw new Error(
      `${network.toUpperCase()}_RPC_LAMBDA_ARN env var is not set`,
    );
  }

  let id = Date.now();

  const payload: JsonRpcRequest[] = requests.map((request) => ({
    jsonrpc: "1.0",
    ...request,
    id: id++,
  }));

  const cmd = new InvokeCommand({
    FunctionName: RPC_FN_ARN,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const resp = await lambdaClient.send(cmd);

  if (resp.FunctionError) {
    // Lambda itself errored
    const raw = Buffer.from(resp.Payload!).toString("utf-8");
    let errInfo: any;
    try {
      errInfo = JSON.parse(raw);
    } catch {
      throw new Error(`RPC Lambda error (malformed payload): ${raw}`);
    }
    throw new Error(`RPC Lambda exception: ${errInfo.errorMessage}`);
  }

  const raw = resp.Payload as Uint8Array;
  const text = Buffer.from(raw).toString("utf-8");
  const rpcResp = JSON.parse(text) as JsonRpcResponse<R>[];

  return rpcResp;
}

/**
 * Broadcasts a raw transaction
 */
export async function sendRawTransaction(
  txhex: string,
  network: BitcoinNetworkNames,
): Promise<string> {
  return invokeRpc<string>("sendrawtransaction", [txhex], network);
}

export async function getBlockchainInfo(network: BitcoinNetworkNames) {
  return invokeRpc<{
    chain: string;
    blocks: number;
    bestblockhash: string;
    headers: number;
    difficulty: number;
    mediantime: number;
    verificationprogress: number;
    initialblockdownload: boolean;
    chainwork: string;
    pruned: boolean;
    warnings: string;
  }>("getblockchaininfo", [], network);
}

export async function estimateSmartFee(
  {
    conf_target,
    estimate_mode,
  }: {
    conf_target: number;
    estimate_mode?: "ECONOMICAL" | "CONSERVATIVE" | "UNSET";
  },
  network: BitcoinNetworkNames,
) {
  return invokeRpc<{
    feerate: number;
    errors?: string[];
    blocks: number;
  }>("estimatesmartfee", [conf_target, estimate_mode], network);
}

export async function estimateSmartFeeBatch(
  requests: {
    conf_target: number;
    estimate_mode?: "ECONOMICAL" | "CONSERVATIVE" | "UNSET";
  }[],
  network: BitcoinNetworkNames,
) {
  return invokeBatchRpc<{
    feerate: number;
    errors?: string[];
    blocks: number;
  }>(
    requests.map((request) => ({
      method: "estimatesmartfee",
      params: [request.conf_target, request.estimate_mode],
    })),
    network,
  );
}

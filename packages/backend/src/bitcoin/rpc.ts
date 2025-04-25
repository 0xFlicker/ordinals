import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient();

const RPC_FN_ARN = process.env.RPC_LAMBDA_ARN;

interface JsonRpcRequest {
  jsonrpc: "1.0";
  method: string;
  params: any[];
  id: number;
}

interface JsonRpcResponse<R = unknown> {
  result: R;
  error: { code: number; message: string } | null;
  id: number;
}

/**
 * Invokes the RPC Lambda with a JSON-RPC payload and returns the
 * `result` or throws if RPC error.
 */
async function invokeRpc<R>(method: string, params: any[]): Promise<R> {
  if (!RPC_FN_ARN) {
    throw new Error("RPC_LAMBDA_ARN env var is not set");
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
 * Broadcasts a raw transaction
 */
export async function sendRawTransaction(txhex: string): Promise<string> {
  return invokeRpc<string>("sendrawtransaction", [txhex]);
}

import { Handler } from "aws-lambda";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "bitcoin-rpc",
});

const {
  JSON_RPC_ENDPOINT: endpoint,
  JSON_RPC_USER: username,
  JSON_RPC_PASSWORD: password,
} = process.env;

export const handler: Handler = async (body) => {
  if (!endpoint || !username || !password) {
    logger.error("Missing RPC configuration");
    throw new Error("RPC not configured");
  }

  if (!body) {
    logger.error("Empty request event");
    throw new Error("Empty request event");
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  try {
    logger.debug(
      {
        endpoint,
        event: body,
      },
      "RPC request",
    );

    const rpcRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await rpcRes.text();
    const isJson = rpcRes.headers
      .get("content-type")
      ?.includes("application/json");

    const response = isJson ? JSON.parse(payload) : payload;

    logger.debug(response, "RPC response");

    return response;
  } catch (err: any) {
    logger.error("RPC passthrough error:", err);
    throw err;
  }
};

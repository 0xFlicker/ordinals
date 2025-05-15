import { Handler } from "aws-lambda";
import http2 from "node:http2";
import { URL } from "node:url";

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
    if (Array.isArray(body)) {
      return await Promise.all(
        body.map((payload) => postJson({ url: endpoint, auth, body: payload })),
      );
    }

    return await postJson({
      url: endpoint,
      auth,
      body,
    });
  } catch (err: any) {
    logger.error("RPC passthrough error:", err);
    return {
      error: err.message,
    };
  }
};

async function postJson<T>({
  url,
  auth,
  body,
}: {
  url: string;
  auth: string;
  body: unknown;
}): Promise<T> {
  const rpcRes = await fetch(url, {
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
  if (!isJson) {
    throw new Error("Invalid response");
  }

  return JSON.parse(payload);
}
/**
 * Issue a single JSON POST over an existing HTTP/2 session.
 */
function postJsonHttp2<T>({
  session,
  auth,
  path,
  body,
}: {
  session: http2.ClientHttp2Session;
  auth: string;
  path: string;
  body: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = session.request({
      [http2.constants.HTTP2_HEADER_METHOD]: "POST",
      [http2.constants.HTTP2_HEADER_PATH]: path,
      [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: "application/json",
      [http2.constants.HTTP2_HEADER_AUTHORIZATION]: `Basic ${auth}`,
    });

    req.setEncoding("utf8");

    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}") as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);

    req.end(JSON.stringify(body));
  });
}

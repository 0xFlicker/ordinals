import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto as any;
import("dotenv/config");
import("./wagmi.js");
import("./app.js");

// catch and promise / uncaught errors and log them

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

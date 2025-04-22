import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto as any;
if (process.env.AWS_PROFILE) {
  delete process.env.AWS_PROFILE;
}
import("dotenv/config");
import("./wagmi.js");
import("./app.js");

// catch and promise / uncaught errors and log them

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

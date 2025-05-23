import { Network, validate } from "bitcoin-address-validation";
import { Address, Networks } from "@cmdcode/tapscript";
import cbor from "cbor";
import * as secp from "@noble/secp256k1";
import crypto from "crypto-js";
import { BitcoinNetworkNames, BitcoinScriptData } from "./types.js";
export const { encode: cborEncode } = cbor;

export function generatePrivKey() {
  return bytesToHex(secp.utils.randomPrivateKey());
}

export function base64ToHex(str: string) {
  const raw = atob(str);
  let result = "";
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += hex.length === 2 ? hex : "0" + hex;
  }
  return result.toLowerCase();
}

export function buf2hex(buffer: ArrayBuffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string) {
  return Uint8Array.from(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );
}

export function bytesToHex(bytes: Uint8Array) {
  return bytes.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0"),
    "",
  );
}

export function textToHex(text: string) {
  var encoder = new TextEncoder().encode(text);
  return [...new Uint8Array(encoder)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export function isValidAddress(address: string) {
  return isValidTaprootAddress(address);
}

export function isValidTaprootAddress(address: string) {
  return Address.p2tr.check(address);
}

export function isValidJson(content: string) {
  if (!content) return;
  try {
    JSON.parse(content);
  } catch (e) {
    return;
  }
  return true;
}

export function satsToBitcoin(sats: bigint) {
  if (sats >= 100000000n) sats = sats * 10n;
  let string =
    String(sats).padStart(8, "0").slice(0, -9) +
    "." +
    String(sats).padStart(8, "0").slice(-9);
  if (string.substring(0, 1) == ".") string = "0" + string;
  return string;
}

export function scriptDataToSerializedScript(
  scriptData: (string | Uint8Array)[],
): BitcoinScriptData[] {
  return scriptData.map((data) => {
    if (typeof data === "string") {
      return data;
    }
    return { base64: Buffer.from(data).toString("base64") };
  });
}

export function serializedScriptToScriptData(
  serializedScript: BitcoinScriptData[],
) {
  return serializedScript.map((data) => {
    if (typeof data === "string") {
      return data;
    }
    return new Uint8Array(Buffer.from(data.base64, "base64"));
  });
}

export function bitcoinToSats(bitcoin: string): bigint {
  let [whole, decimal] = bitcoin.split(".");
  if (!decimal) decimal = "0";
  if (decimal.length > 8) decimal = decimal.slice(0, 8);
  if (decimal.length < 8) decimal = decimal.padEnd(8, "0");
  return BigInt(whole) * 100000000n + BigInt(decimal);
}
export function arrayBufferToBuffer(ab: ArrayBuffer) {
  return Buffer.from(new Uint8Array(ab));
}

export function hexString(buffer: ArrayBuffer) {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map((value) => {
    return value.toString(16).padStart(2, "0");
  });

  return "0x" + hexCodes.join("");
}

export async function bufferToSha256(bufferOrString: string | ArrayBuffer) {
  return crypto.SHA256(
    typeof bufferOrString === "string"
      ? crypto.enc.Hex.parse(bufferOrString)
      : crypto.enc.Hex.parse(
          arrayBufferToBuffer(bufferOrString).toString("hex"),
        ),
  );
}

export function networkNamesToNetworkEnum(
  network: BitcoinNetworkNames,
): Network {
  switch (network) {
    case "mainnet":
      return Network.mainnet;
    case "testnet":
      return Network.testnet;
    case "regtest":
      return Network.regtest;
    case "testnet4":
      return Network.testnet;
    default:
      throw new Error("Invalid network");
  }
}

export function networkNamesToTapScriptName(
  network: BitcoinNetworkNames,
): Networks {
  switch (network) {
    case "mainnet":
      return "main";
    case "testnet":
      return "testnet";
    case "regtest":
      return "regtest";
    case "testnet4":
      return "testnet";
    default:
      return network;
  }
}

export async function validateAddress(
  address: string,
  network: BitcoinNetworkNames,
) {
  return validate(address, networkNamesToNetworkEnum(network));
}

export function serializeTxidAndIndexWithStripping(
  txid: string,
  index: number,
) {
  // Convert the txid from a hex string to a Buffer in reverse order (little-endian for the txid)
  let txidBuffer = Buffer.from(txid, "hex").reverse();

  // Convert the index to a 4-byte little-endian buffer
  let indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(index);

  // Determine the number of index bytes to include (strip trailing zeros, but include at least one byte)
  let indexBytesToInclude = 0;
  for (let i = 0; i < 4; i++) {
    if (indexBuffer[i] !== 0) {
      indexBytesToInclude = i + 1;
    }
  }

  // Concatenate txid and the relevant index bytes
  let serializedBuffer = Buffer.concat([
    txidBuffer,
    indexBuffer.slice(0, indexBytesToInclude),
  ]);

  return serializedBuffer.toString("hex");
}

export function numberToLittleEndian(number: number) {
  // first determine the number of bytes needed to represent the number
  let bytesNeeded = 1;
  let currentNumber = number;
  while (currentNumber > 255) {
    bytesNeeded++;
    currentNumber = currentNumber / 256;
  }
  const buffer = Buffer.alloc(bytesNeeded);
  buffer.writeUIntLE(number, 0, bytesNeeded);
  return buffer;
}

export function encodeElectrumScriptHash(address: string): string {
  // Build the scriptPubKey for the address
  const script = Buffer.concat([
    Buffer.from([0x51]), // OP_1
    Buffer.from([0x20]), // Push 32 bytes
    Address.p2tr.decode(address), // The tapkey
  ]);
  // Convert scriptPubKey to buffer
  const addrScripthash = crypto.enc.Hex.stringify(
    crypto.SHA256(crypto.enc.Hex.parse(script.toString("hex"))),
  );
  // Convert to little-endian (reverse byte order)
  return addrScripthash.match(/.{2}/g)!.reverse().join("");
}

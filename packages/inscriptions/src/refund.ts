import { Address, Signer, Tap, Tx } from "@0xflick/tapscript";
import * as cryptoUtils from "@0xflick/crypto-utils";

export interface RefundTransactionRequest {
  feeRate: number;
  refundTapKey: string;
  refundCBlock: string;
  secKey: cryptoUtils.SecretKey;
  txid: string;
  vout: number;
  amount: number | bigint;
  address: string;
}

export async function generateRefundTransaction({
  feeRate,
  refundTapKey,
  refundCBlock,
  secKey,
  txid,
  vout,
  amount,
  address,
}: RefundTransactionRequest) {
  let pubKey = secKey.pub.x;
  const refundScript = [pubKey, "OP_CHECKSIG"];

  // Create template tx with full amount to calculate size with witness
  const templateTx = Tx.create({
    vin: [
      {
        txid: txid,
        vout: vout,
        prevout: {
          value: amount,
          scriptPubKey: ["OP_1", refundTapKey],
        },
      },
    ],
    vout: [
      {
        value: amount,
        scriptPubKey: Address.toScriptPubKey(address),
      },
    ],
  });

  // Sign template to get accurate witness size
  const templateSig = await Signer.taproot.sign(secKey.raw, templateTx, 0, {
    extension: Tap.encodeScript(refundScript),
  });
  templateTx.vin[0].witness = [templateSig.hex, refundScript, refundCBlock];

  // Calculate fee based on template with witness
  const { vsize } = Tx.util.getTxSize(templateTx);
  const fee = Math.ceil(feeRate * vsize);

  // Create actual tx with fee subtracted
  const refundTx = Tx.create({
    vin: [
      {
        txid: txid,
        vout: vout,
        prevout: {
          value: amount,
          scriptPubKey: ["OP_1", refundTapKey],
        },
      },
    ],
    vout: [
      {
        value: Number(amount) - fee,
        scriptPubKey: Address.toScriptPubKey(address),
      },
    ],
  });

  const sig = await Signer.taproot.sign(secKey.raw, refundTx, 0, {
    extension: Tap.encodeScript(refundScript),
  });
  refundTx.vin[0].witness = [sig.hex, refundScript, refundCBlock];

  const isValid = Signer.taproot.verifyTx(refundTx, 0, {
    pubkey: pubKey,
  });
  if (!isValid) {
    throw new Error("Invalid signature");
  }
  return Tx.encode(refundTx).hex;
}

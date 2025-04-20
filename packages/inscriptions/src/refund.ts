import { Address, Signer, Tap, Tx } from "@cmdcode/tapscript";
import { get_pubkey } from "@cmdcode/crypto-tools/keys";

export interface RefundTransactionRequest {
  feeRate: number;
  refundTapKey: string;
  refundCBlock: string;
  tweakedTreeTapKey: string;
  secKey: Uint8Array;
  txid: string;
  vout: number;
  amount: number | bigint;
  address: string;
  scriptPubKey: string;
}

export async function generateRefundTransaction({
  feeRate,
  refundTapKey,
  refundCBlock,
  tweakedTreeTapKey,
  secKey,
  txid,
  vout,
  amount,
  address,
  scriptPubKey,
}: RefundTransactionRequest) {
  const pubKey = get_pubkey(secKey, true);

  const refundScript = [pubKey, "OP_CHECKSIG"];

  // Create template tx with full amount to calculate size with witness
  const templateTx = Tx.create({
    vin: [
      {
        txid: txid,
        vout: vout,
        prevout: {
          value: amount,
          scriptPubKey: ["OP_1", tweakedTreeTapKey],
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
  const templateSig = await Signer.taproot.sign(secKey, templateTx, 0, {
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
          scriptPubKey: ["OP_1", tweakedTreeTapKey],
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

  const sig = await Signer.taproot.sign(secKey, refundTx, 0, {
    extension: Tap.encodeScript(refundScript),
  });
  refundTx.vin[0].witness = [sig.hex, refundScript, refundCBlock];

  const isValid = Signer.taproot.verify(refundTx, 0, {
    pubkey: pubKey,
  });
  if (!isValid) {
    throw new Error("Invalid signature");
  }
  return refundTx;
}

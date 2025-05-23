import { Address, Script, Signer, Tap, Tx } from "@cmdcode/tapscript";
import { get_pubkey } from "@cmdcode/crypto-tools/keys";

export interface RefundTransactionRequest {
  feeRate: number;
  refundCBlock: string;
  treeTapKey: string;
  secKey: Uint8Array;
  txid: string;
  vout: number;
  amount: bigint;
  address: string;
}

export async function generateRefundTransaction({
  feeRate,
  refundCBlock,
  treeTapKey,
  secKey,
  txid,
  vout,
  amount,
  address,
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
          value: Number(amount),
          scriptPubKey: ["OP_1", treeTapKey],
        },
      },
    ],
    vout: [
      {
        value: Number(amount),
        scriptPubKey: Address.toScriptPubKey(address),
      },
    ],
  });

  // Sign template to get accurate witness size
  const templateSig = await Signer.taproot.sign(secKey, templateTx, 0, {
    extension: Tap.encodeScript(refundScript),
  });
  templateTx.vin[0].witness = [
    templateSig.hex,
    Script.encode(refundScript),
    refundCBlock,
  ];

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
          scriptPubKey: ["OP_1", treeTapKey],
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

export type BatchRefundTransactionRequest = {
  feeRate: number;
  inputs: {
    txid: string;
    amount: number;
    vout: number;
    treeTapKey: string;
    refundCBlock: string;
    secKey: Uint8Array;
  }[];
  destinationAddress: string;
};

export async function generateBatchRefundTransaction({
  feeRate,
  inputs,
  destinationAddress,
}: BatchRefundTransactionRequest) {
  const txTemplate = Tx.create({
    vin: inputs.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      prevout: {
        value: input.amount,
        scriptPubKey: ["OP_1", input.treeTapKey],
      },
    })),
    vout: [
      {
        value: inputs.reduce((acc, input) => acc + input.amount, 0),
        scriptPubKey: Address.toScriptPubKey(destinationAddress),
      },
    ],
  });

  // sign template to get accurate witness size
  for (let i = 0; i < txTemplate.vin.length; i++) {
    const vin = txTemplate.vin[i];
    const input = inputs[i];
    const sig = await Signer.taproot.sign(input.secKey, txTemplate, i, {
      extension: Tap.encodeScript(input.treeTapKey),
    });
    vin.witness = [sig.hex, input.treeTapKey, input.refundCBlock];
  }

  const { vsize } = Tx.util.getTxSize(txTemplate);
  const fee = Math.ceil(feeRate * vsize);

  const tx = Tx.create({
    vin: inputs.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      prevout: {
        value: input.amount,
        scriptPubKey: ["OP_1", input.treeTapKey],
      },
    })),
    vout: [
      {
        value: inputs.reduce((acc, input) => acc + input.amount, 0) - fee,
        scriptPubKey: Address.toScriptPubKey(destinationAddress),
      },
    ],
  });

  for (let i = 0; i < tx.vin.length; i++) {
    const vin = tx.vin[i];
    const input = inputs[i];
    const sig = await Signer.taproot.sign(input.secKey, tx, i, {
      extension: Tap.encodeScript(input.treeTapKey),
    });
    vin.witness = [sig.hex, input.treeTapKey, input.refundCBlock];
  }

  return tx;
}

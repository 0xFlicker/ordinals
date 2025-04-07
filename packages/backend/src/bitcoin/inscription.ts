import {
  BitcoinNetworkNames,
  InscriptionContent,
  InscriptionFile,
  generateFundableGenesisTransaction,
  generatePrivKey,
} from "@0xflick/inscriptions";
import {
  toAddressInscriptionId,
  TInscriptionDoc,
  hashAddress,
} from "@0xflick/ordinals-models";

export async function createInscriptionTransaction({
  address,
  network,
  feeRate,
  tip,
  inscriptions,
  tipAmountDestination,
  parentInscriptions,
}: {
  address: string;
  network: BitcoinNetworkNames;
  feeRate: number;
  tip?: number;
  inscriptions: InscriptionContent[];
  tipAmountDestination: string;
  parentInscriptions?: {
    txid: string;
    index: number;
  }[];
}): Promise<TInscriptionDoc & { files: InscriptionFile[] }> {
  const privKey = generatePrivKey();
  const {
    amount,
    fundingAddress,
    genesisCblock,
    genesisLeaf,
    genesisScript,
    genesisTapKey,
    inscriptionsToWrite,
    overhead,
    padding,
    totalFee,
    files,
    secKey,
  } = await generateFundableGenesisTransaction({
    address,
    inscriptions,
    network,
    privKey,
    feeRate,
    tip: tip ?? 0,
    padding: 546,
    parentInscriptions,
  });

  return {
    id: toAddressInscriptionId(hashAddress(fundingAddress)),
    files,
    fundingAddress,
    fundingAmountBtc: amount,
    initCBlock: genesisCblock,
    initLeaf: genesisLeaf,
    initScript: genesisScript,
    initTapKey: genesisTapKey,
    network,
    overhead,
    padding,
    secKey: Buffer.from(secKey).toString("hex"),
    totalFee,
    writableInscriptions: inscriptionsToWrite,
    tip: tip ?? 0,
    tipAmountDestination,
  };
}

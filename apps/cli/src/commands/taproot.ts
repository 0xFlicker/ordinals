import { Address, Tx, Tap, Signer } from "@cmdcode/tapscript";
import {
  BitcoinNetworkNames,
  generatePrivKey,
  networkNamesToTapScriptName,
} from "@0xflick/inscriptions";
import { get_seckey, get_pubkey } from "@cmdcode/crypto-tools/keys";

export function generateReceiverAddress({
  network,
}: {
  network: BitcoinNetworkNames;
}) {
  const privKey = generatePrivKey();
  const secKey = get_seckey(privKey);
  const pubkey = get_pubkey(secKey);
  const [tpubkey] = Tap.getPubKey(pubkey);
  const address = Address.p2tr.encode(
    tpubkey,
    networkNamesToTapScriptName(network),
  );

  console.log(`privKey: ${privKey}`);
  console.log(`address: ${address}`);
}

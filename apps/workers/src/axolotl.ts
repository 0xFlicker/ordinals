import { createDynamoDbFundingDao } from "@0xflick/ordinals-backend";
import { ID_Collection } from "@0xflick/ordinals-models";
import { createMempoolBitcoinClient } from "./mempool.js";
import cbor from "cbor";
const { decode: decodeCbor } = cbor;
import fs from "fs";

interface IAxolotlMeta {
  tokenIds: number[];
  revealedAt: number;
}

interface Output {
  id: string;
  revealTxids: string[];
  tokenIds: number[];
  revealedAt: number;
  destinationAddress: string;
}

const blockHashes = new Map<number, string>();

export async function decorate({ collectionId }: { collectionId: string }) {
  const revealedMap = new Map<string, true>();

  let totalRevealed = 0;
  const data: Output[] = JSON.parse(
    fs.readFileSync(`./revealed-${collectionId}.json`, "utf8"),
  );
  const existingData = JSON.parse(
    fs.readFileSync(`./metadata-${collectionId}.json`, "utf8"),
  );
  const outputs: {
    id: string;
    meta?: {
      name: string;
      attributes: any;
      high_res_img_url: string;
    };
  }[] = [];
  for (const record of existingData) {
    if (!record.meta) {
      continue;
    }
    revealedMap.set(record.id, true);
    outputs.push(record);
  }
  const mempool = createMempoolBitcoinClient({ network: "mainnet" });
  const tipHeight = await mempool.blocks.getBlocksTipHeight();

  for (const { id, revealTxids, tokenIds, revealedAt } of data) {
    if (revealedAt <= tipHeight - 2) {
      if (!blockHashes.has(revealedAt)) {
        blockHashes.set(
          revealedAt,
          await mempool.blocks.getBlockHeight({ height: revealedAt }),
        );
      }
      const hash = blockHashes.get(revealedAt)!;
      const seeds: string[] = [];

      for (let i = 0; i < revealTxids.length; i++) {
        const revealTxid = revealTxids[i];
        const inscriptionId = `${revealTxid}i0`;
        if (revealedMap.has(inscriptionId)) {
          continue;
        }
        revealedMap.set(inscriptionId, true);
        const cdataResponse = await fetch(
          `https://ordinals.com/r/metadata/${inscriptionId}`,
        );
        const cdata = await cdataResponse.json();
        const cborData = decodeCbor(Buffer.from(cdata, "hex"));
        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(hash + cborData.tokenId),
        );
        const hashHex = Buffer.from(hashBuffer).toString("hex");
        seeds.push(hashHex);
        totalRevealed++;

        // yes lots lol
        // if (cborData.tokenId !== tokenIds[i]) {
        //   console.log(
        //     "WARNING: tokenId mismatch",
        //     cborData.tokenId,
        //     tokenIds[i],
        //     "at",
        //     id,
        //   );
        // }

        const metadata = await (
          await fetch(
            `https://frame.bitflick.xyz/metadata/axolotl/0x${hashHex}`,
          )
        ).json();

        outputs.push({
          id: `${revealTxid}i0`,
          meta: {
            name: `Axolotl Valley #${cborData.tokenId}`,
            attributes: metadata.attributes,
            high_res_img_url: `https://frame.bitflick.xyz/preview/axolotl/0x${hashHex}`,
          },
        });
      }
    } else {
      for (let revealTxId of revealTxids) {
        outputs.push({ id: `${revealTxId}i0` });
      }
    }
  }
  console.log("Total revealed", totalRevealed);
  fs.writeFileSync(
    `./metadata-${collectionId}.json`,
    JSON.stringify(outputs, null, 2),
  );
}

export async function axolotl({ collectionId }: { collectionId: string }) {
  const fundingDao = createDynamoDbFundingDao<IAxolotlMeta>();

  const output: Output[] = [];
  for await (const { id } of fundingDao.listAllFundingsByStatus({
    id: collectionId as ID_Collection,
    fundingStatus: "revealed",
  })) {
    const funding = await fundingDao.getFunding(id);
    const revealTxids = funding.revealTxids;
    const tokenIds = funding.meta.tokenIds;
    const revealedAt = funding.meta.revealedAt;
    const destinationAddress = funding.destinationAddress;

    if (revealTxids !== undefined) {
      output.push({
        id,
        revealTxids,
        tokenIds,
        revealedAt,
        destinationAddress,
      });
    } else {
      console.log("WARNING: funding has no revealTxids", funding.id);
    }
  }

  fs.writeFileSync(
    `./revealed-${collectionId}.json`,
    JSON.stringify(output, null, 2),
  );
}

import { promises as fs } from "fs";
import { Address } from "@cmdcode/tapscript";

export async function allocateAirdrop(
  addressesFile: string,
  outputFile: string,
) {
  const addresses: string[] = JSON.parse(
    await fs.readFile(addressesFile, "utf8"),
  );
  // Split 100M tokens between all addresses with 3 or more ordinals, split token weighted
  // by the number of ordinals they have
  const addressToAmountMap = new Map<string, number>();
  for (const address of addresses) {
    addressToAmountMap.set(address, (addressToAmountMap.get(address) ?? 0) + 1);
  }

  // Now remove addresses with less than 5 ordinals
  const eligibleAddresses = new Set(
    addresses.filter((address) => (addressToAmountMap.get(address) ?? 0) >= 3),
  );

  // Get total number of ordinals of all eligible addresses
  const totalOrdinals = Array.from(eligibleAddresses).reduce(
    (acc, address) => acc + (addressToAmountMap.get(address) ?? 0),
    0,
  );

  // Allocate 100M tokens to each address based on the number of ordinals they have
  const allocationPerOrdinal = 100_000_000 / totalOrdinals;
  for (const address of eligibleAddresses) {
    const amount =
      (addressToAmountMap.get(address) ?? 0) * allocationPerOrdinal;
    addressToAmountMap.set(address, Math.floor(amount));
  }

  // Write the output file as CSV with address, amount
  const csvContent = `address,amount,type\n${Array.from(eligibleAddresses)
    .map(
      (address) =>
        `${address},${addressToAmountMap.get(address)},${
          Address.decode(address).type
        }`,
    )
    .join("\n")}`;
  await fs.writeFile(outputFile, csvContent);

  console.log(`Wrote ${outputFile} with ${eligibleAddresses.size} addresses`);
}

export async function collectAddresses(idsFile: string, outputFile: string) {
  const ids: string[] = JSON.parse(await fs.readFile(idsFile, "utf8"));
  const addresses: string[] = [];
  const concurrency = 48;
  const queue = [...ids];
  const inProgress = new Set<string>();

  async function processInscription(
    inscriptionID: string,
  ): Promise<string | null> {
    let attempts = 0;
    while (attempts < 10) {
      try {
        console.log(
          `${ids.length - queue.length}/${
            ids.length
          } - ${inscriptionID} - ${attempts} attempts`,
        );
        const response = await fetch(
          `http://localhost:5000/r/inscription/${inscriptionID}`,
        );
        const data = await response.json();
        return data.address;
      } catch (error) {
        attempts++;
        if (attempts === 10) {
          console.error(`Failed to process ${inscriptionID} after 10 attempts`);
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return null;
  }

  while (queue.length > 0 || inProgress.size > 0) {
    while (inProgress.size < concurrency && queue.length > 0) {
      const inscriptionID = queue.shift()!;
      inProgress.add(inscriptionID);

      processInscription(inscriptionID).then((address) => {
        inProgress.delete(inscriptionID);
        if (address) {
          addresses.push(address);
        }
      });
    }

    // Small delay to prevent tight loop
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await fs.writeFile(outputFile, JSON.stringify(addresses, null, 2));
}

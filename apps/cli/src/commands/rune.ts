import { promises as fs } from "fs";
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

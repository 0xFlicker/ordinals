import { Command } from "commander";
import fs from "fs";
import { generateHTML } from "@0xflick/ordinals-axolotl-valley";
import { generatePrivateKey } from "./commands/generatePrivateKey.js";
import { testMintOrdinals } from "./commands/testMintOrdinal.js";
import { bulkMint } from "./commands/bulkMint.js";
import { mintSingle } from "./commands/mintSingle.js";
import { mintChild } from "./commands/mintChild.js";
import { nonceBitcoin, nonceEthereum } from "./commands/login/nonce.js";
import { siwe } from "./commands/login/siwe.js";
import { collectionCreate } from "./commands/collection/create.js";
import { bootstrap } from "./commands/bootstrap/index.js";
import { generateReceiverAddress } from "./commands/taproot.js";
import { findMalformedFunding } from "./commands/rescue/cmd.js";
import { allocateAirdrop, collectAddresses } from "./commands/rune.js";
import { mintChildMany } from "./commands/mintChildMany.js";
import { deployOpLockCat } from "./commands/op-lock-cat/deploy.js";
import { sendBitcoinToAddress } from "./commands/sendBitcoin.js";
const program = new Command();

program
  .command("privkey")
  .description("Generate a new private key")
  .action(() => {
    generatePrivateKey();
  });

program
  .command("receive")
  .description("Generate a tapscript address")
  .option("-n, --network <network>", "Bitcoin network", "regtest")
  .action(({ network }) => {
    generateReceiverAddress({ network });
  });

program
  .command("test-mint-ordinal <address>")
  .option("-n, --network <network>", "Bitcoin network", "regtest")
  .description("Mint an ordinal")
  .action(async (address, { network }) => {
    await testMintOrdinals({ address, network });
  });

program
  .command("mint <files...>")
  .option("-n, --network <network>", "Bitcoin network", "regtest")
  .option("-a, --address <address>", "Address to mint to")
  .option("-p, --padding <amount>", "Padding amount", Number, 546)
  .option("--parent-inscription <parent-inscription>", "Parent inscription")
  .option(
    "--parent-key <parent-key>",
    "Parent security key used to generate p2tr",
  )
  .option("--parent-txid <parent-txid>", "Parent txid")
  .option("--parent-index <parent-index>", "Parent index")
  .option(
    "--parent-destination-address <destination-parent-address>",
    "Destination parent address",
    "auto",
  )
  .option("--parent-amount <parent-amount>", "Parent amount")
  .option("-m, --mime-type <mime-type>", "Mime type of file")
  .option("-f, --fee-rate <fee-rate>", "Fee rate in satoshis per vbyte")
  .option("-w, --rpcwallet <wallet>", "Bitcoin Wallet name", "default")
  .option("-u, --rpcuser <rpcuser>", "Bitcoin RPC username")
  .option("-p, --rpcpassword <rpcpassword>", "Bitcoin RPC password")
  .option("--no-send", "Don't automatically pay")
  .option("-d, --metadata-file <metadata-file>", "Metadata file")
  .option(
    "--tip-destination-address <tip-destination-address>",
    "Tip destination address",
  )
  .option("--tip-amount <tip-amount>", "Tip amount")
  .option("--compress", "Compress the file")
  .description("Mint an ordinal")
  .action(
    async (
      files,
      {
        network,
        address,
        mimeType,
        feeRate,
        rpcpassword,
        rpcuser,
        rpcwallet,
        metadataFile,
        send,
        compress,
        padding,
        parentInscription,
        parentTxid,
        parentIndex,
        parentAmount,
        parentDestinationAddress,
        parentKey,
        tipDestinationAddress,
        tipAmount,
      },
    ) => {
      if (
        parentInscription &&
        parentIndex &&
        parentTxid &&
        parentDestinationAddress &&
        parentKey &&
        parentAmount
      ) {
        console.log("Minting child");
        await mintChildMany({
          files: typeof files === "string" ? [files] : files,
          network,
          address,
          mimeType,
          feeRate: Number(feeRate),
          rpcpassword,
          rpcuser,
          rpcwallet,
          noSend: !send,
          metadataFile,
          compress,
          padding: Number(padding),
          destinationParentAddress: parentDestinationAddress,
          parentInscription,
          parentIndex: Number(parentIndex),
          parentTxid,
          parentSecKey: parentKey,
          parentAmount: Number(parentAmount),
          tipDestinationAddress,
          tipAmount: Number(tipAmount),
        });
      } else {
        console.log("Minting single");
        await mintSingle({
          file: typeof files === "string" ? files : files[0],
          network,
          address,
          mimeType,
          feeRate,
          rpcpassword,
          rpcuser,
          rpcwallet,
          noSend: !send,
          metadataFile,
          compress,
          padding,
        });
      }
    },
  );

program
  .command("bulk-mint <address>, <glob>")
  .option("-n, --network <network>", "Bitcoin network", "regtest")
  .option("-f, --fee-rate <fee-rate>", "Fee rate in satoshis per vbyte", Number)
  .option("-o, --output <output>", "Output file")
  .option("-p, --privkey <privkey>", "Private key")
  .description("Mint ordinals in bulk")
  .action(async (address, glob, { network, output, privkey, feeRate }) => {
    await bulkMint({
      address,
      globStr: glob,
      feeRate,
      network,
      outputFile: output,
      privKey: privkey,
    });
  });

program
  .command("hex-to-text <hex>")
  .description("Convert hex to text")
  .action((hex) => {
    console.log(Buffer.from(hex, "hex").toString("utf8"));
  });

const apiCommand = program.command("api");
apiCommand
  .command("nonce <address>")
  .description("Get a nonce")
  .option("-u, --url <url>", "api url", "http://localhost:4000")
  .option(
    "-b, --blockchain <network>",
    "Blockchain network (ethereum | bitcoin)",
    (value) => {
      if (value !== "ethereum" && value !== "bitcoin") {
        throw new Error("Invalid blockchain network");
      }
      return value;
    },
    "bitcoin",
  )
  .option("-c, --chain-id <chain-id>", "Ethereum chain id", Number, 1)
  .action(async (address, props) => {
    const { blockchain, url, chainId } = props;
    if (blockchain === "bitcoin") {
      await nonceBitcoin({ address, url });
    } else {
      await nonceEthereum({ address, chainId, url });
    }
  });

apiCommand
  .command("siwe")
  .option("-u, --url <url>", "api url", "http://localhost:4000")
  .option("-c, --chain-id <chain-id>", "Ethereum chain id", Number, 1)
  .action(async ({ url, chainId }) => {
    const token = await siwe({
      chainId,
      url,
    });
    console.log(`Token: ${token}`);
  });

program
  .command("bootstrap")
  .option("-u, --url <url>", "api url", "http://localhost:4000")
  .option("-c, --chain-id <chain-id>", "Ethereum chain id", Number, 11155111)
  .option("-a, --admin-address <admin-address>", "Admin address")
  .action(async ({ url, chainId, adminAddress }) => {
    await bootstrap({
      url,
      chainId,
      adminAddress,
    });
  });

const collectionCommand = program.command("collection");

collectionCommand
  .command("create <name> <maxSupply>")
  .option("-u, --url <url>", "api url", "http://localhost:4000")
  .option(
    "-m, --metadata <metadata>",
    "metadata in key=value format. can be used multiple times",
  )
  .option("-s, --swie-login <chainid>", "login to the api")
  .option("-t, --token <token>", "token")
  .option("-d, --doc <doc>", "key=path format. load a file as the metadata")
  .action(async (name, maxSupply, { url, metadata, doc, swieLogin, token }) => {
    if (typeof token === "undefined") {
      console.log(`Resolving token`);
      token = swieLogin
        ? await siwe({
            chainId: Number(swieLogin),
            url,
          })
        : null;
    }
    console.log(`Resolving metadata`);
    metadata = Array.isArray(metadata)
      ? metadata
      : typeof metadata !== "undefined"
      ? [metadata]
      : [];
    if (doc) {
      console.log(`Resolving doc`);
      doc = Array.isArray(doc) ? doc : [doc];
      for (const d of doc) {
        const [key, docPath] = d.split("=");
        const data = await fs.promises.readFile(docPath, "utf8");
        metadata = metadata || [];
        metadata.push(`${key}=${data}`);
      }
    }
    console.log(`Creating collection`);
    await collectionCreate({
      name,
      maxSupply: Number(maxSupply),
      url,
      token,
      keyValues: metadata.map((m: string) => {
        const [key, value] = m.split("=");
        return [key, value] as const;
      }),
    });
  });

const recoverCommand = program.command("recover");
recoverCommand
  .command("find-unspendable-fundings <collectionId>")
  .option("-u, --url <url>", "api url", "http://localhost:4000")
  .option("--cache <file>", "cache file (optional, avoids hitting graphql)")
  .option("--write-file <file>", "write file (optional, writes to file)")
  .action(async (collectionId, { url, cache, writeFile }) => {
    const cachedResponse = cache
      ? JSON.parse(await fs.promises.readFile(cache, "utf8"))
      : undefined;
    await findMalformedFunding({
      collectionId,
      url,
      cachedResponse,
      writeFilePath: writeFile,
    });
  });

const runeCommand = program.command("rune");

runeCommand
  .command("collect-addresses <idsFile> <outputFile>")
  .action(async (idsFile, outputFile) => {
    await collectAddresses(idsFile, outputFile);
  });

runeCommand
  .command("allocate-airdrop <addressesFile> <outputFile>")
  .action(async (addressesFile, outputFile) => {
    await allocateAirdrop(addressesFile, outputFile);
  });

const deployCommand = program.command("deploy");
deployCommand
  .command("op-lock-cat <destination-address>")
  .option("-n, --network <network>", "Bitcoin network", "regtest")
  .option("-u, --rpcuser <rpcuser>", "Bitcoin RPC username")
  .option("-p, --rpcpassword <rpcpassword>", "Bitcoin RPC password")
  .option("-w, --rpcwallet <rpcwallet>", "Bitcoin Wallet name", "default")
  .option("-f, --fee-rate <fee-rate>", "Fee rate in satoshis per vbyte", Number)
  .option("--no-send", "Don't automatically pay")
  .description("Deploy op-lock-cat")
  .action(
    async (
      destinationAddress,
      { network, rpcuser, rpcpassword, rpcwallet, feeRate, noSend },
    ) => {
      await deployOpLockCat({
        destinationAddress,
        network,
        rpcuser,
        rpcpassword,
        rpcwallet,
        feeRate,
        noSend,
      });
    },
  );

program
  .command("send-bitcoin <address> <amount>")
  .option("-n, --network <network>", "Bitcoin network", "regtest")
  .option("-u, --rpcuser <rpcuser>", "Bitcoin RPC username")
  .option("-p, --rpcpassword <rpcpassword>", "Bitcoin RPC password")
  .option("-w, --rpcwallet <rpcwallet>", "Bitcoin Wallet name", "default")
  .option(
    "-f, --fee-rate <fee-rate>",
    "Fee rate in satoshis per vbyte",
    Number,
    1,
  )
  .option("-d, --bitcoin-data-dir <bitcoin-data-dir>", "Bitcoin data directory")
  .option("-g, --generate", "Generate a block after sending (regtest only)")
  .description("Send Bitcoin to an address")
  .action(
    async (
      address,
      amount,
      {
        network,
        rpcuser,
        rpcpassword,
        rpcwallet,
        feeRate,
        bitcoinDataDir,
        generate,
      },
    ) => {
      await sendBitcoinToAddress({
        address,
        amount: Number(amount),
        network,
        rpcuser,
        rpcpassword,
        rpcwallet,
        feeRate,
        bitcoinDataDir,
        generate,
      });
    },
  );

program.parse(process.argv);

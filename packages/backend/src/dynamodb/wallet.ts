import { ICustodialOrdinalWallet, UTXO } from "@0xflick/ordinals-models";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { MempoolClient } from "../index.js";
import { retryWithBackOff } from "../utils/retry.js";

export type TManagedWalletPrimary = {
  // id
  // for root wallet, this is the public address
  // for tracking transactions, this is input-tx-id:input-tx-vin:tx
  pk: string;
  // for root wallet, this is "root"
  // for tracking transactions, this is "id" or the public address of the wallet
  sk: string;
  // public address
  address: string;
  // user id
  userId: string;
  // private key
  privateKey: string;
};

export type TManagedWalletTransaction = {
  pk: string;
  sk: string;
  address: string;
  txid: string;
  vout: number;
  value: number;
};

function toManagedWalletPrimary(
  wallet: ICustodialOrdinalWallet,
): TManagedWalletPrimary {
  return {
    pk: wallet.address,
    sk: "WALLET",
    address: wallet.address,
    userId: wallet.userId,
    privateKey: wallet.privateKey,
  };
}

function toManagedWalletTransaction(
  wallet: ICustodialOrdinalWallet,
  transaction: { txid: string; vout: number; value: number },
): TManagedWalletTransaction {
  return {
    pk: wallet.address,
    sk: `TX#${transaction.txid}`,
    address: wallet.address,
    txid: transaction.txid,
    vout: transaction.vout,
    value: transaction.value,
  };
}

function toRootWalletModel(
  wallet: Record<string, any>,
): ICustodialOrdinalWallet {
  if (!wallet.address || !wallet.userId || !wallet.privateKey) {
    throw new Error("Invalid wallet");
  }
  if (
    typeof wallet.address !== "string" ||
    typeof wallet.userId !== "string" ||
    typeof wallet.privateKey !== "string"
  ) {
    throw new Error("Invalid wallet");
  }

  return {
    address: wallet.address,
    userId: wallet.userId,
    privateKey: wallet.privateKey,
  };
}

function toWalletTransactionModel(transaction: Record<string, any>): UTXO {
  if (!transaction.txid || !transaction.vout || !transaction.value) {
    throw new Error("Invalid transaction");
  }
  if (
    typeof transaction.txid !== "string" ||
    typeof transaction.vout !== "number" ||
    typeof transaction.value !== "number"
  ) {
    throw new Error("Invalid transaction");
  }

  return {
    txid: transaction.txid,
    vout: transaction.vout,
    value: transaction.value,
  };
}

async function toManagedWalletModel(
  mempoolClient: MempoolClient["bitcoin"],
  wallet: TManagedWalletPrimary,
  transactions: TManagedWalletTransaction[],
): Promise<ICustodialOrdinalWallet> {
  // Fetch transactions from mempool
  const unspentTransactions: ICustodialOrdinalWallet["unspentTransactions"] =
    [];
  const pendingTransactions: ICustodialOrdinalWallet["pendingTransactions"] =
    [];

  const problems: ICustodialOrdinalWallet["problems"] = [];

  const fetchTxStatus = async (txid: string) => {
    const txStatus = await mempoolClient.transactions.getTxStatus({
      txid,
    });
    return txStatus;
  };

  await Promise.all(
    transactions.map(async (t) => {
      try {
        const txStatus = await retryWithBackOff(
          () => fetchTxStatus(t.txid),
          3,
          500,
        );
        // Split into unspent and spent transactions based on txs[].confirmed
        if (txStatus.confirmed) {
          unspentTransactions.push({
            txid: t.txid,
            vout: t.vout,
            value: t.value,
          });
        } else {
          pendingTransactions.push({
            txid: t.txid,
            vout: t.vout,
            value: t.value,
          });
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          problems.push({
            code: "unable-to-fetch-tx-status",
            message: e.message,
            txid: t.txid,
            error: e as Error,
          });
        } else {
          problems.push({
            code: "unable-to-fetch-tx-status",
            message: "Unknown error",
            txid: t.txid,
          });
        }
      }
    }),
  );

  return {
    address: wallet.address,
    userId: wallet.userId,
    privateKey: wallet.privateKey,
    unspentTransactions,
    pendingTransactions,
    problems,
  };
}

export class WalletDAO {
  public static TABLE_NAME = "Wallet";

  private client: DynamoDBDocumentClient;

  constructor(client: DynamoDBClient) {
    this.client = DynamoDBDocumentClient.from(client);
  }

  public async createWallet(wallet: ICustodialOrdinalWallet) {
    await this.client.send(
      new PutCommand({
        TableName: WalletDAO.TABLE_NAME,
        Item: toManagedWalletPrimary(wallet),
        ConditionExpression:
          "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      }),
    );
  }

  public async addTransaction(
    walletAddress: string,
    transaction: { txid: string; vout: number; value: number },
  ) {
    await this.client.send(
      new PutCommand({
        TableName: WalletDAO.TABLE_NAME,
        Item: {
          pk: walletAddress,
          sk: `TX#${transaction.txid}`,
          txid: transaction.txid,
          vout: transaction.vout,
          value: transaction.value,
          status: "pending", // or "unspent", etc.
        },
        ConditionExpression:
          "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      }),
    );
  }

  private async getTransactionItems(walletAddress: string) {
    const result = await this.client.send(
      new QueryCommand({
        TableName: WalletDAO.TABLE_NAME,
        KeyConditionExpression:
          "pk = :walletAddress AND begins_with(sk, :txPrefix)",
        ExpressionAttributeValues: {
          ":walletAddress": walletAddress,
          ":txPrefix": "TX#",
        },
      }),
    );
    if (!result.Items) {
      throw new Error("Wallet not found");
    }
    return result.Items as TManagedWalletTransaction[];
  }

  public async getTransactions(walletAddress: string) {
    const items = await this.getTransactionItems(walletAddress);
    return items.map(toWalletTransactionModel);
  }

  private async getRootWalletItem(
    walletAddress: string,
  ): Promise<TManagedWalletPrimary> {
    const result = await this.client.send(
      new GetCommand({
        TableName: WalletDAO.TABLE_NAME,
        Key: { pk: walletAddress, sk: "WALLET" },
      }),
    );
    if (!result.Item) {
      throw new Error("Wallet not found");
    }
    return result.Item as TManagedWalletPrimary;
  }

  public async getRootWallet(
    walletAddress: string,
  ): Promise<ICustodialOrdinalWallet> {
    const rootWallet = await this.getRootWalletItem(walletAddress);
    return toRootWalletModel(rootWallet);
  }

  public async getWallet(
    mempoolClient: MempoolClient["bitcoin"],
    walletAddress: string,
  ): Promise<ICustodialOrdinalWallet> {
    const [transactions, rootWallet] = await Promise.all([
      this.getTransactionItems(walletAddress),
      this.getRootWalletItem(walletAddress),
    ]);
    return toManagedWalletModel(mempoolClient, rootWallet, transactions);
  }
}

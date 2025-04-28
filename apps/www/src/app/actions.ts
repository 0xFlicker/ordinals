"use serverr";
import { gql } from "graphql-tag";
import { createGraphqlClient } from "@/apiGraphql/client";
import { getSdk } from "./actions.generated";

gql`
  query getAppInfo {
    appInfo {
      pubKey
      issuer: name
    }
  }
`;

export async function appInfo() {
  const sdk = getSdk(
    createGraphqlClient({
      next: {
        // 1 day
        revalidate: 60 * 60 * 24,
      },
    })
  );
  const { appInfo } = await sdk.getAppInfo();
  return appInfo;
}

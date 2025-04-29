"use serverr";
import { gql } from "graphql-tag";
import { createGraphqlClient } from "@/apiGraphql/client";
import { getSdk } from "./actions.generated";
import { cookies } from "next/headers";
import { verifyJwtForLogin } from "@0xflick/ordinals-rbac-models";
import { importSPKIKey } from "@0xflick/ordinals-rbac-models";

gql`
  query getAppInfo {
    appInfo {
      pubKey
      issuer: name
    }
  }

  query getUser($id: ID!) {
    user(id: $id) {
      id
      addresses {
        address
        type
      }
      roles {
        id
        name
      }
      allowedActions {
        action
        resource
        identifier
      }
      token
      handle
    }
  }

  query getUserHandle($id: ID!) {
    user(id: $id) {
      handle
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
export async function getFullUser(id: string) {
  const sdk = getSdk(
    createGraphqlClient({
      next: {
        // 30 minutes
        revalidate: 60 * 30,
      },
    })
  );
  const { user } = await sdk.getUser({ id });
  return user;
}

export async function getUserHandle(id: string) {
  const user = await getFullUser(id);
  return user?.handle;
}

export async function getUserIdFromSession() {
  const cookieStore = cookies();
  const cookieName = "bitflick.session";
  const session = cookieStore.get(cookieName);
  const token = session?.value;
  if (!token) {
    return null;
  }
  const { pubKey } = await appInfo();
  const { userId } = await verifyJwtForLogin(
    token,
    await importSPKIKey(pubKey)
  );
  return userId;
}

import { GraphQLClient } from "graphql-request";
import { graphqlEndpoint } from "@/utils/config";
import { cookies } from "next/headers";
import { parse } from "cookie";

export function createGraphqlClient({
  requestConfig,
  token,
}: {
  requestConfig?: RequestInit;
  token?: string;
  next?: NextFetchRequestConfig;
} = {}) {
  const requestConfigNotMethod = {
    ...requestConfig,
    method: undefined,
  };
  if (token) {
    requestConfigNotMethod.headers = {
      ...requestConfigNotMethod.headers,
      authorization: `Bearer ${token}`,
    };
  }

  return new GraphQLClient(graphqlEndpoint.get(), {
    fetch: async (url, options) =>
      fetch(url, {
        ...options,
        ...(options?.next
          ? {}
          : {
              next: {
                revalidate: 30,
              },
            }),
      }),
    ...requestConfigNotMethod,
  });
}

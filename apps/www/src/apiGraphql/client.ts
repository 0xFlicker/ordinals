import { GraphQLClient } from "graphql-request";
import { graphqlEndpoint } from "@/utils/config";

export function createGraphqlClient() {
  return new GraphQLClient(graphqlEndpoint.get(), {
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        next: {
          revalidate: 30,
        },
      });
    },
  });
}

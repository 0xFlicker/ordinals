import { ApolloClient, InMemoryCache } from "@apollo/client";
// import possibleTypes from "./graphql.schema.json"

// const cache = new InMemoryCache({
//   possibleTypes: possibleTypes,
// });

export const client = new ApolloClient({
  uri: "/graphql",
  // fragmentMatcher: new IntrospectionFragmentMatcher({
  //   introspectionQueryResultData: {} as any,
  // }),
  credentials: "include",
  cache: new InMemoryCache(),
});

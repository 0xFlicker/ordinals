import { FC, PropsWithChildren } from "react";
import { Provider as ApolloProvider } from "@/graphql/Provider";

export const DefaultProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  return <ApolloProvider>{children}</ApolloProvider>;
};

import { useMemo } from "react";
import { useGetSelfQuery } from "./getSelf.generated";
import { Web3Namespace } from "@/graphql/types";

export const useSelf = ({
  namespace,
  skip,
}: {
  namespace?: Web3Namespace;
  skip?: boolean;
}) => {
  const { data, ...rest } = useGetSelfQuery({
    skip,
    fetchPolicy: "no-cache",
    errorPolicy: "all",
    variables: {
      namespace: namespace ?? Web3Namespace.Siwe,
    },
  });

  const self = useMemo(
    () =>
      data && data.self
        ? {
            roleIds: data.self.roles?.map((role) => role.id) ?? [],
            allowedActions: data.self.allowedActions,
            token: data.self.token,
          }
        : undefined,
    [data]
  );

  const isLoggedIn = useMemo(() => !!self, [self]);

  return {
    data: self,
    isLoggedIn,
    ...rest,
  };
};

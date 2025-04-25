import { useMemo } from "react";
import { graphQlAllowedActionToPermission } from "../transforms/allowedActions";
import { useGetSelfPermissionsQuery } from "./getSelfPermissions.generated";
import { Web3Namespace } from "@/graphql/types";

export const useAllowedActions = ({
  namespace,
  skip,
}: {
  namespace?: Web3Namespace;
  skip?: boolean;
}) => {
  const response = useGetSelfPermissionsQuery({
    skip,
    // fetchPolicy: "no-cache",
    variables: {
      namespace: namespace ?? Web3Namespace.Siwe,
    },
  });

  const allowedActions = useMemo(
    () =>
      response?.data?.self?.allowedActions.map(
        graphQlAllowedActionToPermission
      ),
    [response]
  );

  return {
    ...response,
    allowedActions,
  };
};

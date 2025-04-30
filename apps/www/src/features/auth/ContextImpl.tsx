import { Dispatch, useCallback, useContext, useEffect, useMemo } from "react";
import { TUser, actions, initialState } from "./ducks";
import { AnyAction } from "@reduxjs/toolkit";
import gql from "graphql-tag";
import { useAuthSelfQuery } from "./ContextImpl.generated";
import { mapSelfToUser, TFullUser } from "@/utils/transforms";

gql`
  query AuthSelf {
    self {
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
`;

export const useAuthImpl = ({
  dispatch,
  state,
  user: initialUser,
}: {
  dispatch: Dispatch<AnyAction>;
  state: typeof initialState;
  user?: TFullUser;
}) => {
  const { data: dataAuthSelf } = useAuthSelfQuery({
    skip: !!initialUser,
  });

  useEffect(() => {
    if (dataAuthSelf?.self) {
      dispatch(actions.userAccepted(mapSelfToUser(dataAuthSelf.self)));
    } else if (initialUser) {
      dispatch(actions.userAccepted(initialUser));
    }
  }, [initialUser, dataAuthSelf, dispatch]);

  const userRequested = useCallback(() => {
    dispatch(actions.userRequested());
  }, [dispatch]);

  const userAccepted = useCallback(
    (user: TUser) => {
      dispatch(actions.userAccepted(user));
    },
    [dispatch]
  );

  const userRejected = useCallback(
    (error: string) => {
      dispatch(actions.userRejected(error));
    },
    [dispatch]
  );

  return {
    userRequested,
    userAccepted,
    userRejected,
    ...state,
  };
};

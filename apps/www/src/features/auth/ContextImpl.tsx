import { useCallback, useEffect } from "react";
import { Dispatch } from "react";
import gql from "graphql-tag";
import {
  useAuthSelfQuery,
  useAuthSignUpAnonymouslyMutation,
  useAuthSiwbSignInMutation,
  useAuthSiweSignInMutation,
  useLinkVerifiedAddressMutation,
} from "./ContextImpl.generated";
import { actions, initialState } from "./ducks";
import { mapSelfToUser, TFullUser } from "@/utils/transforms";
import { AnyAction } from "@reduxjs/toolkit";
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
  mutation AuthSignUpAnonymously($request: SignUpAnonymouslyRequest!) {
    signUpAnonymously(request: $request) {
      user {
        id
        handle
        token
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
      }
      problems {
        message
      }
    }
  }
  mutation AuthBtcNonce($address: ID!) {
    nonceBitcoin(address: $address) {
      nonce
      messageToSign
      pubKey
    }
  }
  mutation AuthEvmNonce($address: ID!, $chainId: Int!) {
    nonceEthereum(address: $address, chainId: $chainId) {
      nonce
      messageToSign
      pubKey
    }
  }
  mutation AuthSiweSignIn($address: ID!, $jwe: String!) {
    siwe(address: $address, jwe: $jwe) {
      data {
        token
        user {
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
          handle
        }
        type
      }
      problems {
        message
      }
    }
  }
  mutation AuthSiwbSignIn($address: ID!, $jwe: String!) {
    siwb(address: $address, jwe: $jwe) {
      data {
        token
        user {
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
          handle
        }
        type
      }
      problems {
        message
      }
    }
  }
  mutation LinkVerifiedAddress(
    $user: ID!
    $request: LinkVerifiedAddressRequest!
  ) {
    user(id: $user) {
      linkVerifiedAddress(request: $request) {
        id
        handle
        token
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
      }
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
  // --- rehydrate session ---
  const {
    data: selfData,
    loading: selfLoading,
    error: selfError,
  } = useAuthSelfQuery({ skip: !!initialUser, fetchPolicy: "network-only" });

  useEffect(() => {
    dispatch(actions.userRequested());
    if (initialUser) {
      dispatch(actions.userAccepted(initialUser));
    } else if (selfData?.self) {
      dispatch(actions.userAccepted(mapSelfToUser(selfData.self)));
    }
  }, [initialUser, selfData, dispatch]);

  // --- GraphQL mutations ---
  const [signUpAnon] = useAuthSignUpAnonymouslyMutation();
  const [loginSiwb] = useAuthSiwbSignInMutation();
  const [loginSiwe] = useAuthSiweSignInMutation();
  const [linkVerified] = useLinkVerifiedAddressMutation();

  // --- unified sign-in (SIWB / SIWE) ---
  const signInWithSiwb = useCallback(
    async (address: string, jwe: string) => {
      dispatch(actions.signInRequested());
      const resp = await loginSiwb({ variables: { address, jwe } });
      const problems = resp.data?.siwb.problems;
      if (problems?.length) {
        dispatch(actions.signInFailed(problems[0].message));
        throw new Error(problems[0].message);
      }
      const data = resp.data!.siwb.data!;
      const user = data.user ? mapSelfToUser(data.user) : undefined;
      const token = data.token;
      if (!token) {
        throw new Error("No token returned from SIWB login");
      }
      dispatch(
        actions.signInSucceeded({
          type: data.type,
          token,
          user,
        })
      );
      return { user, token: data.token, type: data.type };
    },
    [dispatch, loginSiwb]
  );

  const signInWithSiwe = useCallback(
    async (address: string, jwe: string) => {
      dispatch(actions.signInRequested());
      const resp = await loginSiwe({ variables: { address, jwe } });
      const problems = resp.data?.siwe.problems;
      if (problems?.length) {
        dispatch(actions.signInFailed(problems[0].message));
        throw new Error(problems[0].message);
      }
      const data = resp.data!.siwe.data!;
      const user = data.user ? mapSelfToUser(data.user) : undefined;

      const token = data.token;
      if (!token) {
        throw new Error("No token returned from SIWE login");
      }
      dispatch(
        actions.signInSucceeded({
          type: data.type,
          token,
          user,
        })
      );
      return { user, token: data.token, type: data.type };
    },
    [dispatch, loginSiwe]
  );

  // --- sign up anonymously and create real user ---
  const signUpAnonymously = useCallback(
    async ({ handle, token }: { handle: string; token: string }) => {
      dispatch(actions.signInRequested());
      const resp = await signUpAnon({
        variables: { request: { handle, token } },
      });
      const problems = resp.data?.signUpAnonymously.problems;
      if (problems?.length) {
        dispatch(actions.signInFailed(problems[0].message));
        throw new Error(problems[0].message);
      }
      const userData = resp.data!.signUpAnonymously.user!;
      const user = mapSelfToUser(userData);
      const newToken = userData.token;
      if (!newToken) {
        throw new Error("No token returned from sign up anonymously");
      }
      dispatch(
        actions.signInSucceeded({
          type: "EXISTING_USER",
          token: newToken,
          user,
        })
      );
      return { user, token: newToken };
    },
    [dispatch, signUpAnon]
  );

  // — Link a newly-verified address into an existing session
  const linkVerifiedAddress = useCallback(
    async ({
      address,
      jweSiwb,
      jweSiwe,
    }: {
      address: string;
      jweSiwb?: string;
      jweSiwe?: string;
    }) => {
      const userId = state.userId;
      if (!userId) {
        throw new Error("No user in state");
      }
      if (!jweSiwb && !jweSiwe) {
        throw new Error("No JWE provided");
      }
      const resp = await linkVerified({
        variables: {
          user: userId,
          request: { address, siwbJwe: jweSiwb, siweJwe: jweSiwe },
        },
      });
      const updatedUser = resp.data!.user.linkVerifiedAddress
        ? mapSelfToUser(resp.data!.user.linkVerifiedAddress)
        : undefined;
      if (!updatedUser) {
        throw new Error("No user data returned from link verified address");
      }
      const token = resp.data!.user.linkVerifiedAddress?.token;
      if (!token) {
        throw new Error("No token returned from link verified address");
      }
      dispatch(actions.addAddressConfirmed(updatedUser));
      return {
        user: updatedUser,
        token,
      };
    },
    [dispatch, linkVerified, state.userId]
  );

  const linkVerifiedAddressEvm = useCallback(
    async (address: string, jwe: string) => {
      return await linkVerifiedAddress({ address, jweSiwe: jwe });
    },
    [linkVerifiedAddress]
  );

  const linkVerifiedAddressBtc = useCallback(
    async (address: string, jwe: string) => {
      return await linkVerifiedAddress({ address, jweSiwb: jwe });
    },
    [linkVerifiedAddress]
  );

  return {
    // state
    ...state,
    selfLoading,
    selfError,

    // methods
    signInWithSiwb,
    signInWithSiwe,
    signUpAnonymously,
    linkVerifiedAddress,
    linkVerifiedAddressEvm,
    linkVerifiedAddressBtc,
  };
};

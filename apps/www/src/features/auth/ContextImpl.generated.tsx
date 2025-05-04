import type * as Types from '../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AuthSelfQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type AuthSelfQuery = { __typename?: 'Query', self?: { __typename?: 'Web3User', id: string, token?: string | null, handle: string, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } | null };

export type AuthSignUpAnonymouslyMutationVariables = Types.Exact<{
  request: Types.SignUpAnonymouslyRequest;
}>;


export type AuthSignUpAnonymouslyMutation = { __typename?: 'Mutation', signUpAnonymously: { __typename?: 'SignUpAnonymouslyResponse', user?: { __typename?: 'Web3User', id: string, handle: string, token?: string | null, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } | null, problems?: Array<{ __typename?: 'AuthProblem', message: string }> | null } };

export type AuthBtcNonceMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
}>;


export type AuthBtcNonceMutation = { __typename?: 'Mutation', nonceBitcoin: { __typename?: 'Nonce', nonce: string, messageToSign: string, pubKey: string } };

export type AuthEvmNonceMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  chainId: Types.Scalars['Int']['input'];
}>;


export type AuthEvmNonceMutation = { __typename?: 'Mutation', nonceEthereum: { __typename?: 'Nonce', nonce: string, messageToSign: string, pubKey: string } };

export type AuthSiweSignInMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  jwe: Types.Scalars['String']['input'];
}>;


export type AuthSiweSignInMutation = { __typename?: 'Mutation', siwe: { __typename?: 'SiweResponse', data?: { __typename?: 'SiweData', token: string, type: Types.SiweResponseType, user?: { __typename?: 'Web3User', id: string, handle: string, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } | null } | null, problems?: Array<{ __typename?: 'AuthProblem', message: string }> | null } };

export type AuthSiwbSignInMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  jwe: Types.Scalars['String']['input'];
}>;


export type AuthSiwbSignInMutation = { __typename?: 'Mutation', siwb: { __typename?: 'SiwbResponse', data?: { __typename?: 'SiwbData', token: string, type: Types.SiweResponseType, user?: { __typename?: 'Web3User', id: string, handle: string, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } | null } | null, problems?: Array<{ __typename?: 'AuthProblem', message: string }> | null } };

export type LinkVerifiedAddressMutationVariables = Types.Exact<{
  user: Types.Scalars['ID']['input'];
  request: Types.LinkVerifiedAddressRequest;
}>;


export type LinkVerifiedAddressMutation = { __typename?: 'Mutation', user: { __typename?: 'Web3User', linkVerifiedAddress: { __typename?: 'Web3User', id: string, handle: string, token?: string | null, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } } };


export const AuthSelfDocument = gql`
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

/**
 * __useAuthSelfQuery__
 *
 * To run a query within a React component, call `useAuthSelfQuery` and pass it any options that fit your needs.
 * When your component renders, `useAuthSelfQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAuthSelfQuery({
 *   variables: {
 *   },
 * });
 */
export function useAuthSelfQuery(baseOptions?: Apollo.QueryHookOptions<AuthSelfQuery, AuthSelfQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AuthSelfQuery, AuthSelfQueryVariables>(AuthSelfDocument, options);
      }
export function useAuthSelfLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AuthSelfQuery, AuthSelfQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AuthSelfQuery, AuthSelfQueryVariables>(AuthSelfDocument, options);
        }
export type AuthSelfQueryHookResult = ReturnType<typeof useAuthSelfQuery>;
export type AuthSelfLazyQueryHookResult = ReturnType<typeof useAuthSelfLazyQuery>;
export type AuthSelfQueryResult = Apollo.QueryResult<AuthSelfQuery, AuthSelfQueryVariables>;
export const AuthSignUpAnonymouslyDocument = gql`
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
    `;
export type AuthSignUpAnonymouslyMutationFn = Apollo.MutationFunction<AuthSignUpAnonymouslyMutation, AuthSignUpAnonymouslyMutationVariables>;

/**
 * __useAuthSignUpAnonymouslyMutation__
 *
 * To run a mutation, you first call `useAuthSignUpAnonymouslyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAuthSignUpAnonymouslyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [authSignUpAnonymouslyMutation, { data, loading, error }] = useAuthSignUpAnonymouslyMutation({
 *   variables: {
 *      request: // value for 'request'
 *   },
 * });
 */
export function useAuthSignUpAnonymouslyMutation(baseOptions?: Apollo.MutationHookOptions<AuthSignUpAnonymouslyMutation, AuthSignUpAnonymouslyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AuthSignUpAnonymouslyMutation, AuthSignUpAnonymouslyMutationVariables>(AuthSignUpAnonymouslyDocument, options);
      }
export type AuthSignUpAnonymouslyMutationHookResult = ReturnType<typeof useAuthSignUpAnonymouslyMutation>;
export type AuthSignUpAnonymouslyMutationResult = Apollo.MutationResult<AuthSignUpAnonymouslyMutation>;
export type AuthSignUpAnonymouslyMutationOptions = Apollo.BaseMutationOptions<AuthSignUpAnonymouslyMutation, AuthSignUpAnonymouslyMutationVariables>;
export const AuthBtcNonceDocument = gql`
    mutation AuthBtcNonce($address: ID!) {
  nonceBitcoin(address: $address) {
    nonce
    messageToSign
    pubKey
  }
}
    `;
export type AuthBtcNonceMutationFn = Apollo.MutationFunction<AuthBtcNonceMutation, AuthBtcNonceMutationVariables>;

/**
 * __useAuthBtcNonceMutation__
 *
 * To run a mutation, you first call `useAuthBtcNonceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAuthBtcNonceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [authBtcNonceMutation, { data, loading, error }] = useAuthBtcNonceMutation({
 *   variables: {
 *      address: // value for 'address'
 *   },
 * });
 */
export function useAuthBtcNonceMutation(baseOptions?: Apollo.MutationHookOptions<AuthBtcNonceMutation, AuthBtcNonceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AuthBtcNonceMutation, AuthBtcNonceMutationVariables>(AuthBtcNonceDocument, options);
      }
export type AuthBtcNonceMutationHookResult = ReturnType<typeof useAuthBtcNonceMutation>;
export type AuthBtcNonceMutationResult = Apollo.MutationResult<AuthBtcNonceMutation>;
export type AuthBtcNonceMutationOptions = Apollo.BaseMutationOptions<AuthBtcNonceMutation, AuthBtcNonceMutationVariables>;
export const AuthEvmNonceDocument = gql`
    mutation AuthEvmNonce($address: ID!, $chainId: Int!) {
  nonceEthereum(address: $address, chainId: $chainId) {
    nonce
    messageToSign
    pubKey
  }
}
    `;
export type AuthEvmNonceMutationFn = Apollo.MutationFunction<AuthEvmNonceMutation, AuthEvmNonceMutationVariables>;

/**
 * __useAuthEvmNonceMutation__
 *
 * To run a mutation, you first call `useAuthEvmNonceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAuthEvmNonceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [authEvmNonceMutation, { data, loading, error }] = useAuthEvmNonceMutation({
 *   variables: {
 *      address: // value for 'address'
 *      chainId: // value for 'chainId'
 *   },
 * });
 */
export function useAuthEvmNonceMutation(baseOptions?: Apollo.MutationHookOptions<AuthEvmNonceMutation, AuthEvmNonceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AuthEvmNonceMutation, AuthEvmNonceMutationVariables>(AuthEvmNonceDocument, options);
      }
export type AuthEvmNonceMutationHookResult = ReturnType<typeof useAuthEvmNonceMutation>;
export type AuthEvmNonceMutationResult = Apollo.MutationResult<AuthEvmNonceMutation>;
export type AuthEvmNonceMutationOptions = Apollo.BaseMutationOptions<AuthEvmNonceMutation, AuthEvmNonceMutationVariables>;
export const AuthSiweSignInDocument = gql`
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
    `;
export type AuthSiweSignInMutationFn = Apollo.MutationFunction<AuthSiweSignInMutation, AuthSiweSignInMutationVariables>;

/**
 * __useAuthSiweSignInMutation__
 *
 * To run a mutation, you first call `useAuthSiweSignInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAuthSiweSignInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [authSiweSignInMutation, { data, loading, error }] = useAuthSiweSignInMutation({
 *   variables: {
 *      address: // value for 'address'
 *      jwe: // value for 'jwe'
 *   },
 * });
 */
export function useAuthSiweSignInMutation(baseOptions?: Apollo.MutationHookOptions<AuthSiweSignInMutation, AuthSiweSignInMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AuthSiweSignInMutation, AuthSiweSignInMutationVariables>(AuthSiweSignInDocument, options);
      }
export type AuthSiweSignInMutationHookResult = ReturnType<typeof useAuthSiweSignInMutation>;
export type AuthSiweSignInMutationResult = Apollo.MutationResult<AuthSiweSignInMutation>;
export type AuthSiweSignInMutationOptions = Apollo.BaseMutationOptions<AuthSiweSignInMutation, AuthSiweSignInMutationVariables>;
export const AuthSiwbSignInDocument = gql`
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
    `;
export type AuthSiwbSignInMutationFn = Apollo.MutationFunction<AuthSiwbSignInMutation, AuthSiwbSignInMutationVariables>;

/**
 * __useAuthSiwbSignInMutation__
 *
 * To run a mutation, you first call `useAuthSiwbSignInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAuthSiwbSignInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [authSiwbSignInMutation, { data, loading, error }] = useAuthSiwbSignInMutation({
 *   variables: {
 *      address: // value for 'address'
 *      jwe: // value for 'jwe'
 *   },
 * });
 */
export function useAuthSiwbSignInMutation(baseOptions?: Apollo.MutationHookOptions<AuthSiwbSignInMutation, AuthSiwbSignInMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AuthSiwbSignInMutation, AuthSiwbSignInMutationVariables>(AuthSiwbSignInDocument, options);
      }
export type AuthSiwbSignInMutationHookResult = ReturnType<typeof useAuthSiwbSignInMutation>;
export type AuthSiwbSignInMutationResult = Apollo.MutationResult<AuthSiwbSignInMutation>;
export type AuthSiwbSignInMutationOptions = Apollo.BaseMutationOptions<AuthSiwbSignInMutation, AuthSiwbSignInMutationVariables>;
export const LinkVerifiedAddressDocument = gql`
    mutation LinkVerifiedAddress($user: ID!, $request: LinkVerifiedAddressRequest!) {
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
export type LinkVerifiedAddressMutationFn = Apollo.MutationFunction<LinkVerifiedAddressMutation, LinkVerifiedAddressMutationVariables>;

/**
 * __useLinkVerifiedAddressMutation__
 *
 * To run a mutation, you first call `useLinkVerifiedAddressMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkVerifiedAddressMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkVerifiedAddressMutation, { data, loading, error }] = useLinkVerifiedAddressMutation({
 *   variables: {
 *      user: // value for 'user'
 *      request: // value for 'request'
 *   },
 * });
 */
export function useLinkVerifiedAddressMutation(baseOptions?: Apollo.MutationHookOptions<LinkVerifiedAddressMutation, LinkVerifiedAddressMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkVerifiedAddressMutation, LinkVerifiedAddressMutationVariables>(LinkVerifiedAddressDocument, options);
      }
export type LinkVerifiedAddressMutationHookResult = ReturnType<typeof useLinkVerifiedAddressMutation>;
export type LinkVerifiedAddressMutationResult = Apollo.MutationResult<LinkVerifiedAddressMutation>;
export type LinkVerifiedAddressMutationOptions = Apollo.BaseMutationOptions<LinkVerifiedAddressMutation, LinkVerifiedAddressMutationVariables>;
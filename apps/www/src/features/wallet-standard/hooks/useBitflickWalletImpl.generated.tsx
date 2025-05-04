import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type BitflickSelfQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type BitflickSelfQuery = { __typename?: 'Query', self?: { __typename?: 'Web3User', id: string, token?: string | null, handle: string, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } | null };

export type BitflickBtcNonceMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
}>;


export type BitflickBtcNonceMutation = { __typename?: 'Mutation', nonceBitcoin: { __typename?: 'Nonce', nonce: string, messageToSign: string, pubKey: string } };

export type BitflickEvmNonceMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  chainId: Types.Scalars['Int']['input'];
}>;


export type BitflickEvmNonceMutation = { __typename?: 'Mutation', nonceEthereum: { __typename?: 'Nonce', nonce: string, messageToSign: string, pubKey: string } };


export const BitflickSelfDocument = gql`
    query BitflickSelf {
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
 * __useBitflickSelfQuery__
 *
 * To run a query within a React component, call `useBitflickSelfQuery` and pass it any options that fit your needs.
 * When your component renders, `useBitflickSelfQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBitflickSelfQuery({
 *   variables: {
 *   },
 * });
 */
export function useBitflickSelfQuery(baseOptions?: Apollo.QueryHookOptions<BitflickSelfQuery, BitflickSelfQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BitflickSelfQuery, BitflickSelfQueryVariables>(BitflickSelfDocument, options);
      }
export function useBitflickSelfLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BitflickSelfQuery, BitflickSelfQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BitflickSelfQuery, BitflickSelfQueryVariables>(BitflickSelfDocument, options);
        }
export type BitflickSelfQueryHookResult = ReturnType<typeof useBitflickSelfQuery>;
export type BitflickSelfLazyQueryHookResult = ReturnType<typeof useBitflickSelfLazyQuery>;
export type BitflickSelfQueryResult = Apollo.QueryResult<BitflickSelfQuery, BitflickSelfQueryVariables>;
export const BitflickBtcNonceDocument = gql`
    mutation BitflickBtcNonce($address: ID!) {
  nonceBitcoin(address: $address) {
    nonce
    messageToSign
    pubKey
  }
}
    `;
export type BitflickBtcNonceMutationFn = Apollo.MutationFunction<BitflickBtcNonceMutation, BitflickBtcNonceMutationVariables>;

/**
 * __useBitflickBtcNonceMutation__
 *
 * To run a mutation, you first call `useBitflickBtcNonceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBitflickBtcNonceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [bitflickBtcNonceMutation, { data, loading, error }] = useBitflickBtcNonceMutation({
 *   variables: {
 *      address: // value for 'address'
 *   },
 * });
 */
export function useBitflickBtcNonceMutation(baseOptions?: Apollo.MutationHookOptions<BitflickBtcNonceMutation, BitflickBtcNonceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BitflickBtcNonceMutation, BitflickBtcNonceMutationVariables>(BitflickBtcNonceDocument, options);
      }
export type BitflickBtcNonceMutationHookResult = ReturnType<typeof useBitflickBtcNonceMutation>;
export type BitflickBtcNonceMutationResult = Apollo.MutationResult<BitflickBtcNonceMutation>;
export type BitflickBtcNonceMutationOptions = Apollo.BaseMutationOptions<BitflickBtcNonceMutation, BitflickBtcNonceMutationVariables>;
export const BitflickEvmNonceDocument = gql`
    mutation BitflickEvmNonce($address: ID!, $chainId: Int!) {
  nonceEthereum(address: $address, chainId: $chainId) {
    nonce
    messageToSign
    pubKey
  }
}
    `;
export type BitflickEvmNonceMutationFn = Apollo.MutationFunction<BitflickEvmNonceMutation, BitflickEvmNonceMutationVariables>;

/**
 * __useBitflickEvmNonceMutation__
 *
 * To run a mutation, you first call `useBitflickEvmNonceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBitflickEvmNonceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [bitflickEvmNonceMutation, { data, loading, error }] = useBitflickEvmNonceMutation({
 *   variables: {
 *      address: // value for 'address'
 *      chainId: // value for 'chainId'
 *   },
 * });
 */
export function useBitflickEvmNonceMutation(baseOptions?: Apollo.MutationHookOptions<BitflickEvmNonceMutation, BitflickEvmNonceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BitflickEvmNonceMutation, BitflickEvmNonceMutationVariables>(BitflickEvmNonceDocument, options);
      }
export type BitflickEvmNonceMutationHookResult = ReturnType<typeof useBitflickEvmNonceMutation>;
export type BitflickEvmNonceMutationResult = Apollo.MutationResult<BitflickEvmNonceMutation>;
export type BitflickEvmNonceMutationOptions = Apollo.BaseMutationOptions<BitflickEvmNonceMutation, BitflickEvmNonceMutationVariables>;
import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type Web3SiweSignInMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  jwe: Types.Scalars['String']['input'];
}>;


export type Web3SiweSignInMutation = { __typename?: 'Mutation', siwe: { __typename?: 'Web3LoginUser', token: string } };

export type Web3SiwbSignInMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  jwe: Types.Scalars['String']['input'];
}>;


export type Web3SiwbSignInMutation = { __typename?: 'Mutation', siwb: { __typename?: 'Web3LoginUser', token: string } };


export const Web3SiweSignInDocument = gql`
    mutation Web3SiweSignIn($address: ID!, $jwe: String!) {
  siwe(address: $address, jwe: $jwe) {
    token
  }
}
    `;
export type Web3SiweSignInMutationFn = Apollo.MutationFunction<Web3SiweSignInMutation, Web3SiweSignInMutationVariables>;

/**
 * __useWeb3SiweSignInMutation__
 *
 * To run a mutation, you first call `useWeb3SiweSignInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWeb3SiweSignInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [web3SiweSignInMutation, { data, loading, error }] = useWeb3SiweSignInMutation({
 *   variables: {
 *      address: // value for 'address'
 *      jwe: // value for 'jwe'
 *   },
 * });
 */
export function useWeb3SiweSignInMutation(baseOptions?: Apollo.MutationHookOptions<Web3SiweSignInMutation, Web3SiweSignInMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Web3SiweSignInMutation, Web3SiweSignInMutationVariables>(Web3SiweSignInDocument, options);
      }
export type Web3SiweSignInMutationHookResult = ReturnType<typeof useWeb3SiweSignInMutation>;
export type Web3SiweSignInMutationResult = Apollo.MutationResult<Web3SiweSignInMutation>;
export type Web3SiweSignInMutationOptions = Apollo.BaseMutationOptions<Web3SiweSignInMutation, Web3SiweSignInMutationVariables>;
export const Web3SiwbSignInDocument = gql`
    mutation Web3SiwbSignIn($address: ID!, $jwe: String!) {
  siwb(address: $address, jwe: $jwe) {
    token
  }
}
    `;
export type Web3SiwbSignInMutationFn = Apollo.MutationFunction<Web3SiwbSignInMutation, Web3SiwbSignInMutationVariables>;

/**
 * __useWeb3SiwbSignInMutation__
 *
 * To run a mutation, you first call `useWeb3SiwbSignInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWeb3SiwbSignInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [web3SiwbSignInMutation, { data, loading, error }] = useWeb3SiwbSignInMutation({
 *   variables: {
 *      address: // value for 'address'
 *      jwe: // value for 'jwe'
 *   },
 * });
 */
export function useWeb3SiwbSignInMutation(baseOptions?: Apollo.MutationHookOptions<Web3SiwbSignInMutation, Web3SiwbSignInMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Web3SiwbSignInMutation, Web3SiwbSignInMutationVariables>(Web3SiwbSignInDocument, options);
      }
export type Web3SiwbSignInMutationHookResult = ReturnType<typeof useWeb3SiwbSignInMutation>;
export type Web3SiwbSignInMutationResult = Apollo.MutationResult<Web3SiwbSignInMutation>;
export type Web3SiwbSignInMutationOptions = Apollo.BaseMutationOptions<Web3SiwbSignInMutation, Web3SiwbSignInMutationVariables>;
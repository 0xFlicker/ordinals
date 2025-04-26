import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type BitcoinNonceMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
}>;


export type BitcoinNonceMutation = { __typename?: 'Mutation', nonceBitcoin: { __typename?: 'Nonce', nonce: string, messageToSign: string, pubKey: string } };

export type SiwbMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  jwe: Types.Scalars['String']['input'];
}>;


export type SiwbMutation = { __typename?: 'Mutation', siwb: { __typename?: 'SignatureResponse', token?: string | null } };

export type SignupBitcoinMutationVariables = Types.Exact<{
  address: Types.Scalars['ID']['input'];
  jwe: Types.Scalars['String']['input'];
}>;


export type SignupBitcoinMutation = { __typename?: 'Mutation', signupBitcoin: { __typename?: 'SignupBitcoinResponse', user?: { __typename?: 'Web3User', id: string, token?: string | null } | null } };


export const BitcoinNonceDocument = gql`
    mutation BitcoinNonce($address: ID!) {
  nonceBitcoin(address: $address) {
    nonce
    messageToSign
    pubKey
  }
}
    `;
export type BitcoinNonceMutationFn = Apollo.MutationFunction<BitcoinNonceMutation, BitcoinNonceMutationVariables>;

/**
 * __useBitcoinNonceMutation__
 *
 * To run a mutation, you first call `useBitcoinNonceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBitcoinNonceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [bitcoinNonceMutation, { data, loading, error }] = useBitcoinNonceMutation({
 *   variables: {
 *      address: // value for 'address'
 *   },
 * });
 */
export function useBitcoinNonceMutation(baseOptions?: Apollo.MutationHookOptions<BitcoinNonceMutation, BitcoinNonceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BitcoinNonceMutation, BitcoinNonceMutationVariables>(BitcoinNonceDocument, options);
      }
export type BitcoinNonceMutationHookResult = ReturnType<typeof useBitcoinNonceMutation>;
export type BitcoinNonceMutationResult = Apollo.MutationResult<BitcoinNonceMutation>;
export type BitcoinNonceMutationOptions = Apollo.BaseMutationOptions<BitcoinNonceMutation, BitcoinNonceMutationVariables>;
export const SiwbDocument = gql`
    mutation SIWB($address: ID!, $jwe: String!) {
  siwb(address: $address, jwe: $jwe) {
    token
  }
}
    `;
export type SiwbMutationFn = Apollo.MutationFunction<SiwbMutation, SiwbMutationVariables>;

/**
 * __useSiwbMutation__
 *
 * To run a mutation, you first call `useSiwbMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSiwbMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [siwbMutation, { data, loading, error }] = useSiwbMutation({
 *   variables: {
 *      address: // value for 'address'
 *      jwe: // value for 'jwe'
 *   },
 * });
 */
export function useSiwbMutation(baseOptions?: Apollo.MutationHookOptions<SiwbMutation, SiwbMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SiwbMutation, SiwbMutationVariables>(SiwbDocument, options);
      }
export type SiwbMutationHookResult = ReturnType<typeof useSiwbMutation>;
export type SiwbMutationResult = Apollo.MutationResult<SiwbMutation>;
export type SiwbMutationOptions = Apollo.BaseMutationOptions<SiwbMutation, SiwbMutationVariables>;
export const SignupBitcoinDocument = gql`
    mutation SignupBitcoin($address: ID!, $jwe: String!) {
  signupBitcoin(address: $address, jwe: $jwe) {
    user {
      id
      token
    }
  }
}
    `;
export type SignupBitcoinMutationFn = Apollo.MutationFunction<SignupBitcoinMutation, SignupBitcoinMutationVariables>;

/**
 * __useSignupBitcoinMutation__
 *
 * To run a mutation, you first call `useSignupBitcoinMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignupBitcoinMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signupBitcoinMutation, { data, loading, error }] = useSignupBitcoinMutation({
 *   variables: {
 *      address: // value for 'address'
 *      jwe: // value for 'jwe'
 *   },
 * });
 */
export function useSignupBitcoinMutation(baseOptions?: Apollo.MutationHookOptions<SignupBitcoinMutation, SignupBitcoinMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignupBitcoinMutation, SignupBitcoinMutationVariables>(SignupBitcoinDocument, options);
      }
export type SignupBitcoinMutationHookResult = ReturnType<typeof useSignupBitcoinMutation>;
export type SignupBitcoinMutationResult = Apollo.MutationResult<SignupBitcoinMutation>;
export type SignupBitcoinMutationOptions = Apollo.BaseMutationOptions<SignupBitcoinMutation, SignupBitcoinMutationVariables>;
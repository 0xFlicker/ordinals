import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CreateCollectionMutationVariables = Types.Exact<{
  input: Types.CollectionInput;
}>;


export type CreateCollectionMutation = { __typename?: 'Mutation', createCollection: { __typename?: 'Collection', id: string, parentInscription?: { __typename?: 'CollectionParentInscription', uploadUrl?: string | null, multipartUploadId?: string | null } | null } };

export type CreateCollectionParentInscriptionMutationVariables = Types.Exact<{
  collectionId: Types.Scalars['ID']['input'];
  bitcoinNetwork: Types.BitcoinNetwork;
}>;


export type CreateCollectionParentInscriptionMutation = { __typename?: 'Mutation', createCollectionParentInscription: { __typename?: 'InscriptionFunding', id: string, fundingAmountBtc: string, fundingAddress: string, destinationAddress: string, network: Types.BitcoinNetwork, qrValue: string, qrSrc: string } };


export const CreateCollectionDocument = gql`
    mutation CreateCollection($input: CollectionInput!) {
  createCollection(input: $input) {
    id
    parentInscription {
      uploadUrl
      multipartUploadId
    }
  }
}
    `;
export type CreateCollectionMutationFn = Apollo.MutationFunction<CreateCollectionMutation, CreateCollectionMutationVariables>;

/**
 * __useCreateCollectionMutation__
 *
 * To run a mutation, you first call `useCreateCollectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCollectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCollectionMutation, { data, loading, error }] = useCreateCollectionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCollectionMutation(baseOptions?: Apollo.MutationHookOptions<CreateCollectionMutation, CreateCollectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCollectionMutation, CreateCollectionMutationVariables>(CreateCollectionDocument, options);
      }
export type CreateCollectionMutationHookResult = ReturnType<typeof useCreateCollectionMutation>;
export type CreateCollectionMutationResult = Apollo.MutationResult<CreateCollectionMutation>;
export type CreateCollectionMutationOptions = Apollo.BaseMutationOptions<CreateCollectionMutation, CreateCollectionMutationVariables>;
export const CreateCollectionParentInscriptionDocument = gql`
    mutation CreateCollectionParentInscription($collectionId: ID!, $bitcoinNetwork: BitcoinNetwork!) {
  createCollectionParentInscription(
    collectionId: $collectionId
    bitcoinNetwork: $bitcoinNetwork
  ) {
    id
    fundingAmountBtc
    fundingAddress
    destinationAddress
    network
    qrValue
    qrSrc
  }
}
    `;
export type CreateCollectionParentInscriptionMutationFn = Apollo.MutationFunction<CreateCollectionParentInscriptionMutation, CreateCollectionParentInscriptionMutationVariables>;

/**
 * __useCreateCollectionParentInscriptionMutation__
 *
 * To run a mutation, you first call `useCreateCollectionParentInscriptionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCollectionParentInscriptionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCollectionParentInscriptionMutation, { data, loading, error }] = useCreateCollectionParentInscriptionMutation({
 *   variables: {
 *      collectionId: // value for 'collectionId'
 *      bitcoinNetwork: // value for 'bitcoinNetwork'
 *   },
 * });
 */
export function useCreateCollectionParentInscriptionMutation(baseOptions?: Apollo.MutationHookOptions<CreateCollectionParentInscriptionMutation, CreateCollectionParentInscriptionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCollectionParentInscriptionMutation, CreateCollectionParentInscriptionMutationVariables>(CreateCollectionParentInscriptionDocument, options);
      }
export type CreateCollectionParentInscriptionMutationHookResult = ReturnType<typeof useCreateCollectionParentInscriptionMutation>;
export type CreateCollectionParentInscriptionMutationResult = Apollo.MutationResult<CreateCollectionParentInscriptionMutation>;
export type CreateCollectionParentInscriptionMutationOptions = Apollo.BaseMutationOptions<CreateCollectionParentInscriptionMutation, CreateCollectionParentInscriptionMutationVariables>;
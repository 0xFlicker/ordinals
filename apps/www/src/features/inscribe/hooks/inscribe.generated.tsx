import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type RequestInscriptionUploadMutationVariables = Types.Exact<{
  input: Types.InscriptionUploadRequest;
}>;


export type RequestInscriptionUploadMutation = { __typename?: 'Mutation', uploadInscription: { __typename?: 'InscriptionUploadResponse', problems?: Array<{ __typename?: 'InscriptionProblem', message?: string | null }> | null, data?: { __typename?: 'InscriptionUploadData', files: Array<{ __typename?: 'InscriptionUploadFileData', id: string, fileName: string, uploadUrl?: string | null, multipartUploadId?: string | null }> } | null } };

export type RequestInscriptionFundingMutationVariables = Types.Exact<{
  input: Types.InscriptionRequestInput;
}>;


export type RequestInscriptionFundingMutation = { __typename?: 'Mutation', createInscriptionRequest: { __typename?: 'CreateInscriptionResponse', problems?: Array<{ __typename?: 'CreateInscriptionProblem', message: string }> | null, data?: { __typename?: 'InscriptionFunding', id: string, fundingAmountBtc: string, fundingAddress: string, destinationAddress: string, network: Types.BitcoinNetwork, qrValue: string, qrSrc: string } | null } };


export const RequestInscriptionUploadDocument = gql`
    mutation RequestInscriptionUpload($input: InscriptionUploadRequest!) {
  uploadInscription(input: $input) {
    problems {
      message
    }
    data {
      files {
        id
        fileName
        uploadUrl
        multipartUploadId
      }
    }
  }
}
    `;
export type RequestInscriptionUploadMutationFn = Apollo.MutationFunction<RequestInscriptionUploadMutation, RequestInscriptionUploadMutationVariables>;

/**
 * __useRequestInscriptionUploadMutation__
 *
 * To run a mutation, you first call `useRequestInscriptionUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestInscriptionUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestInscriptionUploadMutation, { data, loading, error }] = useRequestInscriptionUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestInscriptionUploadMutation(baseOptions?: Apollo.MutationHookOptions<RequestInscriptionUploadMutation, RequestInscriptionUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestInscriptionUploadMutation, RequestInscriptionUploadMutationVariables>(RequestInscriptionUploadDocument, options);
      }
export type RequestInscriptionUploadMutationHookResult = ReturnType<typeof useRequestInscriptionUploadMutation>;
export type RequestInscriptionUploadMutationResult = Apollo.MutationResult<RequestInscriptionUploadMutation>;
export type RequestInscriptionUploadMutationOptions = Apollo.BaseMutationOptions<RequestInscriptionUploadMutation, RequestInscriptionUploadMutationVariables>;
export const RequestInscriptionFundingDocument = gql`
    mutation RequestInscriptionFunding($input: InscriptionRequestInput!) {
  createInscriptionRequest(input: $input) {
    problems {
      message
    }
    data {
      id
      fundingAmountBtc
      fundingAddress
      destinationAddress
      network
      qrValue
      qrSrc
    }
  }
}
    `;
export type RequestInscriptionFundingMutationFn = Apollo.MutationFunction<RequestInscriptionFundingMutation, RequestInscriptionFundingMutationVariables>;

/**
 * __useRequestInscriptionFundingMutation__
 *
 * To run a mutation, you first call `useRequestInscriptionFundingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestInscriptionFundingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestInscriptionFundingMutation, { data, loading, error }] = useRequestInscriptionFundingMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestInscriptionFundingMutation(baseOptions?: Apollo.MutationHookOptions<RequestInscriptionFundingMutation, RequestInscriptionFundingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestInscriptionFundingMutation, RequestInscriptionFundingMutationVariables>(RequestInscriptionFundingDocument, options);
      }
export type RequestInscriptionFundingMutationHookResult = ReturnType<typeof useRequestInscriptionFundingMutation>;
export type RequestInscriptionFundingMutationResult = Apollo.MutationResult<RequestInscriptionFundingMutation>;
export type RequestInscriptionFundingMutationOptions = Apollo.BaseMutationOptions<RequestInscriptionFundingMutation, RequestInscriptionFundingMutationVariables>;
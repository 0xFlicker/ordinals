import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type SignMultipartUploadQueryVariables = Types.Exact<{
  multipartUploadId: Types.Scalars['String']['input'];
  partNumber: Types.Scalars['Int']['input'];
  fileName: Types.Scalars['String']['input'];
}>;


export type SignMultipartUploadQuery = { __typename?: 'Query', signMultipartUpload: string };


export const SignMultipartUploadDocument = gql`
    query SignMultipartUpload($multipartUploadId: String!, $partNumber: Int!, $fileName: String!) {
  signMultipartUpload(
    multipartUploadId: $multipartUploadId
    partNumber: $partNumber
    fileName: $fileName
  )
}
    `;

/**
 * __useSignMultipartUploadQuery__
 *
 * To run a query within a React component, call `useSignMultipartUploadQuery` and pass it any options that fit your needs.
 * When your component renders, `useSignMultipartUploadQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSignMultipartUploadQuery({
 *   variables: {
 *      multipartUploadId: // value for 'multipartUploadId'
 *      partNumber: // value for 'partNumber'
 *      fileName: // value for 'fileName'
 *   },
 * });
 */
export function useSignMultipartUploadQuery(baseOptions: Apollo.QueryHookOptions<SignMultipartUploadQuery, SignMultipartUploadQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SignMultipartUploadQuery, SignMultipartUploadQueryVariables>(SignMultipartUploadDocument, options);
      }
export function useSignMultipartUploadLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SignMultipartUploadQuery, SignMultipartUploadQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SignMultipartUploadQuery, SignMultipartUploadQueryVariables>(SignMultipartUploadDocument, options);
        }
export type SignMultipartUploadQueryHookResult = ReturnType<typeof useSignMultipartUploadQuery>;
export type SignMultipartUploadLazyQueryHookResult = ReturnType<typeof useSignMultipartUploadLazyQuery>;
export type SignMultipartUploadQueryResult = Apollo.QueryResult<SignMultipartUploadQuery, SignMultipartUploadQueryVariables>;
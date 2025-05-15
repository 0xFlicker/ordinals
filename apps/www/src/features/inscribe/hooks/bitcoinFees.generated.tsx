import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type FeeEstimateQueryVariables = Types.Exact<{
  network: Types.BitcoinNetwork;
}>;


export type FeeEstimateQuery = { __typename?: 'Query', currentBitcoinFees: { __typename?: 'FeeEstimateResponse', problems?: Array<{ __typename?: 'BitcoinNetworkProblem', message?: string | null, severity?: Types.BitcoinNetworkProblemSeverity | null }> | null, data?: { __typename?: 'FeeEstimate', minimum: number, fastest: number, halfHour: number, hour: number } | null } };


export const FeeEstimateDocument = gql`
    query FeeEstimate($network: BitcoinNetwork!) {
  currentBitcoinFees(network: $network) {
    problems {
      message
      severity
    }
    data {
      minimum
      fastest
      halfHour
      hour
    }
  }
}
    `;

/**
 * __useFeeEstimateQuery__
 *
 * To run a query within a React component, call `useFeeEstimateQuery` and pass it any options that fit your needs.
 * When your component renders, `useFeeEstimateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFeeEstimateQuery({
 *   variables: {
 *      network: // value for 'network'
 *   },
 * });
 */
export function useFeeEstimateQuery(baseOptions: Apollo.QueryHookOptions<FeeEstimateQuery, FeeEstimateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FeeEstimateQuery, FeeEstimateQueryVariables>(FeeEstimateDocument, options);
      }
export function useFeeEstimateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FeeEstimateQuery, FeeEstimateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FeeEstimateQuery, FeeEstimateQueryVariables>(FeeEstimateDocument, options);
        }
export type FeeEstimateQueryHookResult = ReturnType<typeof useFeeEstimateQuery>;
export type FeeEstimateLazyQueryHookResult = ReturnType<typeof useFeeEstimateLazyQuery>;
export type FeeEstimateQueryResult = Apollo.QueryResult<FeeEstimateQuery, FeeEstimateQueryVariables>;
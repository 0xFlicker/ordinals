import type * as Types from '../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type BitcoinNetworkStatusQueryVariables = Types.Exact<{
  network: Types.BitcoinNetwork;
}>;


export type BitcoinNetworkStatusQuery = { __typename?: 'Query', bitcoinNetworkStatus?: { __typename?: 'BitcoinNetworkStatusResponse', status?: Types.BitcoinNetworkStatus | null, height?: number | null, bestBlockHash?: string | null, progress?: number | null } | null };


export const BitcoinNetworkStatusDocument = gql`
    query BitcoinNetworkStatus($network: BitcoinNetwork!) {
  bitcoinNetworkStatus(network: $network) {
    status
    height
    bestBlockHash
    progress
  }
}
    `;

/**
 * __useBitcoinNetworkStatusQuery__
 *
 * To run a query within a React component, call `useBitcoinNetworkStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useBitcoinNetworkStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBitcoinNetworkStatusQuery({
 *   variables: {
 *      network: // value for 'network'
 *   },
 * });
 */
export function useBitcoinNetworkStatusQuery(baseOptions: Apollo.QueryHookOptions<BitcoinNetworkStatusQuery, BitcoinNetworkStatusQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BitcoinNetworkStatusQuery, BitcoinNetworkStatusQueryVariables>(BitcoinNetworkStatusDocument, options);
      }
export function useBitcoinNetworkStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BitcoinNetworkStatusQuery, BitcoinNetworkStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BitcoinNetworkStatusQuery, BitcoinNetworkStatusQueryVariables>(BitcoinNetworkStatusDocument, options);
        }
export type BitcoinNetworkStatusQueryHookResult = ReturnType<typeof useBitcoinNetworkStatusQuery>;
export type BitcoinNetworkStatusLazyQueryHookResult = ReturnType<typeof useBitcoinNetworkStatusLazyQuery>;
export type BitcoinNetworkStatusQueryResult = Apollo.QueryResult<BitcoinNetworkStatusQuery, BitcoinNetworkStatusQueryVariables>;
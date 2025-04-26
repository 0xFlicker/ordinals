import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CheckNameQueryVariables = Types.Exact<{
  handle: Types.Scalars['String']['input'];
}>;


export type CheckNameQuery = { __typename?: 'Query', checkUserExistsForHandle: boolean };


export const CheckNameDocument = gql`
    query CheckName($handle: String!) {
  checkUserExistsForHandle(handle: $handle)
}
    `;

/**
 * __useCheckNameQuery__
 *
 * To run a query within a React component, call `useCheckNameQuery` and pass it any options that fit your needs.
 * When your component renders, `useCheckNameQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCheckNameQuery({
 *   variables: {
 *      handle: // value for 'handle'
 *   },
 * });
 */
export function useCheckNameQuery(baseOptions: Apollo.QueryHookOptions<CheckNameQuery, CheckNameQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CheckNameQuery, CheckNameQueryVariables>(CheckNameDocument, options);
      }
export function useCheckNameLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CheckNameQuery, CheckNameQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CheckNameQuery, CheckNameQueryVariables>(CheckNameDocument, options);
        }
export type CheckNameQueryHookResult = ReturnType<typeof useCheckNameQuery>;
export type CheckNameLazyQueryHookResult = ReturnType<typeof useCheckNameLazyQuery>;
export type CheckNameQueryResult = Apollo.QueryResult<CheckNameQuery, CheckNameQueryVariables>;
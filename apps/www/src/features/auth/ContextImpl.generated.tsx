import type * as Types from '../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AuthSelfQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type AuthSelfQuery = { __typename?: 'Query', self?: { __typename?: 'Web3User', id: string, token?: string | null, handle: string, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } | null };


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
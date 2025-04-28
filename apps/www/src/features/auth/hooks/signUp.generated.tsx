import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type SignUpAnonymouslyMutationVariables = Types.Exact<{
  request: Types.SignUpAnonymouslyRequest;
}>;


export type SignUpAnonymouslyMutation = { __typename?: 'Mutation', signUpAnonymously: { __typename?: 'SignUpAnonymouslyResponse', user?: { __typename?: 'Web3User', id: string, roles: Array<{ __typename?: 'Role', id: string }> } | null, problems?: Array<{ __typename?: 'AuthProblem', message: string }> | null } };


export const SignUpAnonymouslyDocument = gql`
    mutation SignUpAnonymously($request: SignUpAnonymouslyRequest!) {
  signUpAnonymously(request: $request) {
    user {
      id
      roles {
        id
      }
    }
    problems {
      message
    }
  }
}
    `;
export type SignUpAnonymouslyMutationFn = Apollo.MutationFunction<SignUpAnonymouslyMutation, SignUpAnonymouslyMutationVariables>;

/**
 * __useSignUpAnonymouslyMutation__
 *
 * To run a mutation, you first call `useSignUpAnonymouslyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignUpAnonymouslyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signUpAnonymouslyMutation, { data, loading, error }] = useSignUpAnonymouslyMutation({
 *   variables: {
 *      request: // value for 'request'
 *   },
 * });
 */
export function useSignUpAnonymouslyMutation(baseOptions?: Apollo.MutationHookOptions<SignUpAnonymouslyMutation, SignUpAnonymouslyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignUpAnonymouslyMutation, SignUpAnonymouslyMutationVariables>(SignUpAnonymouslyDocument, options);
      }
export type SignUpAnonymouslyMutationHookResult = ReturnType<typeof useSignUpAnonymouslyMutation>;
export type SignUpAnonymouslyMutationResult = Apollo.MutationResult<SignUpAnonymouslyMutation>;
export type SignUpAnonymouslyMutationOptions = Apollo.BaseMutationOptions<SignUpAnonymouslyMutation, SignUpAnonymouslyMutationVariables>;
import type * as Types from '../../../graphql/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type SignupAnonymouslyMutationVariables = Types.Exact<{
  request: Types.SignupAnonymouslyRequest;
}>;


export type SignupAnonymouslyMutation = { __typename?: 'Mutation', signupAnonymously: { __typename?: 'SignupAnonymouslyResponse', user?: { __typename?: 'Web3User', id: string, roles: Array<{ __typename?: 'Role', id: string }> } | null, problems?: Array<{ __typename?: 'AuthProblem', message: string }> | null } };


export const SignupAnonymouslyDocument = gql`
    mutation SignupAnonymously($request: SignupAnonymouslyRequest!) {
  signupAnonymously(request: $request) {
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
export type SignupAnonymouslyMutationFn = Apollo.MutationFunction<SignupAnonymouslyMutation, SignupAnonymouslyMutationVariables>;

/**
 * __useSignupAnonymouslyMutation__
 *
 * To run a mutation, you first call `useSignupAnonymouslyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignupAnonymouslyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signupAnonymouslyMutation, { data, loading, error }] = useSignupAnonymouslyMutation({
 *   variables: {
 *      request: // value for 'request'
 *   },
 * });
 */
export function useSignupAnonymouslyMutation(baseOptions?: Apollo.MutationHookOptions<SignupAnonymouslyMutation, SignupAnonymouslyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignupAnonymouslyMutation, SignupAnonymouslyMutationVariables>(SignupAnonymouslyDocument, options);
      }
export type SignupAnonymouslyMutationHookResult = ReturnType<typeof useSignupAnonymouslyMutation>;
export type SignupAnonymouslyMutationResult = Apollo.MutationResult<SignupAnonymouslyMutation>;
export type SignupAnonymouslyMutationOptions = Apollo.BaseMutationOptions<SignupAnonymouslyMutation, SignupAnonymouslyMutationVariables>;
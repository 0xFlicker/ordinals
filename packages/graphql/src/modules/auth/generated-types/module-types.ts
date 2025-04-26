/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace AuthModule {
  interface DefinedFields {
    AppInfo: 'name' | 'pubKey';
    AuthProblem: 'message';
    SignupAnonymouslyResponse: 'user' | 'problems';
    SignatureResponse: 'token' | 'problems';
    SignupBitcoinResponse: 'user' | 'problems';
    Query: 'appInfo' | 'self' | 'checkUserExistsForAddress' | 'checkUserExistsForHandle';
    Mutation: 'signupAnonymously' | 'siwe' | 'siwb' | 'signupBitcoin' | 'signOutEthereum' | 'signOutBitcoin';
  };
  
  interface DefinedEnumValues {
    Web3Namespace: 'SIWE' | 'SIWB';
  };
  
  interface DefinedInputFields {
    SignupAnonymouslyRequest: 'token' | 'handle';
  };
  
  export type AppInfo = Pick<Types.AppInfo, DefinedFields['AppInfo']>;
  export type AuthProblem = Pick<Types.AuthProblem, DefinedFields['AuthProblem']>;
  export type SignupAnonymouslyRequest = Pick<Types.SignupAnonymouslyRequest, DefinedInputFields['SignupAnonymouslyRequest']>;
  export type SignupAnonymouslyResponse = Pick<Types.SignupAnonymouslyResponse, DefinedFields['SignupAnonymouslyResponse']>;
  export type Web3User = Types.Web3User;
  export type Web3Namespace = DefinedEnumValues['Web3Namespace'];
  export type SignatureResponse = Pick<Types.SignatureResponse, DefinedFields['SignatureResponse']>;
  export type SignupBitcoinResponse = Pick<Types.SignupBitcoinResponse, DefinedFields['SignupBitcoinResponse']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  
  export type AppInfoResolvers = Pick<Types.AppInfoResolvers, DefinedFields['AppInfo'] | '__isTypeOf'>;
  export type AuthProblemResolvers = Pick<Types.AuthProblemResolvers, DefinedFields['AuthProblem'] | '__isTypeOf'>;
  export type SignupAnonymouslyResponseResolvers = Pick<Types.SignupAnonymouslyResponseResolvers, DefinedFields['SignupAnonymouslyResponse'] | '__isTypeOf'>;
  export type SignatureResponseResolvers = Pick<Types.SignatureResponseResolvers, DefinedFields['SignatureResponse'] | '__isTypeOf'>;
  export type SignupBitcoinResponseResolvers = Pick<Types.SignupBitcoinResponseResolvers, DefinedFields['SignupBitcoinResponse'] | '__isTypeOf'>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  
  export interface Resolvers {
    AppInfo?: AppInfoResolvers;
    AuthProblem?: AuthProblemResolvers;
    SignupAnonymouslyResponse?: SignupAnonymouslyResponseResolvers;
    SignatureResponse?: SignatureResponseResolvers;
    SignupBitcoinResponse?: SignupBitcoinResponseResolvers;
    Query?: QueryResolvers;
    Mutation?: MutationResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    AppInfo?: {
      '*'?: gm.Middleware[];
      name?: gm.Middleware[];
      pubKey?: gm.Middleware[];
    };
    AuthProblem?: {
      '*'?: gm.Middleware[];
      message?: gm.Middleware[];
    };
    SignupAnonymouslyResponse?: {
      '*'?: gm.Middleware[];
      user?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    SignatureResponse?: {
      '*'?: gm.Middleware[];
      token?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    SignupBitcoinResponse?: {
      '*'?: gm.Middleware[];
      user?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      appInfo?: gm.Middleware[];
      self?: gm.Middleware[];
      checkUserExistsForAddress?: gm.Middleware[];
      checkUserExistsForHandle?: gm.Middleware[];
    };
    Mutation?: {
      '*'?: gm.Middleware[];
      signupAnonymously?: gm.Middleware[];
      siwe?: gm.Middleware[];
      siwb?: gm.Middleware[];
      signupBitcoin?: gm.Middleware[];
      signOutEthereum?: gm.Middleware[];
      signOutBitcoin?: gm.Middleware[];
    };
  };
}
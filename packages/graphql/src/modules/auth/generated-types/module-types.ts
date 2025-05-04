/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace AuthModule {
  interface DefinedFields {
    AppInfo: 'name' | 'pubKey';
    AuthProblem: 'message';
    SignUpAnonymouslyResponse: 'user' | 'problems';
    SiwbData: 'token' | 'user' | 'type';
    SiwbResponse: 'data' | 'problems';
    SiweData: 'token' | 'user' | 'type';
    SiweResponse: 'data' | 'problems';
    SignInBitcoinResponse: 'user' | 'problems';
    Query: 'appInfo' | 'self' | 'checkUserExistsForAddress' | 'checkUserExistsForHandle';
    Mutation: 'signUpAnonymously' | 'siwe' | 'siwb' | 'signInBitcoin' | 'signOutEthereum' | 'signOutBitcoin';
  };
  
  interface DefinedEnumValues {
    Web3Namespace: 'SIWE' | 'SIWB';
    SiweResponseType: 'NEW_USER' | 'EXISTING_USER' | 'LINKED_USER_REQUEST';
  };
  
  interface DefinedInputFields {
    SignUpAnonymouslyRequest: 'token' | 'handle';
  };
  
  export type AppInfo = Pick<Types.AppInfo, DefinedFields['AppInfo']>;
  export type AuthProblem = Pick<Types.AuthProblem, DefinedFields['AuthProblem']>;
  export type SignUpAnonymouslyRequest = Pick<Types.SignUpAnonymouslyRequest, DefinedInputFields['SignUpAnonymouslyRequest']>;
  export type SignUpAnonymouslyResponse = Pick<Types.SignUpAnonymouslyResponse, DefinedFields['SignUpAnonymouslyResponse']>;
  export type Web3User = Types.Web3User;
  export type Web3Namespace = DefinedEnumValues['Web3Namespace'];
  export type SiweResponseType = DefinedEnumValues['SiweResponseType'];
  export type SiwbData = Pick<Types.SiwbData, DefinedFields['SiwbData']>;
  export type SiwbResponse = Pick<Types.SiwbResponse, DefinedFields['SiwbResponse']>;
  export type SiweData = Pick<Types.SiweData, DefinedFields['SiweData']>;
  export type SiweResponse = Pick<Types.SiweResponse, DefinedFields['SiweResponse']>;
  export type SignInBitcoinResponse = Pick<Types.SignInBitcoinResponse, DefinedFields['SignInBitcoinResponse']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  
  export type AppInfoResolvers = Pick<Types.AppInfoResolvers, DefinedFields['AppInfo'] | '__isTypeOf'>;
  export type AuthProblemResolvers = Pick<Types.AuthProblemResolvers, DefinedFields['AuthProblem'] | '__isTypeOf'>;
  export type SignUpAnonymouslyResponseResolvers = Pick<Types.SignUpAnonymouslyResponseResolvers, DefinedFields['SignUpAnonymouslyResponse'] | '__isTypeOf'>;
  export type SiwbDataResolvers = Pick<Types.SiwbDataResolvers, DefinedFields['SiwbData'] | '__isTypeOf'>;
  export type SiwbResponseResolvers = Pick<Types.SiwbResponseResolvers, DefinedFields['SiwbResponse'] | '__isTypeOf'>;
  export type SiweDataResolvers = Pick<Types.SiweDataResolvers, DefinedFields['SiweData'] | '__isTypeOf'>;
  export type SiweResponseResolvers = Pick<Types.SiweResponseResolvers, DefinedFields['SiweResponse'] | '__isTypeOf'>;
  export type SignInBitcoinResponseResolvers = Pick<Types.SignInBitcoinResponseResolvers, DefinedFields['SignInBitcoinResponse'] | '__isTypeOf'>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  
  export interface Resolvers {
    AppInfo?: AppInfoResolvers;
    AuthProblem?: AuthProblemResolvers;
    SignUpAnonymouslyResponse?: SignUpAnonymouslyResponseResolvers;
    SiwbData?: SiwbDataResolvers;
    SiwbResponse?: SiwbResponseResolvers;
    SiweData?: SiweDataResolvers;
    SiweResponse?: SiweResponseResolvers;
    SignInBitcoinResponse?: SignInBitcoinResponseResolvers;
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
    SignUpAnonymouslyResponse?: {
      '*'?: gm.Middleware[];
      user?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    SiwbData?: {
      '*'?: gm.Middleware[];
      token?: gm.Middleware[];
      user?: gm.Middleware[];
      type?: gm.Middleware[];
    };
    SiwbResponse?: {
      '*'?: gm.Middleware[];
      data?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    SiweData?: {
      '*'?: gm.Middleware[];
      token?: gm.Middleware[];
      user?: gm.Middleware[];
      type?: gm.Middleware[];
    };
    SiweResponse?: {
      '*'?: gm.Middleware[];
      data?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    SignInBitcoinResponse?: {
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
      signUpAnonymously?: gm.Middleware[];
      siwe?: gm.Middleware[];
      siwb?: gm.Middleware[];
      signInBitcoin?: gm.Middleware[];
      signOutEthereum?: gm.Middleware[];
      signOutBitcoin?: gm.Middleware[];
    };
  };
}
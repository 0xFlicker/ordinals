/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace PresaleModule {
  interface DefinedFields {
    PresaleProblem: 'code' | 'message';
    PresaleResponseData: 'id' | 'fundingAmountBtc' | 'fundingAmountSats' | 'fundingAddress' | 'destinationAddress' | 'network' | 'farcasterVerifiedAddress' | 'status';
    PresaleResponse: 'problems' | 'data';
    PresalesResult: 'presales' | 'next';
    Mutation: 'presale';
    Query: 'presale' | 'presales';
  };
  
  interface DefinedEnumValues {
    PresaleStatus: 'PENDING' | 'FUNDING' | 'FUNDED' | 'SWEEPING' | 'SWEPT';
  };
  
  interface DefinedInputFields {
    PresaleRequest: 'collectionId' | 'farcasterVerifiedPayload' | 'farcasterFid' | 'destinationAddress' | 'count' | 'feeRate' | 'network';
    PresaleQuery: 'collectionId' | 'status' | 'farcasterVerifiedAddress' | 'destinationAddress' | 'next' | 'limit';
  };
  
  export type PresaleRequest = Pick<Types.PresaleRequest, DefinedInputFields['PresaleRequest']>;
  export type BitcoinNetwork = Types.BitcoinNetwork;
  export type PresaleProblem = Pick<Types.PresaleProblem, DefinedFields['PresaleProblem']>;
  export type PresaleStatus = DefinedEnumValues['PresaleStatus'];
  export type PresaleResponseData = Pick<Types.PresaleResponseData, DefinedFields['PresaleResponseData']>;
  export type PresaleResponse = Pick<Types.PresaleResponse, DefinedFields['PresaleResponse']>;
  export type PresaleQuery = Pick<Types.PresaleQuery, DefinedInputFields['PresaleQuery']>;
  export type PresalesResult = Pick<Types.PresalesResult, DefinedFields['PresalesResult']>;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type PresaleProblemResolvers = Pick<Types.PresaleProblemResolvers, DefinedFields['PresaleProblem'] | '__isTypeOf'>;
  export type PresaleResponseDataResolvers = Pick<Types.PresaleResponseDataResolvers, DefinedFields['PresaleResponseData'] | '__isTypeOf'>;
  export type PresaleResponseResolvers = Pick<Types.PresaleResponseResolvers, DefinedFields['PresaleResponse'] | '__isTypeOf'>;
  export type PresalesResultResolvers = Pick<Types.PresalesResultResolvers, DefinedFields['PresalesResult'] | '__isTypeOf'>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    PresaleProblem?: PresaleProblemResolvers;
    PresaleResponseData?: PresaleResponseDataResolvers;
    PresaleResponse?: PresaleResponseResolvers;
    PresalesResult?: PresalesResultResolvers;
    Mutation?: MutationResolvers;
    Query?: QueryResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    PresaleProblem?: {
      '*'?: gm.Middleware[];
      code?: gm.Middleware[];
      message?: gm.Middleware[];
    };
    PresaleResponseData?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      fundingAmountBtc?: gm.Middleware[];
      fundingAmountSats?: gm.Middleware[];
      fundingAddress?: gm.Middleware[];
      destinationAddress?: gm.Middleware[];
      network?: gm.Middleware[];
      farcasterVerifiedAddress?: gm.Middleware[];
      status?: gm.Middleware[];
    };
    PresaleResponse?: {
      '*'?: gm.Middleware[];
      problems?: gm.Middleware[];
      data?: gm.Middleware[];
    };
    PresalesResult?: {
      '*'?: gm.Middleware[];
      presales?: gm.Middleware[];
      next?: gm.Middleware[];
    };
    Mutation?: {
      '*'?: gm.Middleware[];
      presale?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      presale?: gm.Middleware[];
      presales?: gm.Middleware[];
    };
  };
}
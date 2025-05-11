/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace BitcoinModule {
  interface DefinedFields {
    BitcoinScriptItem: 'text' | 'base64';
    FeeEstimate: 'minimum' | 'fastest' | 'halfHour' | 'hour';
    FeeEstimateResponse: 'problems' | 'data';
    Query: 'currentBitcoinFees' | 'bitcoinNetworkStatus';
    BitcoinNetworkProblem: 'message' | 'severity';
    BitcoinNetworkStatusData: 'status' | 'height' | 'bestBlockHash' | 'progress';
    BitcoinNetworkStatusResponse: 'data' | 'problems';
  };
  
  interface DefinedEnumValues {
    BitcoinNetwork: 'MAINNET' | 'TESTNET' | 'TESTNET4' | 'REGTEST';
    BlockchainNetwork: 'BITCOIN' | 'ETHEREUM';
    BitcoinNetworkStatus: 'DEAD' | 'SYNCING' | 'SYNCED';
    BitcoinNetworkProblemSeverity: 'ERROR' | 'WARNING';
  };
  
  export type BitcoinScriptItem = Pick<Types.BitcoinScriptItem, DefinedFields['BitcoinScriptItem']>;
  export type FeeEstimate = Pick<Types.FeeEstimate, DefinedFields['FeeEstimate']>;
  export type FeeEstimateResponse = Pick<Types.FeeEstimateResponse, DefinedFields['FeeEstimateResponse']>;
  export type BitcoinNetworkProblem = Pick<Types.BitcoinNetworkProblem, DefinedFields['BitcoinNetworkProblem']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  export type BitcoinNetwork = DefinedEnumValues['BitcoinNetwork'];
  export type BlockchainNetwork = DefinedEnumValues['BlockchainNetwork'];
  export type BitcoinNetworkStatus = DefinedEnumValues['BitcoinNetworkStatus'];
  export type BitcoinNetworkProblemSeverity = DefinedEnumValues['BitcoinNetworkProblemSeverity'];
  export type BitcoinNetworkStatusData = Pick<Types.BitcoinNetworkStatusData, DefinedFields['BitcoinNetworkStatusData']>;
  export type BitcoinNetworkStatusResponse = Pick<Types.BitcoinNetworkStatusResponse, DefinedFields['BitcoinNetworkStatusResponse']>;
  
  export type BitcoinScriptItemResolvers = Pick<Types.BitcoinScriptItemResolvers, DefinedFields['BitcoinScriptItem'] | '__isTypeOf'>;
  export type FeeEstimateResolvers = Pick<Types.FeeEstimateResolvers, DefinedFields['FeeEstimate'] | '__isTypeOf'>;
  export type FeeEstimateResponseResolvers = Pick<Types.FeeEstimateResponseResolvers, DefinedFields['FeeEstimateResponse'] | '__isTypeOf'>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  export type BitcoinNetworkProblemResolvers = Pick<Types.BitcoinNetworkProblemResolvers, DefinedFields['BitcoinNetworkProblem'] | '__isTypeOf'>;
  export type BitcoinNetworkStatusDataResolvers = Pick<Types.BitcoinNetworkStatusDataResolvers, DefinedFields['BitcoinNetworkStatusData'] | '__isTypeOf'>;
  export type BitcoinNetworkStatusResponseResolvers = Pick<Types.BitcoinNetworkStatusResponseResolvers, DefinedFields['BitcoinNetworkStatusResponse'] | '__isTypeOf'>;
  
  export interface Resolvers {
    BitcoinScriptItem?: BitcoinScriptItemResolvers;
    FeeEstimate?: FeeEstimateResolvers;
    FeeEstimateResponse?: FeeEstimateResponseResolvers;
    Query?: QueryResolvers;
    BitcoinNetworkProblem?: BitcoinNetworkProblemResolvers;
    BitcoinNetworkStatusData?: BitcoinNetworkStatusDataResolvers;
    BitcoinNetworkStatusResponse?: BitcoinNetworkStatusResponseResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    BitcoinScriptItem?: {
      '*'?: gm.Middleware[];
      text?: gm.Middleware[];
      base64?: gm.Middleware[];
    };
    FeeEstimate?: {
      '*'?: gm.Middleware[];
      minimum?: gm.Middleware[];
      fastest?: gm.Middleware[];
      halfHour?: gm.Middleware[];
      hour?: gm.Middleware[];
    };
    FeeEstimateResponse?: {
      '*'?: gm.Middleware[];
      problems?: gm.Middleware[];
      data?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      currentBitcoinFees?: gm.Middleware[];
      bitcoinNetworkStatus?: gm.Middleware[];
    };
    BitcoinNetworkProblem?: {
      '*'?: gm.Middleware[];
      message?: gm.Middleware[];
      severity?: gm.Middleware[];
    };
    BitcoinNetworkStatusData?: {
      '*'?: gm.Middleware[];
      status?: gm.Middleware[];
      height?: gm.Middleware[];
      bestBlockHash?: gm.Middleware[];
      progress?: gm.Middleware[];
    };
    BitcoinNetworkStatusResponse?: {
      '*'?: gm.Middleware[];
      data?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
  };
}
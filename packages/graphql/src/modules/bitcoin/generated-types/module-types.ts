/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace BitcoinModule {
  interface DefinedFields {
    BitcoinScriptItem: 'text' | 'base64';
    FeeEstimate: 'minimum' | 'fastest' | 'halfHour' | 'hour';
    Query: 'currentBitcoinFees';
  };
  
  interface DefinedEnumValues {
    BitcoinNetwork: 'MAINNET' | 'TESTNET' | 'REGTEST';
    BlockchainNetwork: 'BITCOIN' | 'ETHEREUM';
  };
  
  export type BitcoinScriptItem = Pick<Types.BitcoinScriptItem, DefinedFields['BitcoinScriptItem']>;
  export type FeeEstimate = Pick<Types.FeeEstimate, DefinedFields['FeeEstimate']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  export type BitcoinNetwork = DefinedEnumValues['BitcoinNetwork'];
  export type BlockchainNetwork = DefinedEnumValues['BlockchainNetwork'];
  
  export type BitcoinScriptItemResolvers = Pick<Types.BitcoinScriptItemResolvers, DefinedFields['BitcoinScriptItem'] | '__isTypeOf'>;
  export type FeeEstimateResolvers = Pick<Types.FeeEstimateResolvers, DefinedFields['FeeEstimate'] | '__isTypeOf'>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    BitcoinScriptItem?: BitcoinScriptItemResolvers;
    FeeEstimate?: FeeEstimateResolvers;
    Query?: QueryResolvers;
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
    Query?: {
      '*'?: gm.Middleware[];
      currentBitcoinFees?: gm.Middleware[];
    };
  };
}
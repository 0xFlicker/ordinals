/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace InscriptionFundingModule {
  interface DefinedFields {
    InscriptionFunding: 'id' | 'fundingAmountBtc' | 'fundingAmountSats' | 'fundingAddress' | 'destinationAddress' | 'network' | 'qrValue' | 'qrSrc' | 'status' | 'fundingGenesisTxId' | 'fundingGenesisTxUrl' | 'fundingRevealTxId' | 'fundingRevealTxUrl' | 'overhead' | 'padding' | 'count' | 'fee' | 'inscriptionContent' | 'inscriptionContents';
    InscriptionFundingProblem: 'code' | 'message';
    InscriptionFundingsResult: 'fundings' | 'problems' | 'next' | 'count';
    Query: 'inscriptionFunding' | 'inscriptionFundings';
  };
  
  interface DefinedEnumValues {
    FundingStatus: 'FUNDING' | 'FUNDED' | 'GENESIS' | 'REVEALED' | 'EXPIRED';
  };
  
  interface DefinedInputFields {
    InscriptionFundingQuery: 'collectionId' | 'fundingStatus' | 'next' | 'limit';
  };
  
  export type FundingStatus = DefinedEnumValues['FundingStatus'];
  export type InscriptionFunding = Pick<Types.InscriptionFunding, DefinedFields['InscriptionFunding']>;
  export type BitcoinNetwork = Types.BitcoinNetwork;
  export type InscriptionData = Types.InscriptionData;
  export type InscriptionFundingQuery = Pick<Types.InscriptionFundingQuery, DefinedInputFields['InscriptionFundingQuery']>;
  export type InscriptionFundingProblem = Pick<Types.InscriptionFundingProblem, DefinedFields['InscriptionFundingProblem']>;
  export type InscriptionFundingsResult = Pick<Types.InscriptionFundingsResult, DefinedFields['InscriptionFundingsResult']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type InscriptionFundingResolvers = Pick<Types.InscriptionFundingResolvers, DefinedFields['InscriptionFunding'] | '__isTypeOf'>;
  export type InscriptionFundingProblemResolvers = Pick<Types.InscriptionFundingProblemResolvers, DefinedFields['InscriptionFundingProblem'] | '__isTypeOf'>;
  export type InscriptionFundingsResultResolvers = Pick<Types.InscriptionFundingsResultResolvers, DefinedFields['InscriptionFundingsResult'] | '__isTypeOf'>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    InscriptionFunding?: InscriptionFundingResolvers;
    InscriptionFundingProblem?: InscriptionFundingProblemResolvers;
    InscriptionFundingsResult?: InscriptionFundingsResultResolvers;
    Query?: QueryResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    InscriptionFunding?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      fundingAmountBtc?: gm.Middleware[];
      fundingAmountSats?: gm.Middleware[];
      fundingAddress?: gm.Middleware[];
      destinationAddress?: gm.Middleware[];
      network?: gm.Middleware[];
      qrValue?: gm.Middleware[];
      qrSrc?: gm.Middleware[];
      status?: gm.Middleware[];
      fundingGenesisTxId?: gm.Middleware[];
      fundingGenesisTxUrl?: gm.Middleware[];
      fundingRevealTxId?: gm.Middleware[];
      fundingRevealTxUrl?: gm.Middleware[];
      overhead?: gm.Middleware[];
      padding?: gm.Middleware[];
      count?: gm.Middleware[];
      fee?: gm.Middleware[];
      inscriptionContent?: gm.Middleware[];
      inscriptionContents?: gm.Middleware[];
    };
    InscriptionFundingProblem?: {
      '*'?: gm.Middleware[];
      code?: gm.Middleware[];
      message?: gm.Middleware[];
    };
    InscriptionFundingsResult?: {
      '*'?: gm.Middleware[];
      fundings?: gm.Middleware[];
      problems?: gm.Middleware[];
      next?: gm.Middleware[];
      count?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      inscriptionFunding?: gm.Middleware[];
      inscriptionFundings?: gm.Middleware[];
    };
  };
}
/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace InscriptionsModule {
  interface DefinedFields {
    Inscription: 'id' | 'owner' | 'content' | 'contentUrl' | 'contentLength' | 'contentType' | 'parents' | 'children';
    Query: 'inscriptions' | 'inscriptionIds';
  };
  
  interface DefinedInputFields {
    InscriptionQuery: 'userId' | 'address' | 'handle';
  };
  
  export type Inscription = Pick<Types.Inscription, DefinedFields['Inscription']>;
  export type Web3User = Types.Web3User;
  export type InscriptionQuery = Pick<Types.InscriptionQuery, DefinedInputFields['InscriptionQuery']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type InscriptionResolvers = Pick<Types.InscriptionResolvers, DefinedFields['Inscription'] | '__isTypeOf'>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    Inscription?: InscriptionResolvers;
    Query?: QueryResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    Inscription?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      owner?: gm.Middleware[];
      content?: gm.Middleware[];
      contentUrl?: gm.Middleware[];
      contentLength?: gm.Middleware[];
      contentType?: gm.Middleware[];
      parents?: gm.Middleware[];
      children?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      inscriptions?: gm.Middleware[];
      inscriptionIds?: gm.Middleware[];
    };
  };
}
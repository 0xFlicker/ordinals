/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace InscriptionRequestModule {
  interface DefinedFields {
    InscriptionData: 'textContent' | 'base64Content' | 'contentType';
  };
  
  interface DefinedEnumValues {
    FeeLevel: 'GLACIAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  };
  
  interface DefinedInputFields {
    InscriptionDataInput: 'textContent' | 'base64Content' | 'contentType';
    InscriptionRequest: 'files' | 'destinationAddress' | 'network' | 'feeLevel' | 'feePerByte';
  };
  
  export type InscriptionData = Pick<Types.InscriptionData, DefinedFields['InscriptionData']>;
  export type FeeLevel = DefinedEnumValues['FeeLevel'];
  export type InscriptionDataInput = Pick<Types.InscriptionDataInput, DefinedInputFields['InscriptionDataInput']>;
  export type InscriptionRequest = Pick<Types.InscriptionRequest, DefinedInputFields['InscriptionRequest']>;
  export type BitcoinNetwork = Types.BitcoinNetwork;
  
  export type InscriptionDataResolvers = Pick<Types.InscriptionDataResolvers, DefinedFields['InscriptionData'] | '__isTypeOf'>;
  
  export interface Resolvers {
    InscriptionData?: InscriptionDataResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    InscriptionData?: {
      '*'?: gm.Middleware[];
      textContent?: gm.Middleware[];
      base64Content?: gm.Middleware[];
      contentType?: gm.Middleware[];
    };
  };
}
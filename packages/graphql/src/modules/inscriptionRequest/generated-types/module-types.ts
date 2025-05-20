/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace InscriptionRequestModule {
  interface DefinedFields {
    InscriptionData: 'textContent' | 'base64Content' | 'contentType';
    InscriptionUploadFileData: 'id' | 'fileName' | 'uploadUrl' | 'multipartUploadId';
    InscriptionUploadData: 'files';
    InscriptionProblem: 'fileName' | 'message' | 'code';
    InscriptionUploadResponse: 'data' | 'problems';
    CreateInscriptionProblem: 'message' | 'code';
    CreateInscriptionResponse: 'data' | 'problems';
    RefundPaymentsData: 'txId';
    RefundPaymentsProblem: 'fundingId' | 'message';
    RefundPaymentsResponse: 'data' | 'problems';
    Mutation: 'createInscriptionRequest' | 'uploadInscription' | 'refundPayments';
    Query: 'signMultipartUpload';
  };
  
  interface DefinedEnumValues {
    FeeLevel: 'GLACIAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  };
  
  interface DefinedInputFields {
    InscriptionFileUploadedInput: 'id';
    InscriptionFileInlineInput: 'contentType' | 'base64Content';
    InscriptionDataInput: 'uploadedFile' | 'inlineFile' | 'metaJson';
    InscriptionRequestInput: 'files' | 'destinationAddress' | 'network' | 'feeLevel' | 'feePerByte' | 'parentInscriptionId';
    InscriptionUploadFileRequest: 'fileName' | 'contentType';
    InscriptionUploadRequest: 'files';
    RefundPaymentFundingInput: 'fundingId' | 'amount' | 'txid' | 'vout';
    RefundPaymentsInput: 'fundings' | 'network' | 'feeLevel' | 'feePerByte' | 'destinationAddress';
  };
  
  export type InscriptionData = Pick<Types.InscriptionData, DefinedFields['InscriptionData']>;
  export type FeeLevel = DefinedEnumValues['FeeLevel'];
  export type InscriptionFileUploadedInput = Pick<Types.InscriptionFileUploadedInput, DefinedInputFields['InscriptionFileUploadedInput']>;
  export type InscriptionFileInlineInput = Pick<Types.InscriptionFileInlineInput, DefinedInputFields['InscriptionFileInlineInput']>;
  export type InscriptionDataInput = Pick<Types.InscriptionDataInput, DefinedInputFields['InscriptionDataInput']>;
  export type InscriptionRequestInput = Pick<Types.InscriptionRequestInput, DefinedInputFields['InscriptionRequestInput']>;
  export type BitcoinNetwork = Types.BitcoinNetwork;
  export type InscriptionUploadFileRequest = Pick<Types.InscriptionUploadFileRequest, DefinedInputFields['InscriptionUploadFileRequest']>;
  export type InscriptionUploadRequest = Pick<Types.InscriptionUploadRequest, DefinedInputFields['InscriptionUploadRequest']>;
  export type InscriptionUploadFileData = Pick<Types.InscriptionUploadFileData, DefinedFields['InscriptionUploadFileData']>;
  export type InscriptionUploadData = Pick<Types.InscriptionUploadData, DefinedFields['InscriptionUploadData']>;
  export type InscriptionProblem = Pick<Types.InscriptionProblem, DefinedFields['InscriptionProblem']>;
  export type InscriptionUploadResponse = Pick<Types.InscriptionUploadResponse, DefinedFields['InscriptionUploadResponse']>;
  export type CreateInscriptionProblem = Pick<Types.CreateInscriptionProblem, DefinedFields['CreateInscriptionProblem']>;
  export type CreateInscriptionResponse = Pick<Types.CreateInscriptionResponse, DefinedFields['CreateInscriptionResponse']>;
  export type InscriptionFunding = Types.InscriptionFunding;
  export type RefundPaymentFundingInput = Pick<Types.RefundPaymentFundingInput, DefinedInputFields['RefundPaymentFundingInput']>;
  export type RefundPaymentsInput = Pick<Types.RefundPaymentsInput, DefinedInputFields['RefundPaymentsInput']>;
  export type RefundPaymentsData = Pick<Types.RefundPaymentsData, DefinedFields['RefundPaymentsData']>;
  export type RefundPaymentsProblem = Pick<Types.RefundPaymentsProblem, DefinedFields['RefundPaymentsProblem']>;
  export type RefundPaymentsResponse = Pick<Types.RefundPaymentsResponse, DefinedFields['RefundPaymentsResponse']>;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type InscriptionDataResolvers = Pick<Types.InscriptionDataResolvers, DefinedFields['InscriptionData'] | '__isTypeOf'>;
  export type InscriptionUploadFileDataResolvers = Pick<Types.InscriptionUploadFileDataResolvers, DefinedFields['InscriptionUploadFileData'] | '__isTypeOf'>;
  export type InscriptionUploadDataResolvers = Pick<Types.InscriptionUploadDataResolvers, DefinedFields['InscriptionUploadData'] | '__isTypeOf'>;
  export type InscriptionProblemResolvers = Pick<Types.InscriptionProblemResolvers, DefinedFields['InscriptionProblem'] | '__isTypeOf'>;
  export type InscriptionUploadResponseResolvers = Pick<Types.InscriptionUploadResponseResolvers, DefinedFields['InscriptionUploadResponse'] | '__isTypeOf'>;
  export type CreateInscriptionProblemResolvers = Pick<Types.CreateInscriptionProblemResolvers, DefinedFields['CreateInscriptionProblem'] | '__isTypeOf'>;
  export type CreateInscriptionResponseResolvers = Pick<Types.CreateInscriptionResponseResolvers, DefinedFields['CreateInscriptionResponse'] | '__isTypeOf'>;
  export type RefundPaymentsDataResolvers = Pick<Types.RefundPaymentsDataResolvers, DefinedFields['RefundPaymentsData'] | '__isTypeOf'>;
  export type RefundPaymentsProblemResolvers = Pick<Types.RefundPaymentsProblemResolvers, DefinedFields['RefundPaymentsProblem'] | '__isTypeOf'>;
  export type RefundPaymentsResponseResolvers = Pick<Types.RefundPaymentsResponseResolvers, DefinedFields['RefundPaymentsResponse'] | '__isTypeOf'>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    InscriptionData?: InscriptionDataResolvers;
    InscriptionUploadFileData?: InscriptionUploadFileDataResolvers;
    InscriptionUploadData?: InscriptionUploadDataResolvers;
    InscriptionProblem?: InscriptionProblemResolvers;
    InscriptionUploadResponse?: InscriptionUploadResponseResolvers;
    CreateInscriptionProblem?: CreateInscriptionProblemResolvers;
    CreateInscriptionResponse?: CreateInscriptionResponseResolvers;
    RefundPaymentsData?: RefundPaymentsDataResolvers;
    RefundPaymentsProblem?: RefundPaymentsProblemResolvers;
    RefundPaymentsResponse?: RefundPaymentsResponseResolvers;
    Mutation?: MutationResolvers;
    Query?: QueryResolvers;
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
    InscriptionUploadFileData?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      fileName?: gm.Middleware[];
      uploadUrl?: gm.Middleware[];
      multipartUploadId?: gm.Middleware[];
    };
    InscriptionUploadData?: {
      '*'?: gm.Middleware[];
      files?: gm.Middleware[];
    };
    InscriptionProblem?: {
      '*'?: gm.Middleware[];
      fileName?: gm.Middleware[];
      message?: gm.Middleware[];
      code?: gm.Middleware[];
    };
    InscriptionUploadResponse?: {
      '*'?: gm.Middleware[];
      data?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    CreateInscriptionProblem?: {
      '*'?: gm.Middleware[];
      message?: gm.Middleware[];
      code?: gm.Middleware[];
    };
    CreateInscriptionResponse?: {
      '*'?: gm.Middleware[];
      data?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    RefundPaymentsData?: {
      '*'?: gm.Middleware[];
      txId?: gm.Middleware[];
    };
    RefundPaymentsProblem?: {
      '*'?: gm.Middleware[];
      fundingId?: gm.Middleware[];
      message?: gm.Middleware[];
    };
    RefundPaymentsResponse?: {
      '*'?: gm.Middleware[];
      data?: gm.Middleware[];
      problems?: gm.Middleware[];
    };
    Mutation?: {
      '*'?: gm.Middleware[];
      createInscriptionRequest?: gm.Middleware[];
      uploadInscription?: gm.Middleware[];
      refundPayments?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      signMultipartUpload?: gm.Middleware[];
    };
  };
}
/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace CollectionsModule {
  interface DefinedFields {
    KeyValue: 'key' | 'value';
    CollectionParentInscription: 'parentInscriptionId' | 'parentInscriptionFileName' | 'parentInscriptionContentType' | 'uploadUrl' | 'multipartUploadId';
    Collection: 'id' | 'name' | 'totalCount' | 'pendingCount' | 'maxSupply' | 'parentInscription' | 'metadata' | 'updateMetadata';
    Mutation: 'createCollection' | 'deleteCollection' | 'collection' | 'createCollectionParentInscription';
    Query: 'collections' | 'collection' | 'signMultipartUpload';
  };
  
  interface DefinedInputFields {
    KeyValueInput: 'key' | 'value';
    CollectionParentInscriptionInput: 'parentInscriptionId' | 'parentInscriptionFileName' | 'parentInscriptionContentType';
    CollectionInput: 'name' | 'maxSupply' | 'parentInscription' | 'meta';
  };
  
  export type KeyValue = Pick<Types.KeyValue, DefinedFields['KeyValue']>;
  export type KeyValueInput = Pick<Types.KeyValueInput, DefinedInputFields['KeyValueInput']>;
  export type CollectionParentInscription = Pick<Types.CollectionParentInscription, DefinedFields['CollectionParentInscription']>;
  export type Collection = Pick<Types.Collection, DefinedFields['Collection']>;
  export type CollectionParentInscriptionInput = Pick<Types.CollectionParentInscriptionInput, DefinedInputFields['CollectionParentInscriptionInput']>;
  export type CollectionInput = Pick<Types.CollectionInput, DefinedInputFields['CollectionInput']>;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  export type InscriptionFunding = Types.InscriptionFunding;
  export type BitcoinNetwork = Types.BitcoinNetwork;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type KeyValueResolvers = Pick<Types.KeyValueResolvers, DefinedFields['KeyValue'] | '__isTypeOf'>;
  export type CollectionParentInscriptionResolvers = Pick<Types.CollectionParentInscriptionResolvers, DefinedFields['CollectionParentInscription'] | '__isTypeOf'>;
  export type CollectionResolvers = Pick<Types.CollectionResolvers, DefinedFields['Collection'] | '__isTypeOf'>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    KeyValue?: KeyValueResolvers;
    CollectionParentInscription?: CollectionParentInscriptionResolvers;
    Collection?: CollectionResolvers;
    Mutation?: MutationResolvers;
    Query?: QueryResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    KeyValue?: {
      '*'?: gm.Middleware[];
      key?: gm.Middleware[];
      value?: gm.Middleware[];
    };
    CollectionParentInscription?: {
      '*'?: gm.Middleware[];
      parentInscriptionId?: gm.Middleware[];
      parentInscriptionFileName?: gm.Middleware[];
      parentInscriptionContentType?: gm.Middleware[];
      uploadUrl?: gm.Middleware[];
      multipartUploadId?: gm.Middleware[];
    };
    Collection?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      name?: gm.Middleware[];
      totalCount?: gm.Middleware[];
      pendingCount?: gm.Middleware[];
      maxSupply?: gm.Middleware[];
      parentInscription?: gm.Middleware[];
      metadata?: gm.Middleware[];
      updateMetadata?: gm.Middleware[];
    };
    Mutation?: {
      '*'?: gm.Middleware[];
      createCollection?: gm.Middleware[];
      deleteCollection?: gm.Middleware[];
      collection?: gm.Middleware[];
      createCollectionParentInscription?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      collections?: gm.Middleware[];
      collection?: gm.Middleware[];
      signMultipartUpload?: gm.Middleware[];
    };
  };
}
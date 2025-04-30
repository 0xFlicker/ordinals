/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace UserModule {
  interface DefinedFields {
    Address: 'type' | 'address';
    Nonce: 'nonce' | 'messageToSign' | 'domain' | 'expiration' | 'issuedAt' | 'uri' | 'version' | 'chainId' | 'pubKey' | 'address';
    Web3User: 'id' | 'addresses' | 'roles' | 'allowedActions' | 'token' | 'handle' | 'linkVerifiedAddress';
    Mutation: 'nonceEthereum' | 'nonceBitcoin' | 'nonceFrame' | 'user';
    Query: 'user';
  };
  
  interface DefinedEnumValues {
    AddressType: 'EVM' | 'BTC';
  };
  
  interface DefinedInputFields {
    LinkVerifiedAddressRequest: 'address' | 'siweJwe' | 'siwbJwe';
  };
  
  export type AddressType = DefinedEnumValues['AddressType'];
  export type Address = Pick<Types.Address, DefinedFields['Address']>;
  export type Nonce = Pick<Types.Nonce, DefinedFields['Nonce']>;
  export type LinkVerifiedAddressRequest = Pick<Types.LinkVerifiedAddressRequest, DefinedInputFields['LinkVerifiedAddressRequest']>;
  export type Web3User = Pick<Types.Web3User, DefinedFields['Web3User']>;
  export type Role = Types.Role;
  export type Permission = Types.Permission;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type AddressResolvers = Pick<Types.AddressResolvers, DefinedFields['Address'] | '__isTypeOf'>;
  export type NonceResolvers = Pick<Types.NonceResolvers, DefinedFields['Nonce'] | '__isTypeOf'>;
  export type Web3UserResolvers = Pick<Types.Web3UserResolvers, DefinedFields['Web3User'] | '__isTypeOf'>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    Address?: AddressResolvers;
    Nonce?: NonceResolvers;
    Web3User?: Web3UserResolvers;
    Mutation?: MutationResolvers;
    Query?: QueryResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
    };
    Address?: {
      '*'?: gm.Middleware[];
      type?: gm.Middleware[];
      address?: gm.Middleware[];
    };
    Nonce?: {
      '*'?: gm.Middleware[];
      nonce?: gm.Middleware[];
      messageToSign?: gm.Middleware[];
      domain?: gm.Middleware[];
      expiration?: gm.Middleware[];
      issuedAt?: gm.Middleware[];
      uri?: gm.Middleware[];
      version?: gm.Middleware[];
      chainId?: gm.Middleware[];
      pubKey?: gm.Middleware[];
      address?: gm.Middleware[];
    };
    Web3User?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      addresses?: gm.Middleware[];
      roles?: gm.Middleware[];
      allowedActions?: gm.Middleware[];
      token?: gm.Middleware[];
      handle?: gm.Middleware[];
      linkVerifiedAddress?: gm.Middleware[];
    };
    Mutation?: {
      '*'?: gm.Middleware[];
      nonceEthereum?: gm.Middleware[];
      nonceBitcoin?: gm.Middleware[];
      nonceFrame?: gm.Middleware[];
      user?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      user?: gm.Middleware[];
    };
  };
}
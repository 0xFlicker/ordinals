/* eslint-disable */
import type * as Types from "../../../generated-types/graphql.js";
import type * as gm from "@0xflick/graphql-modules";
export namespace UserModule {
  interface DefinedFields {
    Nonce: 'nonce' | 'messageToSign' | 'domain' | 'expiration' | 'issuedAt' | 'uri' | 'version' | 'chainId' | 'pubKey';
    AssociatedAddresses: 'evmSignedAddress' | 'taprootAddress' | 'frameFid' | 'frameVerifiedAddresses';
    Web3User: 'id' | 'associatedAddresses' | 'roles' | 'allowedActions' | 'token';
    Web3LoginUser: 'address' | 'user' | 'token';
    Mutation: 'nonceEthereum' | 'nonceBitcoin' | 'nonceFrame';
    Query: 'userByAddress';
  };
  
  export type Nonce = Pick<Types.Nonce, DefinedFields['Nonce']>;
  export type AssociatedAddresses = Pick<Types.AssociatedAddresses, DefinedFields['AssociatedAddresses']>;
  export type Web3User = Pick<Types.Web3User, DefinedFields['Web3User']>;
  export type Role = Types.Role;
  export type Permission = Types.Permission;
  export type Web3LoginUser = Pick<Types.Web3LoginUser, DefinedFields['Web3LoginUser']>;
  export type Mutation = Pick<Types.Mutation, DefinedFields['Mutation']>;
  export type Query = Pick<Types.Query, DefinedFields['Query']>;
  
  export type NonceResolvers = Pick<Types.NonceResolvers, DefinedFields['Nonce'] | '__isTypeOf'>;
  export type AssociatedAddressesResolvers = Pick<Types.AssociatedAddressesResolvers, DefinedFields['AssociatedAddresses'] | '__isTypeOf'>;
  export type Web3UserResolvers = Pick<Types.Web3UserResolvers, DefinedFields['Web3User'] | '__isTypeOf'>;
  export type Web3LoginUserResolvers = Pick<Types.Web3LoginUserResolvers, DefinedFields['Web3LoginUser'] | '__isTypeOf'>;
  export type MutationResolvers = Pick<Types.MutationResolvers, DefinedFields['Mutation']>;
  export type QueryResolvers = Pick<Types.QueryResolvers, DefinedFields['Query']>;
  
  export interface Resolvers {
    Nonce?: NonceResolvers;
    AssociatedAddresses?: AssociatedAddressesResolvers;
    Web3User?: Web3UserResolvers;
    Web3LoginUser?: Web3LoginUserResolvers;
    Mutation?: MutationResolvers;
    Query?: QueryResolvers;
  };
  
  export interface MiddlewareMap {
    '*'?: {
      '*'?: gm.Middleware[];
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
    };
    AssociatedAddresses?: {
      '*'?: gm.Middleware[];
      evmSignedAddress?: gm.Middleware[];
      taprootAddress?: gm.Middleware[];
      frameFid?: gm.Middleware[];
      frameVerifiedAddresses?: gm.Middleware[];
    };
    Web3User?: {
      '*'?: gm.Middleware[];
      id?: gm.Middleware[];
      associatedAddresses?: gm.Middleware[];
      roles?: gm.Middleware[];
      allowedActions?: gm.Middleware[];
      token?: gm.Middleware[];
    };
    Web3LoginUser?: {
      '*'?: gm.Middleware[];
      address?: gm.Middleware[];
      user?: gm.Middleware[];
      token?: gm.Middleware[];
    };
    Mutation?: {
      '*'?: gm.Middleware[];
      nonceEthereum?: gm.Middleware[];
      nonceBitcoin?: gm.Middleware[];
      nonceFrame?: gm.Middleware[];
    };
    Query?: {
      '*'?: gm.Middleware[];
      userByAddress?: gm.Middleware[];
    };
  };
}
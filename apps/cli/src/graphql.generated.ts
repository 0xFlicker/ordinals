import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AppInfo = {
  __typename?: 'AppInfo';
  name: Scalars['String']['output'];
  pubKey: Scalars['String']['output'];
};

export type AxolotlAvailableClaimedFunding = {
  __typename?: 'AxolotlAvailableClaimedFunding';
  claimingAddress: Scalars['String']['output'];
  destinationAddress: Scalars['String']['output'];
  funding?: Maybe<InscriptionFunding>;
  id: Scalars['ID']['output'];
  network?: Maybe<BitcoinNetwork>;
  status: FundingStatus;
  tokenId?: Maybe<Scalars['Int']['output']>;
};

export type AxolotlAvailableClaimedRequest = {
  claimingAddress: Scalars['String']['input'];
  collectionId: Scalars['ID']['input'];
};

export type AxolotlAvailableOpenEditionFunding = {
  __typename?: 'AxolotlAvailableOpenEditionFunding';
  destinationAddress: Scalars['String']['output'];
  funding?: Maybe<InscriptionFunding>;
  id: Scalars['ID']['output'];
  network?: Maybe<BitcoinNetwork>;
  status: FundingStatus;
  tokenId: Scalars['Int']['output'];
};

export type AxolotlAvailableOpenEditionRequest = {
  collectionId: Scalars['ID']['input'];
  destinationAddress: Scalars['String']['input'];
};

export type AxolotlClaimRequest = {
  claimingAddress: Scalars['String']['input'];
  collectionId: Scalars['ID']['input'];
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
};

export type AxolotlFunding = {
  __typename?: 'AxolotlFunding';
  chameleon: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  destinationAddress: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inscriptionFunding?: Maybe<InscriptionFunding>;
  tokenId: Scalars['Int']['output'];
};

export type AxolotlFundingPage = {
  __typename?: 'AxolotlFundingPage';
  cursor?: Maybe<Scalars['String']['output']>;
  items?: Maybe<Array<Maybe<AxolotlFunding>>>;
  page: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
};

export type AxolotlOpenEditionRequest = {
  claimCount?: InputMaybe<Scalars['Int']['input']>;
  collectionId: Scalars['ID']['input'];
  destinationAddress: Scalars['String']['input'];
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
};

export enum BitcoinNetwork {
  Mainnet = 'MAINNET',
  Regtest = 'REGTEST',
  Testnet = 'TESTNET'
}

export type BitcoinScriptItem = {
  __typename?: 'BitcoinScriptItem';
  base64?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
};

export enum BlockchainNetwork {
  Bitcoin = 'BITCOIN',
  Ethereum = 'ETHEREUM'
}

export type Collection = {
  __typename?: 'Collection';
  id: Scalars['ID']['output'];
  maxSupply: Scalars['Int']['output'];
  metadata: Array<KeyValue>;
  name: Scalars['String']['output'];
  totalCount: Scalars['Int']['output'];
  updateMetadata: Collection;
};


export type CollectionUpdateMetadataArgs = {
  metadata: Array<KeyValueInput>;
};

export type CollectionInput = {
  maxSupply: Scalars['Int']['input'];
  meta?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export enum FeeLevel {
  Glacial = 'GLACIAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export enum FundingStatus {
  Funded = 'FUNDED',
  Funding = 'FUNDING',
  Genesis = 'GENESIS',
  Reveal = 'REVEAL',
  Unclaimed = 'UNCLAIMED',
  Unverified = 'UNVERIFIED'
}

export type InscriptionData = {
  __typename?: 'InscriptionData';
  base64Content?: Maybe<Scalars['String']['output']>;
  contentType: Scalars['String']['output'];
  textContent?: Maybe<Scalars['String']['output']>;
};

export type InscriptionDataInput = {
  base64Content?: InputMaybe<Scalars['String']['input']>;
  contentType: Scalars['String']['input'];
  textContent?: InputMaybe<Scalars['String']['input']>;
};

export type InscriptionFunding = {
  __typename?: 'InscriptionFunding';
  fundingAddress: Scalars['String']['output'];
  fundingAmountBtc: Scalars['String']['output'];
  fundingAmountSats: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  inscriptionContent: InscriptionData;
  inscriptionTransaction: InscriptionTransaction;
  network: BitcoinNetwork;
  qrSrc: Scalars['String']['output'];
  qrValue: Scalars['String']['output'];
  s3Object: S3Object;
};


export type InscriptionFundingInscriptionContentArgs = {
  tapKey: Scalars['String']['input'];
};

export type InscriptionRequest = {
  destinationAddress: Scalars['String']['input'];
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  files: Array<InscriptionDataInput>;
  network: BitcoinNetwork;
};

export type InscriptionTransaction = {
  __typename?: 'InscriptionTransaction';
  initCBlock: Scalars['String']['output'];
  initLeaf: Scalars['String']['output'];
  initScript: Array<BitcoinScriptItem>;
  initTapKey: Scalars['String']['output'];
  inscriptions: Array<InscriptionTransactionContent>;
  overhead: Scalars['Int']['output'];
  padding: Scalars['Int']['output'];
  privateKey: Scalars['String']['output'];
};

export type InscriptionTransactionContent = {
  __typename?: 'InscriptionTransactionContent';
  cblock: Scalars['String']['output'];
  fee: Scalars['Int']['output'];
  leaf: Scalars['String']['output'];
  script: Array<BitcoinScriptItem>;
  tapKey: Scalars['String']['output'];
  txsize: Scalars['Int']['output'];
};

export type KeyValue = {
  __typename?: 'KeyValue';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type KeyValueInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  axolotlFundingClaimRequest: Array<AxolotlFunding>;
  axolotlFundingOpenEditionRequest: Array<AxolotlFunding>;
  collection: Collection;
  createCollection: Collection;
  createRole: Role;
  deleteCollection: Scalars['Boolean']['output'];
  nonceBitcoin: Nonce;
  nonceEthereum: Nonce;
  requestFundingAddress: InscriptionFunding;
  role: Role;
  signOutBitcoin: Scalars['Boolean']['output'];
  signOutEthereum: Scalars['Boolean']['output'];
  siwb: Web3LoginUser;
  siwe: Web3LoginUser;
};


export type MutationAxolotlFundingClaimRequestArgs = {
  request: AxolotlClaimRequest;
};


export type MutationAxolotlFundingOpenEditionRequestArgs = {
  request: AxolotlOpenEditionRequest;
};


export type MutationCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateCollectionArgs = {
  input: CollectionInput;
};


export type MutationCreateRoleArgs = {
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Array<PermissionInput>>;
};


export type MutationDeleteCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationNonceBitcoinArgs = {
  address: Scalars['ID']['input'];
};


export type MutationNonceEthereumArgs = {
  address: Scalars['ID']['input'];
  chainId: Scalars['Int']['input'];
};


export type MutationRequestFundingAddressArgs = {
  request: InscriptionRequest;
};


export type MutationRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSiwbArgs = {
  address: Scalars['ID']['input'];
  jwe: Scalars['String']['input'];
};


export type MutationSiweArgs = {
  address: Scalars['ID']['input'];
  jwe: Scalars['String']['input'];
};

export type Nonce = {
  __typename?: 'Nonce';
  chainId?: Maybe<Scalars['Int']['output']>;
  domain: Scalars['String']['output'];
  expiration: Scalars['String']['output'];
  issuedAt: Scalars['String']['output'];
  messageToSign: Scalars['String']['output'];
  nonce: Scalars['String']['output'];
  pubKey: Scalars['String']['output'];
  uri: Scalars['String']['output'];
  version?: Maybe<Scalars['String']['output']>;
};

export type Permission = {
  __typename?: 'Permission';
  action: PermissionAction;
  identifier?: Maybe<Scalars['String']['output']>;
  resource: PermissionResource;
};

export enum PermissionAction {
  Admin = 'ADMIN',
  Create = 'CREATE',
  Delete = 'DELETE',
  Get = 'GET',
  List = 'LIST',
  Update = 'UPDATE',
  Use = 'USE'
}

export type PermissionInput = {
  action: PermissionAction;
  identifier?: InputMaybe<Scalars['String']['input']>;
  resource: PermissionResource;
};

export enum PermissionResource {
  Admin = 'ADMIN',
  Affiliate = 'AFFILIATE',
  All = 'ALL',
  Collection = 'COLLECTION',
  Presale = 'PRESALE',
  Role = 'ROLE',
  User = 'USER'
}

export type Query = {
  __typename?: 'Query';
  appInfo: AppInfo;
  axolotlAvailableClaimedFundingClaims: Array<AxolotlAvailableClaimedFunding>;
  axolotlAvailableOpenEditionFundingClaims: Array<AxolotlAvailableOpenEditionFunding>;
  collection: Collection;
  collections: Array<Collection>;
  inscriptionFunding?: Maybe<InscriptionFunding>;
  inscriptionTransaction?: Maybe<InscriptionTransaction>;
  role?: Maybe<Role>;
  roles: Array<Role>;
  self?: Maybe<Web3User>;
  userByAddress: Web3User;
};


export type QueryAxolotlAvailableClaimedFundingClaimsArgs = {
  request: AxolotlAvailableClaimedRequest;
};


export type QueryAxolotlAvailableOpenEditionFundingClaimsArgs = {
  request: AxolotlAvailableOpenEditionRequest;
};


export type QueryCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInscriptionFundingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInscriptionTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserByAddressArgs = {
  address: Scalars['ID']['input'];
};

export type Role = {
  __typename?: 'Role';
  addPermissions: Role;
  bindToUser: Web3User;
  delete: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions: Array<Permission>;
  removePermissions: Role;
  unbindFromUser: Web3User;
  userCount: Scalars['Int']['output'];
};


export type RoleAddPermissionsArgs = {
  permissions: Array<PermissionInput>;
};


export type RoleBindToUserArgs = {
  userAddress: Scalars['String']['input'];
};


export type RoleRemovePermissionsArgs = {
  permissions: Array<PermissionInput>;
};


export type RoleUnbindFromUserArgs = {
  userAddress: Scalars['String']['input'];
};

export type S3Object = {
  __typename?: 'S3Object';
  bucket: Scalars['String']['output'];
  key: Scalars['String']['output'];
};

export type Web3LoginUser = {
  __typename?: 'Web3LoginUser';
  address: Scalars['ID']['output'];
  token: Scalars['String']['output'];
  user: Web3User;
};

export type Web3User = {
  __typename?: 'Web3User';
  address: Scalars['ID']['output'];
  allowedActions: Array<Permission>;
  roles: Array<Role>;
  token?: Maybe<Scalars['String']['output']>;
  type: BlockchainNetwork;
};

export type BindRoleToUSerMutationVariables = Exact<{
  roleId: Scalars['ID']['input'];
  address: Scalars['String']['input'];
}>;


export type BindRoleToUSerMutation = { __typename?: 'Mutation', role: { __typename?: 'Role', bindToUser: { __typename?: 'Web3User', allowedActions: Array<{ __typename?: 'Permission', action: PermissionAction, resource: PermissionResource }> } } };

export type CreateRoleMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateRoleMutation = { __typename?: 'Mutation', createRole: { __typename?: 'Role', id: string, name: string, userCount: number, permissions: Array<{ __typename?: 'Permission', action: PermissionAction, resource: PermissionResource }> } };

export type CreateCollectionMutationVariables = Exact<{
  input: CollectionInput;
}>;


export type CreateCollectionMutation = { __typename?: 'Mutation', createCollection: { __typename?: 'Collection', id: string, name: string, totalCount: number, maxSupply: number } };

export type UpdateMetadataMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  metadata: Array<KeyValueInput> | KeyValueInput;
}>;


export type UpdateMetadataMutation = { __typename?: 'Mutation', collection: { __typename?: 'Collection', updateMetadata: { __typename?: 'Collection', metadata: Array<{ __typename?: 'KeyValue', key: string, value: string }> } } };

export type AxolotlFundingRequestMutationVariables = Exact<{
  request: AxolotlClaimRequest;
}>;


export type AxolotlFundingRequestMutation = { __typename?: 'Mutation', axolotlFundingClaimRequest: Array<{ __typename?: 'AxolotlFunding', inscriptionFunding?: { __typename?: 'InscriptionFunding', id: string, fundingAddress: string, fundingAmountSats: number, fundingAmountBtc: string } | null }> };

export type BitcoinNonceMutationVariables = Exact<{
  address: Scalars['ID']['input'];
}>;


export type BitcoinNonceMutation = { __typename?: 'Mutation', nonceBitcoin: { __typename?: 'Nonce', nonce: string, messageToSign: string, domain: string, expiration: string, issuedAt: string, uri: string, pubKey: string } };

export type EthereumNonceMutationVariables = Exact<{
  address: Scalars['ID']['input'];
  chainId: Scalars['Int']['input'];
}>;


export type EthereumNonceMutation = { __typename?: 'Mutation', nonceEthereum: { __typename?: 'Nonce', nonce: string, messageToSign: string, domain: string, expiration: string, issuedAt: string, uri: string, version?: string | null, pubKey: string } };

export type SiweMutationVariables = Exact<{
  address: Scalars['ID']['input'];
  jwe: Scalars['String']['input'];
}>;


export type SiweMutation = { __typename?: 'Mutation', siwe: { __typename?: 'Web3LoginUser', token: string } };


export const BindRoleToUSerDocument = gql`
    mutation BindRoleToUSer($roleId: ID!, $address: String!) {
  role(id: $roleId) {
    bindToUser(userAddress: $address) {
      allowedActions {
        action
        resource
      }
    }
  }
}
    `;
export const CreateRoleDocument = gql`
    mutation CreateRole {
  createRole(
    name: "super-admin"
    permissions: [{action: ADMIN, resource: ALL}, {action: USE, resource: ADMIN}]
  ) {
    id
    name
    userCount
    permissions {
      action
      resource
    }
  }
}
    `;
export const CreateCollectionDocument = gql`
    mutation CreateCollection($input: CollectionInput!) {
  createCollection(input: $input) {
    id
    name
    totalCount
    maxSupply
  }
}
    `;
export const UpdateMetadataDocument = gql`
    mutation UpdateMetadata($id: ID!, $metadata: [KeyValueInput!]!) {
  collection(id: $id) {
    updateMetadata(metadata: $metadata) {
      metadata {
        key
        value
      }
    }
  }
}
    `;
export const AxolotlFundingRequestDocument = gql`
    mutation AxolotlFundingRequest($request: AxolotlClaimRequest!) {
  axolotlFundingClaimRequest(request: $request) {
    inscriptionFunding {
      id
      fundingAddress
      fundingAmountSats
      fundingAmountBtc
    }
  }
}
    `;
export const BitcoinNonceDocument = gql`
    mutation BitcoinNonce($address: ID!) {
  nonceBitcoin(address: $address) {
    nonce
    messageToSign
    domain
    expiration
    issuedAt
    uri
    pubKey
  }
}
    `;
export const EthereumNonceDocument = gql`
    mutation EthereumNonce($address: ID!, $chainId: Int!) {
  nonceEthereum(address: $address, chainId: $chainId) {
    nonce
    messageToSign
    domain
    expiration
    issuedAt
    uri
    version
    pubKey
  }
}
    `;
export const SiweDocument = gql`
    mutation SIWE($address: ID!, $jwe: String!) {
  siwe(address: $address, jwe: $jwe) {
    token
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    BindRoleToUSer(variables: BindRoleToUSerMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<BindRoleToUSerMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<BindRoleToUSerMutation>(BindRoleToUSerDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'BindRoleToUSer', 'mutation');
    },
    CreateRole(variables?: CreateRoleMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CreateRoleMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateRoleMutation>(CreateRoleDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'CreateRole', 'mutation');
    },
    CreateCollection(variables: CreateCollectionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CreateCollectionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateCollectionMutation>(CreateCollectionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'CreateCollection', 'mutation');
    },
    UpdateMetadata(variables: UpdateMetadataMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateMetadataMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateMetadataMutation>(UpdateMetadataDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'UpdateMetadata', 'mutation');
    },
    AxolotlFundingRequest(variables: AxolotlFundingRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AxolotlFundingRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AxolotlFundingRequestMutation>(AxolotlFundingRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'AxolotlFundingRequest', 'mutation');
    },
    BitcoinNonce(variables: BitcoinNonceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<BitcoinNonceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<BitcoinNonceMutation>(BitcoinNonceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'BitcoinNonce', 'mutation');
    },
    EthereumNonce(variables: EthereumNonceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EthereumNonceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<EthereumNonceMutation>(EthereumNonceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'EthereumNonce', 'mutation');
    },
    SIWE(variables: SiweMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SiweMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SiweMutation>(SiweDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'SIWE', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
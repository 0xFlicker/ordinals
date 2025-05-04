import type * as Types from '../graphql/types';

import type { GraphQLClient } from 'graphql-request';
import type { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
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

export type Address = {
  __typename?: 'Address';
  address: Scalars['String']['output'];
  type: AddressType;
};

export enum AddressType {
  Btc = 'BTC',
  Evm = 'EVM'
}

export type AppInfo = {
  __typename?: 'AppInfo';
  name: Scalars['String']['output'];
  pubKey: Scalars['String']['output'];
};

export type AuthProblem = {
  __typename?: 'AuthProblem';
  message: Scalars['String']['output'];
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
  tokenIds: Array<Scalars['Int']['output']>;
};

export type AxolotlAvailableOpenEditionRequest = {
  collectionId: Scalars['ID']['input'];
  destinationAddress?: InputMaybe<Scalars['String']['input']>;
};

export type AxolotlClaimRequest = {
  claimingAddress: Scalars['String']['input'];
  collectionId: Scalars['ID']['input'];
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
};

export type AxolotlFeeEstimate = {
  __typename?: 'AxolotlFeeEstimate';
  feePerByte: Scalars['Int']['output'];
  tipPerTokenBtc: Scalars['String']['output'];
  tipPerTokenSats: Scalars['Int']['output'];
  totalFeeBtc: Scalars['String']['output'];
  totalFeeSats: Scalars['Int']['output'];
  totalInscriptionBtc: Scalars['String']['output'];
  totalInscriptionSats: Scalars['Int']['output'];
};

export type AxolotlFunding = {
  __typename?: 'AxolotlFunding';
  destinationAddress: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inscriptionFunding?: Maybe<InscriptionFunding>;
  tokenIds: Array<Scalars['Int']['output']>;
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

export type AxolotlOpenEditionResponse = {
  __typename?: 'AxolotlOpenEditionResponse';
  data?: Maybe<AxolotlFunding>;
  problems?: Maybe<Array<AxolotlProblem>>;
};

export type AxolotlProblem = {
  __typename?: 'AxolotlProblem';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
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
  parentInscription?: Maybe<CollectionParentInscription>;
  pendingCount: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
  updateMetadata: Collection;
};


export type CollectionUpdateMetadataArgs = {
  metadata: Array<KeyValueInput>;
};

export type CollectionInput = {
  meta?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  parentInscription?: InputMaybe<CollectionParentInscriptionInput>;
};

export type CollectionParentInscription = {
  __typename?: 'CollectionParentInscription';
  multipartUploadId?: Maybe<Scalars['String']['output']>;
  parentInscriptionContentType?: Maybe<Scalars['String']['output']>;
  parentInscriptionFileName?: Maybe<Scalars['String']['output']>;
  parentInscriptionId?: Maybe<Scalars['String']['output']>;
  uploadUrl?: Maybe<Scalars['String']['output']>;
};

export type CollectionParentInscriptionInput = {
  parentInscriptionContentType?: InputMaybe<Scalars['String']['input']>;
  parentInscriptionFileName?: InputMaybe<Scalars['String']['input']>;
  parentInscriptionId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateInscriptionProblem = {
  __typename?: 'CreateInscriptionProblem';
  code?: Maybe<Scalars['Int']['output']>;
  message: Scalars['String']['output'];
};

export type CreateInscriptionResponse = {
  __typename?: 'CreateInscriptionResponse';
  data?: Maybe<InscriptionFunding>;
  problems?: Maybe<Array<CreateInscriptionProblem>>;
};

export type FeeEstimate = {
  __typename?: 'FeeEstimate';
  fastest: Scalars['Int']['output'];
  halfHour: Scalars['Int']['output'];
  hour: Scalars['Int']['output'];
  minimum: Scalars['Int']['output'];
};

export enum FeeLevel {
  Glacial = 'GLACIAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export enum FundingStatus {
  Expired = 'EXPIRED',
  Funded = 'FUNDED',
  Funding = 'FUNDING',
  Genesis = 'GENESIS',
  Revealed = 'REVEALED'
}

export type InscriptionData = {
  __typename?: 'InscriptionData';
  base64Content?: Maybe<Scalars['String']['output']>;
  contentType: Scalars['String']['output'];
  textContent?: Maybe<Scalars['String']['output']>;
};

export type InscriptionDataInput = {
  inlineFile?: InputMaybe<InscriptionFileInlineInput>;
  metaJson?: InputMaybe<Scalars['String']['input']>;
  uploadedFile?: InputMaybe<InscriptionFileUploadedInput>;
};

export type InscriptionFileInlineInput = {
  base64Content: Scalars['String']['input'];
  contentType: Scalars['String']['input'];
};

export type InscriptionFileUploadedInput = {
  id: Scalars['String']['input'];
};

export type InscriptionFunding = {
  __typename?: 'InscriptionFunding';
  count: Scalars['Int']['output'];
  destinationAddress: Scalars['String']['output'];
  fee: Scalars['Int']['output'];
  fundingAddress: Scalars['String']['output'];
  fundingAmountBtc: Scalars['String']['output'];
  fundingAmountSats: Scalars['Int']['output'];
  fundingGenesisTxId?: Maybe<Scalars['String']['output']>;
  fundingGenesisTxUrl?: Maybe<Scalars['String']['output']>;
  fundingRefundTxId?: Maybe<Scalars['String']['output']>;
  fundingRefundTxUrl?: Maybe<Scalars['String']['output']>;
  fundingRevealTxId?: Maybe<Scalars['String']['output']>;
  fundingRevealTxUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  inscriptionContent: InscriptionData;
  inscriptionContents: Array<InscriptionData>;
  network: BitcoinNetwork;
  overhead: Scalars['Int']['output'];
  padding: Scalars['Int']['output'];
  qrSrc: Scalars['String']['output'];
  qrValue: Scalars['String']['output'];
  status: FundingStatus;
};


export type InscriptionFundingInscriptionContentArgs = {
  index: Scalars['Int']['input'];
};

export type InscriptionFundingProblem = {
  __typename?: 'InscriptionFundingProblem';
  code?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
};

export type InscriptionFundingQuery = {
  collectionId?: InputMaybe<Scalars['ID']['input']>;
  fundingStatus: FundingStatus;
  limit?: InputMaybe<Scalars['Int']['input']>;
  next?: InputMaybe<Scalars['String']['input']>;
};

export type InscriptionFundingsResult = {
  __typename?: 'InscriptionFundingsResult';
  count?: Maybe<Scalars['Int']['output']>;
  fundings?: Maybe<Array<InscriptionFunding>>;
  next?: Maybe<Scalars['String']['output']>;
  problems?: Maybe<Array<InscriptionFundingProblem>>;
};

export type InscriptionProblem = {
  __typename?: 'InscriptionProblem';
  code?: Maybe<Scalars['Int']['output']>;
  fileName: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
};

export type InscriptionRequestInput = {
  destinationAddress: Scalars['String']['input'];
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  files: Array<InscriptionDataInput>;
  network: BitcoinNetwork;
  parentInscriptionId?: InputMaybe<Scalars['String']['input']>;
};

export type InscriptionUploadData = {
  __typename?: 'InscriptionUploadData';
  files: Array<InscriptionUploadFileData>;
};

export type InscriptionUploadFileData = {
  __typename?: 'InscriptionUploadFileData';
  fileName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  multipartUploadId?: Maybe<Scalars['String']['output']>;
  uploadUrl?: Maybe<Scalars['String']['output']>;
};

export type InscriptionUploadFileRequest = {
  contentType: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
};

export type InscriptionUploadRequest = {
  files: Array<InscriptionUploadFileRequest>;
};

export type InscriptionUploadResponse = {
  __typename?: 'InscriptionUploadResponse';
  data?: Maybe<InscriptionUploadData>;
  problems?: Maybe<Array<InscriptionProblem>>;
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

export type LinkVerifiedAddressRequest = {
  address: Scalars['String']['input'];
  siwbJwe?: InputMaybe<Scalars['String']['input']>;
  siweJwe?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  axolotlFundingOpenEditionRequest: AxolotlOpenEditionResponse;
  collection: Collection;
  createCollection: Collection;
  createCollectionParentInscription: InscriptionFunding;
  createInscriptionRequest: CreateInscriptionResponse;
  createRole: Role;
  deleteCollection: Scalars['Boolean']['output'];
  nonceBitcoin: Nonce;
  nonceEthereum: Nonce;
  nonceFrame: Nonce;
  presale: PresaleResponse;
  role: Role;
  signInBitcoin: SignInBitcoinResponse;
  signOutBitcoin: Scalars['Boolean']['output'];
  signOutEthereum: Scalars['Boolean']['output'];
  signUpAnonymously: SignUpAnonymouslyResponse;
  siwb: SiwbResponse;
  siwe: SiweResponse;
  uploadInscription: InscriptionUploadResponse;
  user: Web3User;
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


export type MutationCreateCollectionParentInscriptionArgs = {
  bitcoinNetwork: BitcoinNetwork;
  collectionId: Scalars['ID']['input'];
};


export type MutationCreateInscriptionRequestArgs = {
  input: InscriptionRequestInput;
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


export type MutationNonceFrameArgs = {
  trustedBytes: Scalars['String']['input'];
};


export type MutationPresaleArgs = {
  request: PresaleRequest;
};


export type MutationRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSignInBitcoinArgs = {
  address: Scalars['ID']['input'];
  jwe: Scalars['String']['input'];
};


export type MutationSignUpAnonymouslyArgs = {
  request: SignUpAnonymouslyRequest;
};


export type MutationSiwbArgs = {
  address: Scalars['ID']['input'];
  jwe: Scalars['String']['input'];
};


export type MutationSiweArgs = {
  address: Scalars['ID']['input'];
  jwe: Scalars['String']['input'];
};


export type MutationUploadInscriptionArgs = {
  input: InscriptionUploadRequest;
};


export type MutationUserArgs = {
  id: Scalars['ID']['input'];
};

export type Nonce = {
  __typename?: 'Nonce';
  address: Address;
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
  Inscription = 'INSCRIPTION',
  Presale = 'PRESALE',
  Role = 'ROLE',
  User = 'USER'
}

export type PresaleProblem = {
  __typename?: 'PresaleProblem';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type PresaleQuery = {
  collectionId?: InputMaybe<Scalars['ID']['input']>;
  destinationAddress?: InputMaybe<Scalars['String']['input']>;
  farcasterVerifiedAddress?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  next?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PresaleStatus>;
};

export type PresaleRequest = {
  collectionId: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  destinationAddress: Scalars['String']['input'];
  farcasterFid?: InputMaybe<Scalars['Int']['input']>;
  farcasterVerifiedPayload?: InputMaybe<Scalars['String']['input']>;
  feeRate?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
};

export type PresaleResponse = {
  __typename?: 'PresaleResponse';
  data?: Maybe<PresaleResponseData>;
  problems?: Maybe<Array<PresaleProblem>>;
};

export type PresaleResponseData = {
  __typename?: 'PresaleResponseData';
  destinationAddress: Scalars['String']['output'];
  farcasterVerifiedAddress?: Maybe<Scalars['String']['output']>;
  fundingAddress: Scalars['String']['output'];
  fundingAmountBtc: Scalars['String']['output'];
  fundingAmountSats: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  network: BitcoinNetwork;
  status: PresaleStatus;
};

export enum PresaleStatus {
  Funded = 'FUNDED',
  Funding = 'FUNDING',
  Pending = 'PENDING',
  Sweeping = 'SWEEPING',
  Swept = 'SWEPT'
}

export type PresalesResult = {
  __typename?: 'PresalesResult';
  next?: Maybe<Scalars['String']['output']>;
  presales?: Maybe<Array<PresaleResponseData>>;
};

export type Query = {
  __typename?: 'Query';
  appInfo: AppInfo;
  axolotlAvailableOpenEditionFundingClaims: Array<AxolotlAvailableOpenEditionFunding>;
  axolotlEstimateFee: AxolotlFeeEstimate;
  checkUserExistsForAddress: Scalars['Boolean']['output'];
  checkUserExistsForHandle: Scalars['Boolean']['output'];
  collection: Collection;
  collections: Array<Collection>;
  currentBitcoinFees: FeeEstimate;
  inscriptionFunding?: Maybe<InscriptionFunding>;
  inscriptionFundings: InscriptionFundingsResult;
  presale?: Maybe<PresaleResponse>;
  presales: PresalesResult;
  role?: Maybe<Role>;
  roles: Array<Role>;
  self?: Maybe<Web3User>;
  signMultipartUpload: Scalars['String']['output'];
  user: Web3User;
};


export type QueryAxolotlAvailableOpenEditionFundingClaimsArgs = {
  request: AxolotlAvailableOpenEditionRequest;
};


export type QueryAxolotlEstimateFeeArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
};


export type QueryCheckUserExistsForAddressArgs = {
  address: Scalars['ID']['input'];
};


export type QueryCheckUserExistsForHandleArgs = {
  handle: Scalars['String']['input'];
};


export type QueryCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCurrentBitcoinFeesArgs = {
  network: BitcoinNetwork;
};


export type QueryInscriptionFundingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInscriptionFundingsArgs = {
  query: InscriptionFundingQuery;
};


export type QueryPresaleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPresalesArgs = {
  query: PresaleQuery;
};


export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySignMultipartUploadArgs = {
  partNumber: Scalars['Int']['input'];
  uploadId: Scalars['String']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
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
  userId: Scalars['String']['input'];
};


export type RoleRemovePermissionsArgs = {
  permissions: Array<PermissionInput>;
};


export type RoleUnbindFromUserArgs = {
  userId: Scalars['String']['input'];
};

export type SignInBitcoinResponse = {
  __typename?: 'SignInBitcoinResponse';
  problems?: Maybe<Array<AuthProblem>>;
  user?: Maybe<Web3User>;
};

export type SignUpAnonymouslyRequest = {
  handle: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type SignUpAnonymouslyResponse = {
  __typename?: 'SignUpAnonymouslyResponse';
  problems?: Maybe<Array<AuthProblem>>;
  user?: Maybe<Web3User>;
};

export type SiwbData = {
  __typename?: 'SiwbData';
  token: Scalars['String']['output'];
  type: SiweResponseType;
  user?: Maybe<Web3User>;
};

export type SiwbResponse = {
  __typename?: 'SiwbResponse';
  data?: Maybe<SiwbData>;
  problems?: Maybe<Array<AuthProblem>>;
};

export type SiweData = {
  __typename?: 'SiweData';
  token: Scalars['String']['output'];
  type: SiweResponseType;
  user?: Maybe<Web3User>;
};

export type SiweResponse = {
  __typename?: 'SiweResponse';
  data?: Maybe<SiweData>;
  problems?: Maybe<Array<AuthProblem>>;
};

export enum SiweResponseType {
  ExistingUser = 'EXISTING_USER',
  LinkedUserRequest = 'LINKED_USER_REQUEST',
  NewUser = 'NEW_USER'
}

export enum Web3Namespace {
  Siwb = 'SIWB',
  Siwe = 'SIWE'
}

export type Web3User = {
  __typename?: 'Web3User';
  addresses: Array<Address>;
  allowedActions: Array<Permission>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  linkVerifiedAddress: Web3User;
  roles: Array<Role>;
  token?: Maybe<Scalars['String']['output']>;
};


export type Web3UserLinkVerifiedAddressArgs = {
  request: LinkVerifiedAddressRequest;
};

export type GetAppInfoQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetAppInfoQuery = { __typename?: 'Query', appInfo: { __typename?: 'AppInfo', pubKey: string, issuer: string } };

export type GetUserQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type GetUserQuery = { __typename?: 'Query', user: { __typename?: 'Web3User', id: string, token?: string | null, handle: string, addresses: Array<{ __typename?: 'Address', address: string, type: Types.AddressType }>, roles: Array<{ __typename?: 'Role', id: string, name: string }>, allowedActions: Array<{ __typename?: 'Permission', action: Types.PermissionAction, resource: Types.PermissionResource, identifier?: string | null }> } };

export type GetUserHandleQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type GetUserHandleQuery = { __typename?: 'Query', user: { __typename?: 'Web3User', handle: string } };


export const GetAppInfoDocument = gql`
    query getAppInfo {
  appInfo {
    pubKey
    issuer: name
  }
}
    `;
export const GetUserDocument = gql`
    query getUser($id: ID!) {
  user(id: $id) {
    id
    addresses {
      address
      type
    }
    roles {
      id
      name
    }
    allowedActions {
      action
      resource
      identifier
    }
    token
    handle
  }
}
    `;
export const GetUserHandleDocument = gql`
    query getUserHandle($id: ID!) {
  user(id: $id) {
    handle
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    getAppInfo(variables?: GetAppInfoQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetAppInfoQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAppInfoQuery>(GetAppInfoDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getAppInfo', 'query');
    },
    getUser(variables: GetUserQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetUserQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserQuery>(GetUserDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getUser', 'query');
    },
    getUserHandle(variables: GetUserHandleQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetUserHandleQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserHandleQuery>(GetUserHandleDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getUserHandle', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
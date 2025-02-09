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

export type AppInfo = {
  __typename?: 'AppInfo';
  name: Scalars['String']['output'];
  pubKey: Scalars['String']['output'];
};

export type AssociatedAddresses = {
  __typename?: 'AssociatedAddresses';
  evmSignedAddress: Array<Scalars['ID']['output']>;
  frameFid?: Maybe<Scalars['ID']['output']>;
  frameVerifiedAddresses?: Maybe<Array<Scalars['ID']['output']>>;
  taprootAddress: Array<Scalars['ID']['output']>;
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
  maxSupply: Scalars['Int']['input'];
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
  base64Content?: InputMaybe<Scalars['String']['input']>;
  contentType: Scalars['String']['input'];
  textContent?: InputMaybe<Scalars['String']['input']>;
};

export type InscriptionFunding = {
  __typename?: 'InscriptionFunding';
  destinationAddress: Scalars['String']['output'];
  fundingAddress: Scalars['String']['output'];
  fundingAmountBtc: Scalars['String']['output'];
  fundingAmountSats: Scalars['Int']['output'];
  fundingGenesisTxId?: Maybe<Scalars['String']['output']>;
  fundingGenesisTxUrl?: Maybe<Scalars['String']['output']>;
  fundingRevealTxIds?: Maybe<Array<Scalars['String']['output']>>;
  fundingRevealTxUrls?: Maybe<Array<Scalars['String']['output']>>;
  fundingTxId?: Maybe<Scalars['String']['output']>;
  fundingTxUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  inscriptionContent: InscriptionData;
  inscriptionTransaction: InscriptionTransaction;
  network: BitcoinNetwork;
  qrSrc: Scalars['String']['output'];
  qrValue: Scalars['String']['output'];
  status: FundingStatus;
};


export type InscriptionFundingInscriptionContentArgs = {
  tapKey: Scalars['String']['input'];
};

export type InscriptionFundingProblem = {
  __typename?: 'InscriptionFundingProblem';
  code?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
};

export type InscriptionFundingQuery = {
  collectionId?: InputMaybe<Scalars['ID']['input']>;
  fundingStatus?: InputMaybe<FundingStatus>;
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

export type InscriptionRequest = {
  destinationAddress: Scalars['String']['input'];
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  files: Array<InscriptionDataInput>;
  network: BitcoinNetwork;
};

export type InscriptionTransaction = {
  __typename?: 'InscriptionTransaction';
  count: Scalars['Int']['output'];
  initCBlock: Scalars['String']['output'];
  initLeaf: Scalars['String']['output'];
  initScript: Array<BitcoinScriptItem>;
  initTapKey: Scalars['String']['output'];
  inscriptions: Array<InscriptionTransactionContent>;
  overhead: Scalars['Int']['output'];
  padding: Scalars['Int']['output'];
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
  axolotlFundingOpenEditionRequest: AxolotlOpenEditionResponse;
  collection: Collection;
  createCollection: Collection;
  createCollectionParentInscription: InscriptionFunding;
  createRole: Role;
  deleteCollection: Scalars['Boolean']['output'];
  nonceBitcoin: Nonce;
  nonceEthereum: Nonce;
  nonceFrame: Nonce;
  openCollectionClaim: OpenCollectionClaimResponse;
  openCollectionCreate: OpenCollectionCreateResponse;
  openCollectionCreatorUpload: OpenCollectionUploadResponse;
  presale: PresaleResponse;
  role: Role;
  signOutBitcoin: Scalars['Boolean']['output'];
  signOutEthereum: Scalars['Boolean']['output'];
  siwb: Web3LoginUser;
  siwe: Web3LoginUser;
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


export type MutationOpenCollectionClaimArgs = {
  request: OpenCollectionClaimRequest;
};


export type MutationOpenCollectionCreateArgs = {
  request: OpenCollectionCreateRequest;
};


export type MutationOpenCollectionCreatorUploadArgs = {
  request: OpenCollectionCreatorUploadRequest;
};


export type MutationPresaleArgs = {
  request: PresaleRequest;
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

export type OpenCollectionAvailableClaimedRequest = {
  claimingAddress: Scalars['String']['input'];
  collectionId: Scalars['ID']['input'];
  destinationAddress?: InputMaybe<Scalars['String']['input']>;
};

export type OpenCollectionAvailableFunding = {
  __typename?: 'OpenCollectionAvailableFunding';
  destinationAddress: Scalars['String']['output'];
  funding?: Maybe<InscriptionFunding>;
  id: Scalars['ID']['output'];
  network?: Maybe<BitcoinNetwork>;
  status: FundingStatus;
  tokenIds: Array<Scalars['Int']['output']>;
};

export type OpenCollectionAvailableRequest = {
  collectionId: Scalars['ID']['input'];
  destinationAddress: Scalars['String']['input'];
};

export type OpenCollectionClaimRequest = {
  claimingAddress: Scalars['String']['input'];
  collectionId: Scalars['ID']['input'];
  destinationAddress?: InputMaybe<Scalars['String']['input']>;
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
};

export type OpenCollectionClaimResponse = {
  __typename?: 'OpenCollectionClaimResponse';
  data?: Maybe<OpenCollectionData>;
  problems?: Maybe<Array<OpenCollectionProblem>>;
};

export type OpenCollectionClaimedFunding = {
  __typename?: 'OpenCollectionClaimedFunding';
  claimingAddress: Scalars['String']['output'];
  destinationAddress: Scalars['String']['output'];
  funding?: Maybe<InscriptionFunding>;
  id: Scalars['ID']['output'];
  network?: Maybe<BitcoinNetwork>;
  status: FundingStatus;
  tokenId?: Maybe<Scalars['Int']['output']>;
};

export type OpenCollectionContents = {
  __typename?: 'OpenCollectionContents';
  tokenId: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

export type OpenCollectionContentsResponse = {
  __typename?: 'OpenCollectionContentsResponse';
  cursor?: Maybe<Scalars['String']['output']>;
  data?: Maybe<Array<OpenCollectionContents>>;
  page: Scalars['Int']['output'];
  problems?: Maybe<Array<OpenCollectionProblem>>;
  totalCount: Scalars['Int']['output'];
};

export type OpenCollectionCreateData = {
  __typename?: 'OpenCollectionCreateData';
  id: Scalars['ID']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type OpenCollectionCreateRequest = {
  description?: InputMaybe<Scalars['String']['input']>;
  maxSupply: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  parentInscriptionId?: InputMaybe<Scalars['ID']['input']>;
  requestParentInscription?: InputMaybe<Scalars['Boolean']['input']>;
};

export type OpenCollectionCreateResponse = {
  __typename?: 'OpenCollectionCreateResponse';
  data?: Maybe<OpenCollectionCreateData>;
  problems?: Maybe<Array<OpenCollectionProblem>>;
};

export type OpenCollectionCreatorUploadRequest = {
  collectionId: Scalars['ID']['input'];
  tokenIds: Array<Scalars['Int']['input']>;
};

export type OpenCollectionData = {
  __typename?: 'OpenCollectionData';
  destinationAddress: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inscriptionFunding?: Maybe<InscriptionFunding>;
  tokenIds: Array<Scalars['Int']['output']>;
};

export type OpenCollectionFeeEstimate = {
  __typename?: 'OpenCollectionFeeEstimate';
  feePerByte: Scalars['Int']['output'];
  tipPerTokenBtc: Scalars['String']['output'];
  tipPerTokenSats: Scalars['Int']['output'];
  totalFeeBtc: Scalars['String']['output'];
  totalFeeSats: Scalars['Int']['output'];
  totalInscriptionBtc: Scalars['String']['output'];
  totalInscriptionSats: Scalars['Int']['output'];
};

export type OpenCollectionProblem = {
  __typename?: 'OpenCollectionProblem';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type OpenCollectionResponse = {
  __typename?: 'OpenCollectionResponse';
  data?: Maybe<OpenCollectionData>;
  problems?: Maybe<Array<OpenCollectionProblem>>;
};

export type OpenCollectionUploadData = {
  __typename?: 'OpenCollectionUploadData';
  uploadUrls: Array<Scalars['String']['output']>;
};

export type OpenCollectionUploadResponse = {
  __typename?: 'OpenCollectionUploadResponse';
  data?: Maybe<OpenCollectionUploadData>;
  problems?: Maybe<Array<OpenCollectionProblem>>;
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
  collection: Collection;
  collections: Array<Collection>;
  currentBitcoinFees: FeeEstimate;
  inscriptionFunding?: Maybe<InscriptionFunding>;
  inscriptionFundings: InscriptionFundingsResult;
  inscriptionTransaction?: Maybe<InscriptionTransaction>;
  openCollectionAvailableClaimedFundingClaims: Array<OpenCollectionClaimedFunding>;
  openCollectionAvailableFundingClaims: Array<OpenCollectionAvailableFunding>;
  openCollectionContents: OpenCollectionContentsResponse;
  openCollectionEstimateFee: OpenCollectionFeeEstimate;
  presale?: Maybe<PresaleResponse>;
  presales: PresalesResult;
  role?: Maybe<Role>;
  roles: Array<Role>;
  self?: Maybe<Web3User>;
  signMultipartUpload: Scalars['String']['output'];
  userByAddress: Web3User;
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


export type QueryInscriptionTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOpenCollectionAvailableClaimedFundingClaimsArgs = {
  request: OpenCollectionAvailableClaimedRequest;
};


export type QueryOpenCollectionAvailableFundingClaimsArgs = {
  request: OpenCollectionAvailableRequest;
};


export type QueryOpenCollectionContentsArgs = {
  collectionId: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  tokenIds?: InputMaybe<Array<Scalars['Int']['input']>>;
};


export type QueryOpenCollectionEstimateFeeArgs = {
  collectionId: Scalars['ID']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
  feeLevel?: InputMaybe<FeeLevel>;
  feePerByte?: InputMaybe<Scalars['Int']['input']>;
  network: BitcoinNetwork;
  tokenIds?: InputMaybe<Array<Scalars['Int']['input']>>;
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
  fileName: Scalars['String']['input'];
  multipartUploadId: Scalars['String']['input'];
  partNumber: Scalars['Int']['input'];
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

export type Web3LoginUser = {
  __typename?: 'Web3LoginUser';
  address: Scalars['ID']['output'];
  token: Scalars['String']['output'];
  user: Web3User;
};

export type Web3User = {
  __typename?: 'Web3User';
  allowedActions: Array<Permission>;
  associatedAddresses: AssociatedAddresses;
  id: Scalars['ID']['output'];
  roles: Array<Role>;
  token?: Maybe<Scalars['String']['output']>;
};

export type OpenEditionClaimMutationVariables = Exact<{
  request: AxolotlOpenEditionRequest;
}>;


export type OpenEditionClaimMutation = { __typename?: 'Mutation', axolotlFundingOpenEditionRequest: { __typename?: 'AxolotlOpenEditionResponse', problems?: Array<{ __typename?: 'AxolotlProblem', code: string, message: string }> | null, data?: { __typename?: 'AxolotlFunding', id: string, tokenIds: Array<number>, inscriptionFunding?: { __typename?: 'InscriptionFunding', id: string, fundingAddress: string, fundingAmountSats: number } | null } | null } };

export type FeeEstimateQueryVariables = Exact<{
  network: BitcoinNetwork;
}>;


export type FeeEstimateQuery = { __typename?: 'Query', currentBitcoinFees: { __typename?: 'FeeEstimate', minimum: number, fastest: number, halfHour: number, hour: number } };

export type PresaleCollectionQueryVariables = Exact<{
  collectionId: Scalars['ID']['input'];
}>;


export type PresaleCollectionQuery = { __typename?: 'Query', collection: { __typename?: 'Collection', id: string, name: string, metadata: Array<{ __typename?: 'KeyValue', key: string, value: string }> } };

export type PresaleRequestMutationVariables = Exact<{
  request: PresaleRequest;
}>;


export type PresaleRequestMutation = { __typename?: 'Mutation', presale: { __typename?: 'PresaleResponse', problems?: Array<{ __typename?: 'PresaleProblem', code: string, message: string }> | null, data?: { __typename?: 'PresaleResponseData', id: string, fundingAmountBtc: string, fundingAmountSats: number, fundingAddress: string, destinationAddress: string, network: BitcoinNetwork, farcasterVerifiedAddress?: string | null, status: PresaleStatus } | null } };


export const OpenEditionClaimDocument = gql`
    mutation openEditionClaim($request: AxolotlOpenEditionRequest!) {
  axolotlFundingOpenEditionRequest(request: $request) {
    problems {
      code
      message
    }
    data {
      id
      inscriptionFunding {
        id
        fundingAddress
        fundingAmountSats
      }
      tokenIds
    }
  }
}
    `;
export const FeeEstimateDocument = gql`
    query feeEstimate($network: BitcoinNetwork!) {
  currentBitcoinFees(network: $network) {
    minimum
    fastest
    halfHour
    hour
  }
}
    `;
export const PresaleCollectionDocument = gql`
    query presaleCollection($collectionId: ID!) {
  collection(id: $collectionId) {
    id
    name
    metadata {
      key
      value
    }
  }
}
    `;
export const PresaleRequestDocument = gql`
    mutation presaleRequest($request: PresaleRequest!) {
  presale(request: $request) {
    problems {
      code
      message
    }
    data {
      id
      fundingAmountBtc
      fundingAmountSats
      fundingAddress
      destinationAddress
      network
      farcasterVerifiedAddress
      status
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    openEditionClaim(variables: OpenEditionClaimMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OpenEditionClaimMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<OpenEditionClaimMutation>(OpenEditionClaimDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'openEditionClaim', 'mutation');
    },
    feeEstimate(variables: FeeEstimateQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<FeeEstimateQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<FeeEstimateQuery>(FeeEstimateDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'feeEstimate', 'query');
    },
    presaleCollection(variables: PresaleCollectionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PresaleCollectionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PresaleCollectionQuery>(PresaleCollectionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'presaleCollection', 'query');
    },
    presaleRequest(variables: PresaleRequestMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PresaleRequestMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<PresaleRequestMutation>(PresaleRequestDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'presaleRequest', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
/* eslint-disable */
import type { GraphQLResolveInfo } from 'graphql';
import type { InscriptionFundingModel } from '../modules/inscriptionFunding/models.js';
import type { InscriptionTransactionContentModel } from '../modules/inscriptionRequest/models.js';
import type { RoleModel } from '../modules/permissions/models.js';
import type { Web3UserModel, Web3LoginUserModel } from '../modules/user/models.js';
import type { CollectionModel } from '../modules/collections/models.js';
import type { Context } from '../context/index.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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

export type BitcoinNetwork =
  | 'MAINNET'
  | 'REGTEST'
  | 'TESTNET';

export type BitcoinScriptItem = {
  __typename?: 'BitcoinScriptItem';
  base64?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
};

export type BlockchainNetwork =
  | 'BITCOIN'
  | 'ETHEREUM';

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

export type FeeLevel =
  | 'GLACIAL'
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM';

export type FundingStatus =
  | 'EXPIRED'
  | 'FUNDED'
  | 'FUNDING'
  | 'GENESIS'
  | 'REVEALED';

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
  signOutBitcoin: Scalars['Boolean']['output'];
  signOutEthereum: Scalars['Boolean']['output'];
  siwb: Web3LoginUser;
  siwe: Web3LoginUser;
  uploadInscription: InscriptionUploadResponse;
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

export type PermissionAction =
  | 'ADMIN'
  | 'CREATE'
  | 'DELETE'
  | 'GET'
  | 'LIST'
  | 'UPDATE'
  | 'USE';

export type PermissionInput = {
  action: PermissionAction;
  identifier?: InputMaybe<Scalars['String']['input']>;
  resource: PermissionResource;
};

export type PermissionResource =
  | 'ADMIN'
  | 'AFFILIATE'
  | 'ALL'
  | 'COLLECTION'
  | 'PRESALE'
  | 'ROLE'
  | 'USER';

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

export type PresaleStatus =
  | 'FUNDED'
  | 'FUNDING'
  | 'PENDING'
  | 'SWEEPING'
  | 'SWEPT';

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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AppInfo: ResolverTypeWrapper<AppInfo>;
  AssociatedAddresses: ResolverTypeWrapper<AssociatedAddresses>;
  AxolotlAvailableClaimedFunding: ResolverTypeWrapper<Omit<AxolotlAvailableClaimedFunding, 'funding'> & { funding?: Maybe<ResolversTypes['InscriptionFunding']> }>;
  AxolotlAvailableClaimedRequest: AxolotlAvailableClaimedRequest;
  AxolotlAvailableOpenEditionFunding: ResolverTypeWrapper<Omit<AxolotlAvailableOpenEditionFunding, 'funding'> & { funding?: Maybe<ResolversTypes['InscriptionFunding']> }>;
  AxolotlAvailableOpenEditionRequest: AxolotlAvailableOpenEditionRequest;
  AxolotlClaimRequest: AxolotlClaimRequest;
  AxolotlFeeEstimate: ResolverTypeWrapper<AxolotlFeeEstimate>;
  AxolotlFunding: ResolverTypeWrapper<Omit<AxolotlFunding, 'inscriptionFunding'> & { inscriptionFunding?: Maybe<ResolversTypes['InscriptionFunding']> }>;
  AxolotlFundingPage: ResolverTypeWrapper<Omit<AxolotlFundingPage, 'items'> & { items?: Maybe<Array<Maybe<ResolversTypes['AxolotlFunding']>>> }>;
  AxolotlOpenEditionRequest: AxolotlOpenEditionRequest;
  AxolotlOpenEditionResponse: ResolverTypeWrapper<Omit<AxolotlOpenEditionResponse, 'data'> & { data?: Maybe<ResolversTypes['AxolotlFunding']> }>;
  AxolotlProblem: ResolverTypeWrapper<AxolotlProblem>;
  BitcoinNetwork: BitcoinNetwork;
  BitcoinScriptItem: ResolverTypeWrapper<BitcoinScriptItem>;
  BlockchainNetwork: BlockchainNetwork;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Collection: ResolverTypeWrapper<CollectionModel>;
  CollectionInput: CollectionInput;
  CollectionParentInscription: ResolverTypeWrapper<CollectionParentInscription>;
  CollectionParentInscriptionInput: CollectionParentInscriptionInput;
  CreateInscriptionProblem: ResolverTypeWrapper<CreateInscriptionProblem>;
  CreateInscriptionResponse: ResolverTypeWrapper<Omit<CreateInscriptionResponse, 'data'> & { data?: Maybe<ResolversTypes['InscriptionFunding']> }>;
  FeeEstimate: ResolverTypeWrapper<FeeEstimate>;
  FeeLevel: FeeLevel;
  FundingStatus: FundingStatus;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InscriptionData: ResolverTypeWrapper<InscriptionData>;
  InscriptionDataInput: InscriptionDataInput;
  InscriptionFileInlineInput: InscriptionFileInlineInput;
  InscriptionFileUploadedInput: InscriptionFileUploadedInput;
  InscriptionFunding: ResolverTypeWrapper<InscriptionFundingModel>;
  InscriptionFundingProblem: ResolverTypeWrapper<InscriptionFundingProblem>;
  InscriptionFundingQuery: InscriptionFundingQuery;
  InscriptionFundingsResult: ResolverTypeWrapper<Omit<InscriptionFundingsResult, 'fundings'> & { fundings?: Maybe<Array<ResolversTypes['InscriptionFunding']>> }>;
  InscriptionProblem: ResolverTypeWrapper<InscriptionProblem>;
  InscriptionRequestInput: InscriptionRequestInput;
  InscriptionUploadData: ResolverTypeWrapper<InscriptionUploadData>;
  InscriptionUploadFileData: ResolverTypeWrapper<InscriptionUploadFileData>;
  InscriptionUploadFileRequest: InscriptionUploadFileRequest;
  InscriptionUploadRequest: InscriptionUploadRequest;
  InscriptionUploadResponse: ResolverTypeWrapper<InscriptionUploadResponse>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  KeyValue: ResolverTypeWrapper<KeyValue>;
  KeyValueInput: KeyValueInput;
  Mutation: ResolverTypeWrapper<{}>;
  Nonce: ResolverTypeWrapper<Nonce>;
  Permission: ResolverTypeWrapper<Permission>;
  PermissionAction: PermissionAction;
  PermissionInput: PermissionInput;
  PermissionResource: PermissionResource;
  PresaleProblem: ResolverTypeWrapper<PresaleProblem>;
  PresaleQuery: PresaleQuery;
  PresaleRequest: PresaleRequest;
  PresaleResponse: ResolverTypeWrapper<PresaleResponse>;
  PresaleResponseData: ResolverTypeWrapper<PresaleResponseData>;
  PresaleStatus: PresaleStatus;
  PresalesResult: ResolverTypeWrapper<PresalesResult>;
  Query: ResolverTypeWrapper<{}>;
  Role: ResolverTypeWrapper<RoleModel>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Web3LoginUser: ResolverTypeWrapper<Web3LoginUserModel>;
  Web3User: ResolverTypeWrapper<Web3UserModel>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AppInfo: AppInfo;
  AssociatedAddresses: AssociatedAddresses;
  AxolotlAvailableClaimedFunding: Omit<AxolotlAvailableClaimedFunding, 'funding'> & { funding?: Maybe<ResolversParentTypes['InscriptionFunding']> };
  AxolotlAvailableClaimedRequest: AxolotlAvailableClaimedRequest;
  AxolotlAvailableOpenEditionFunding: Omit<AxolotlAvailableOpenEditionFunding, 'funding'> & { funding?: Maybe<ResolversParentTypes['InscriptionFunding']> };
  AxolotlAvailableOpenEditionRequest: AxolotlAvailableOpenEditionRequest;
  AxolotlClaimRequest: AxolotlClaimRequest;
  AxolotlFeeEstimate: AxolotlFeeEstimate;
  AxolotlFunding: Omit<AxolotlFunding, 'inscriptionFunding'> & { inscriptionFunding?: Maybe<ResolversParentTypes['InscriptionFunding']> };
  AxolotlFundingPage: Omit<AxolotlFundingPage, 'items'> & { items?: Maybe<Array<Maybe<ResolversParentTypes['AxolotlFunding']>>> };
  AxolotlOpenEditionRequest: AxolotlOpenEditionRequest;
  AxolotlOpenEditionResponse: Omit<AxolotlOpenEditionResponse, 'data'> & { data?: Maybe<ResolversParentTypes['AxolotlFunding']> };
  AxolotlProblem: AxolotlProblem;
  BitcoinScriptItem: BitcoinScriptItem;
  Boolean: Scalars['Boolean']['output'];
  Collection: CollectionModel;
  CollectionInput: CollectionInput;
  CollectionParentInscription: CollectionParentInscription;
  CollectionParentInscriptionInput: CollectionParentInscriptionInput;
  CreateInscriptionProblem: CreateInscriptionProblem;
  CreateInscriptionResponse: Omit<CreateInscriptionResponse, 'data'> & { data?: Maybe<ResolversParentTypes['InscriptionFunding']> };
  FeeEstimate: FeeEstimate;
  ID: Scalars['ID']['output'];
  InscriptionData: InscriptionData;
  InscriptionDataInput: InscriptionDataInput;
  InscriptionFileInlineInput: InscriptionFileInlineInput;
  InscriptionFileUploadedInput: InscriptionFileUploadedInput;
  InscriptionFunding: InscriptionFundingModel;
  InscriptionFundingProblem: InscriptionFundingProblem;
  InscriptionFundingQuery: InscriptionFundingQuery;
  InscriptionFundingsResult: Omit<InscriptionFundingsResult, 'fundings'> & { fundings?: Maybe<Array<ResolversParentTypes['InscriptionFunding']>> };
  InscriptionProblem: InscriptionProblem;
  InscriptionRequestInput: InscriptionRequestInput;
  InscriptionUploadData: InscriptionUploadData;
  InscriptionUploadFileData: InscriptionUploadFileData;
  InscriptionUploadFileRequest: InscriptionUploadFileRequest;
  InscriptionUploadRequest: InscriptionUploadRequest;
  InscriptionUploadResponse: InscriptionUploadResponse;
  Int: Scalars['Int']['output'];
  KeyValue: KeyValue;
  KeyValueInput: KeyValueInput;
  Mutation: {};
  Nonce: Nonce;
  Permission: Permission;
  PermissionInput: PermissionInput;
  PresaleProblem: PresaleProblem;
  PresaleQuery: PresaleQuery;
  PresaleRequest: PresaleRequest;
  PresaleResponse: PresaleResponse;
  PresaleResponseData: PresaleResponseData;
  PresalesResult: PresalesResult;
  Query: {};
  Role: RoleModel;
  String: Scalars['String']['output'];
  Web3LoginUser: Web3LoginUserModel;
  Web3User: Web3UserModel;
};

export type AppInfoResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AppInfo'] = ResolversParentTypes['AppInfo']> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pubKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AssociatedAddressesResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AssociatedAddresses'] = ResolversParentTypes['AssociatedAddresses']> = {
  evmSignedAddress?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  frameFid?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  frameVerifiedAddresses?: Resolver<Maybe<Array<ResolversTypes['ID']>>, ParentType, ContextType>;
  taprootAddress?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlAvailableClaimedFundingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlAvailableClaimedFunding'] = ResolversParentTypes['AxolotlAvailableClaimedFunding']> = {
  claimingAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  destinationAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  funding?: Resolver<Maybe<ResolversTypes['InscriptionFunding']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  network?: Resolver<Maybe<ResolversTypes['BitcoinNetwork']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['FundingStatus'], ParentType, ContextType>;
  tokenId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlAvailableOpenEditionFundingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlAvailableOpenEditionFunding'] = ResolversParentTypes['AxolotlAvailableOpenEditionFunding']> = {
  destinationAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  funding?: Resolver<Maybe<ResolversTypes['InscriptionFunding']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  network?: Resolver<Maybe<ResolversTypes['BitcoinNetwork']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['FundingStatus'], ParentType, ContextType>;
  tokenIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlFeeEstimateResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlFeeEstimate'] = ResolversParentTypes['AxolotlFeeEstimate']> = {
  feePerByte?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tipPerTokenBtc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tipPerTokenSats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalFeeBtc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalFeeSats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalInscriptionBtc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalInscriptionSats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlFundingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlFunding'] = ResolversParentTypes['AxolotlFunding']> = {
  destinationAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inscriptionFunding?: Resolver<Maybe<ResolversTypes['InscriptionFunding']>, ParentType, ContextType>;
  tokenIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlFundingPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlFundingPage'] = ResolversParentTypes['AxolotlFundingPage']> = {
  cursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  items?: Resolver<Maybe<Array<Maybe<ResolversTypes['AxolotlFunding']>>>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlOpenEditionResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlOpenEditionResponse'] = ResolversParentTypes['AxolotlOpenEditionResponse']> = {
  data?: Resolver<Maybe<ResolversTypes['AxolotlFunding']>, ParentType, ContextType>;
  problems?: Resolver<Maybe<Array<ResolversTypes['AxolotlProblem']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AxolotlProblemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AxolotlProblem'] = ResolversParentTypes['AxolotlProblem']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BitcoinScriptItemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['BitcoinScriptItem'] = ResolversParentTypes['BitcoinScriptItem']> = {
  base64?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollectionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Collection'] = ResolversParentTypes['Collection']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maxSupply?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  metadata?: Resolver<Array<ResolversTypes['KeyValue']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentInscription?: Resolver<Maybe<ResolversTypes['CollectionParentInscription']>, ParentType, ContextType>;
  pendingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updateMetadata?: Resolver<ResolversTypes['Collection'], ParentType, ContextType, RequireFields<CollectionUpdateMetadataArgs, 'metadata'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollectionParentInscriptionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CollectionParentInscription'] = ResolversParentTypes['CollectionParentInscription']> = {
  multipartUploadId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentInscriptionContentType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentInscriptionFileName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentInscriptionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploadUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateInscriptionProblemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CreateInscriptionProblem'] = ResolversParentTypes['CreateInscriptionProblem']> = {
  code?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateInscriptionResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CreateInscriptionResponse'] = ResolversParentTypes['CreateInscriptionResponse']> = {
  data?: Resolver<Maybe<ResolversTypes['InscriptionFunding']>, ParentType, ContextType>;
  problems?: Resolver<Maybe<Array<ResolversTypes['CreateInscriptionProblem']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FeeEstimateResolvers<ContextType = Context, ParentType extends ResolversParentTypes['FeeEstimate'] = ResolversParentTypes['FeeEstimate']> = {
  fastest?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  halfHour?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  hour?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  minimum?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionDataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionData'] = ResolversParentTypes['InscriptionData']> = {
  base64Content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  contentType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionFundingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionFunding'] = ResolversParentTypes['InscriptionFunding']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  destinationAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fee?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fundingAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fundingAmountBtc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fundingAmountSats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fundingGenesisTxId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fundingGenesisTxUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fundingRevealTxId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fundingRevealTxUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inscriptionContent?: Resolver<ResolversTypes['InscriptionData'], ParentType, ContextType, RequireFields<InscriptionFundingInscriptionContentArgs, 'index'>>;
  inscriptionContents?: Resolver<Array<ResolversTypes['InscriptionData']>, ParentType, ContextType>;
  network?: Resolver<ResolversTypes['BitcoinNetwork'], ParentType, ContextType>;
  overhead?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  padding?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  qrSrc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qrValue?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['FundingStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionFundingProblemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionFundingProblem'] = ResolversParentTypes['InscriptionFundingProblem']> = {
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionFundingsResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionFundingsResult'] = ResolversParentTypes['InscriptionFundingsResult']> = {
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  fundings?: Resolver<Maybe<Array<ResolversTypes['InscriptionFunding']>>, ParentType, ContextType>;
  next?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  problems?: Resolver<Maybe<Array<ResolversTypes['InscriptionFundingProblem']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionProblemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionProblem'] = ResolversParentTypes['InscriptionProblem']> = {
  code?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  fileName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionUploadDataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionUploadData'] = ResolversParentTypes['InscriptionUploadData']> = {
  files?: Resolver<Array<ResolversTypes['InscriptionUploadFileData']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionUploadFileDataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionUploadFileData'] = ResolversParentTypes['InscriptionUploadFileData']> = {
  fileName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  multipartUploadId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploadUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InscriptionUploadResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['InscriptionUploadResponse'] = ResolversParentTypes['InscriptionUploadResponse']> = {
  data?: Resolver<Maybe<ResolversTypes['InscriptionUploadData']>, ParentType, ContextType>;
  problems?: Resolver<Maybe<Array<ResolversTypes['InscriptionProblem']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type KeyValueResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KeyValue'] = ResolversParentTypes['KeyValue']> = {
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  axolotlFundingOpenEditionRequest?: Resolver<ResolversTypes['AxolotlOpenEditionResponse'], ParentType, ContextType, RequireFields<MutationAxolotlFundingOpenEditionRequestArgs, 'request'>>;
  collection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType, RequireFields<MutationCollectionArgs, 'id'>>;
  createCollection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType, RequireFields<MutationCreateCollectionArgs, 'input'>>;
  createCollectionParentInscription?: Resolver<ResolversTypes['InscriptionFunding'], ParentType, ContextType, RequireFields<MutationCreateCollectionParentInscriptionArgs, 'bitcoinNetwork' | 'collectionId'>>;
  createInscriptionRequest?: Resolver<ResolversTypes['CreateInscriptionResponse'], ParentType, ContextType, RequireFields<MutationCreateInscriptionRequestArgs, 'input'>>;
  createRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationCreateRoleArgs, 'name'>>;
  deleteCollection?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteCollectionArgs, 'id'>>;
  nonceBitcoin?: Resolver<ResolversTypes['Nonce'], ParentType, ContextType, RequireFields<MutationNonceBitcoinArgs, 'address'>>;
  nonceEthereum?: Resolver<ResolversTypes['Nonce'], ParentType, ContextType, RequireFields<MutationNonceEthereumArgs, 'address' | 'chainId'>>;
  nonceFrame?: Resolver<ResolversTypes['Nonce'], ParentType, ContextType, RequireFields<MutationNonceFrameArgs, 'trustedBytes'>>;
  presale?: Resolver<ResolversTypes['PresaleResponse'], ParentType, ContextType, RequireFields<MutationPresaleArgs, 'request'>>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationRoleArgs, 'id'>>;
  signOutBitcoin?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  signOutEthereum?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  siwb?: Resolver<ResolversTypes['Web3LoginUser'], ParentType, ContextType, RequireFields<MutationSiwbArgs, 'address' | 'jwe'>>;
  siwe?: Resolver<ResolversTypes['Web3LoginUser'], ParentType, ContextType, RequireFields<MutationSiweArgs, 'address' | 'jwe'>>;
  uploadInscription?: Resolver<ResolversTypes['InscriptionUploadResponse'], ParentType, ContextType, RequireFields<MutationUploadInscriptionArgs, 'input'>>;
};

export type NonceResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Nonce'] = ResolversParentTypes['Nonce']> = {
  chainId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiration?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  issuedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageToSign?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nonce?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pubKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uri?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PermissionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Permission'] = ResolversParentTypes['Permission']> = {
  action?: Resolver<ResolversTypes['PermissionAction'], ParentType, ContextType>;
  identifier?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resource?: Resolver<ResolversTypes['PermissionResource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresaleProblemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PresaleProblem'] = ResolversParentTypes['PresaleProblem']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresaleResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PresaleResponse'] = ResolversParentTypes['PresaleResponse']> = {
  data?: Resolver<Maybe<ResolversTypes['PresaleResponseData']>, ParentType, ContextType>;
  problems?: Resolver<Maybe<Array<ResolversTypes['PresaleProblem']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresaleResponseDataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PresaleResponseData'] = ResolversParentTypes['PresaleResponseData']> = {
  destinationAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  farcasterVerifiedAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fundingAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fundingAmountBtc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fundingAmountSats?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  network?: Resolver<ResolversTypes['BitcoinNetwork'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PresaleStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresalesResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PresalesResult'] = ResolversParentTypes['PresalesResult']> = {
  next?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  presales?: Resolver<Maybe<Array<ResolversTypes['PresaleResponseData']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  appInfo?: Resolver<ResolversTypes['AppInfo'], ParentType, ContextType>;
  axolotlAvailableOpenEditionFundingClaims?: Resolver<Array<ResolversTypes['AxolotlAvailableOpenEditionFunding']>, ParentType, ContextType, RequireFields<QueryAxolotlAvailableOpenEditionFundingClaimsArgs, 'request'>>;
  axolotlEstimateFee?: Resolver<ResolversTypes['AxolotlFeeEstimate'], ParentType, ContextType, RequireFields<QueryAxolotlEstimateFeeArgs, 'network'>>;
  collection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType, RequireFields<QueryCollectionArgs, 'id'>>;
  collections?: Resolver<Array<ResolversTypes['Collection']>, ParentType, ContextType>;
  currentBitcoinFees?: Resolver<ResolversTypes['FeeEstimate'], ParentType, ContextType, RequireFields<QueryCurrentBitcoinFeesArgs, 'network'>>;
  inscriptionFunding?: Resolver<Maybe<ResolversTypes['InscriptionFunding']>, ParentType, ContextType, RequireFields<QueryInscriptionFundingArgs, 'id'>>;
  inscriptionFundings?: Resolver<ResolversTypes['InscriptionFundingsResult'], ParentType, ContextType, RequireFields<QueryInscriptionFundingsArgs, 'query'>>;
  presale?: Resolver<Maybe<ResolversTypes['PresaleResponse']>, ParentType, ContextType, RequireFields<QueryPresaleArgs, 'id'>>;
  presales?: Resolver<ResolversTypes['PresalesResult'], ParentType, ContextType, RequireFields<QueryPresalesArgs, 'query'>>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType, RequireFields<QueryRoleArgs, 'id'>>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  self?: Resolver<Maybe<ResolversTypes['Web3User']>, ParentType, ContextType>;
  signMultipartUpload?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<QuerySignMultipartUploadArgs, 'partNumber' | 'uploadId'>>;
  userByAddress?: Resolver<ResolversTypes['Web3User'], ParentType, ContextType, RequireFields<QueryUserByAddressArgs, 'address'>>;
};

export type RoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = {
  addPermissions?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<RoleAddPermissionsArgs, 'permissions'>>;
  bindToUser?: Resolver<ResolversTypes['Web3User'], ParentType, ContextType, RequireFields<RoleBindToUserArgs, 'userAddress'>>;
  delete?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType>;
  removePermissions?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<RoleRemovePermissionsArgs, 'permissions'>>;
  unbindFromUser?: Resolver<ResolversTypes['Web3User'], ParentType, ContextType, RequireFields<RoleUnbindFromUserArgs, 'userAddress'>>;
  userCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Web3LoginUserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Web3LoginUser'] = ResolversParentTypes['Web3LoginUser']> = {
  address?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['Web3User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Web3UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Web3User'] = ResolversParentTypes['Web3User']> = {
  allowedActions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType>;
  associatedAddresses?: Resolver<ResolversTypes['AssociatedAddresses'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  token?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  AppInfo?: AppInfoResolvers<ContextType>;
  AssociatedAddresses?: AssociatedAddressesResolvers<ContextType>;
  AxolotlAvailableClaimedFunding?: AxolotlAvailableClaimedFundingResolvers<ContextType>;
  AxolotlAvailableOpenEditionFunding?: AxolotlAvailableOpenEditionFundingResolvers<ContextType>;
  AxolotlFeeEstimate?: AxolotlFeeEstimateResolvers<ContextType>;
  AxolotlFunding?: AxolotlFundingResolvers<ContextType>;
  AxolotlFundingPage?: AxolotlFundingPageResolvers<ContextType>;
  AxolotlOpenEditionResponse?: AxolotlOpenEditionResponseResolvers<ContextType>;
  AxolotlProblem?: AxolotlProblemResolvers<ContextType>;
  BitcoinScriptItem?: BitcoinScriptItemResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  CollectionParentInscription?: CollectionParentInscriptionResolvers<ContextType>;
  CreateInscriptionProblem?: CreateInscriptionProblemResolvers<ContextType>;
  CreateInscriptionResponse?: CreateInscriptionResponseResolvers<ContextType>;
  FeeEstimate?: FeeEstimateResolvers<ContextType>;
  InscriptionData?: InscriptionDataResolvers<ContextType>;
  InscriptionFunding?: InscriptionFundingResolvers<ContextType>;
  InscriptionFundingProblem?: InscriptionFundingProblemResolvers<ContextType>;
  InscriptionFundingsResult?: InscriptionFundingsResultResolvers<ContextType>;
  InscriptionProblem?: InscriptionProblemResolvers<ContextType>;
  InscriptionUploadData?: InscriptionUploadDataResolvers<ContextType>;
  InscriptionUploadFileData?: InscriptionUploadFileDataResolvers<ContextType>;
  InscriptionUploadResponse?: InscriptionUploadResponseResolvers<ContextType>;
  KeyValue?: KeyValueResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Nonce?: NonceResolvers<ContextType>;
  Permission?: PermissionResolvers<ContextType>;
  PresaleProblem?: PresaleProblemResolvers<ContextType>;
  PresaleResponse?: PresaleResponseResolvers<ContextType>;
  PresaleResponseData?: PresaleResponseDataResolvers<ContextType>;
  PresalesResult?: PresalesResultResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  Web3LoginUser?: Web3LoginUserResolvers<ContextType>;
  Web3User?: Web3UserResolvers<ContextType>;
};


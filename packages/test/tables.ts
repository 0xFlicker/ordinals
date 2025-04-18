import { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export default [
  // Wallet table
  {
    TableName: "Wallet",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" as const },
      { AttributeName: "sk", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
      { AttributeName: "sk", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
  } as CreateTableCommandInput,

  // RBAC table
  {
    TableName: "RBAC",
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" as const }],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
      { AttributeName: "RoleName", AttributeType: "S" as const },
      { AttributeName: "ResourceType", AttributeType: "S" as const },
      { AttributeName: "ActionType", AttributeType: "S" as const },
      { AttributeName: "PermissionRoleID", AttributeType: "S" as const },
      { AttributeName: "CreatedAt", AttributeType: "N" as const },
      { AttributeName: "UserRoleID", AttributeType: "S" as const },
      { AttributeName: "Address", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    GlobalSecondaryIndexes: [
      {
        IndexName: "RolesByNameIndex",
        KeySchema: [{ AttributeName: "RoleName", KeyType: "HASH" as const }],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["RoleID"],
        },
      },
      {
        IndexName: "RoleByActionResourceIndex",
        KeySchema: [
          { AttributeName: "ResourceType", KeyType: "HASH" as const },
          { AttributeName: "ActionType", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["RoleID", "Identifier"],
        },
      },
      {
        IndexName: "PermissionRoleIDIndex",
        KeySchema: [
          { AttributeName: "PermissionRoleID", KeyType: "HASH" as const },
          { AttributeName: "CreatedAt", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["ActionType", "ResourceType", "Identifier"],
        },
      },
      {
        IndexName: "UserRoleIDIndex",
        KeySchema: [
          { AttributeName: "UserRoleID", KeyType: "HASH" as const },
          { AttributeName: "CreatedAt", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["Address"],
        },
      },
      {
        IndexName: "AddressIndex",
        KeySchema: [
          { AttributeName: "Address", KeyType: "HASH" as const },
          { AttributeName: "CreatedAt", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["UserRoleID"],
        },
      },
    ],
  } as CreateTableCommandInput,

  // UserNonce table
  {
    TableName: "UserNonce",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" as const },
      { AttributeName: "sk", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
      { AttributeName: "sk", AttributeType: "S" as const },
      { AttributeName: "TTL", AttributeType: "N" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    TimeToLiveSpecification: {
      AttributeName: "TTL",
      Enabled: true,
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [{ AttributeName: "sk", KeyType: "HASH" as const }],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["Nonce"],
        },
      },
    ],
  } as CreateTableCommandInput,

  // Funding table
  {
    TableName: "Funding",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" as const },
      { AttributeName: "sk", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
      { AttributeName: "sk", AttributeType: "S" as const },
      { AttributeName: "fundingStatus", AttributeType: "S" as const },
      { AttributeName: "nextCheckAt", AttributeType: "N" as const },
      { AttributeName: "fundedAt", AttributeType: "N" as const },
      { AttributeName: "collectionName", AttributeType: "S" as const },
      { AttributeName: "collectionId", AttributeType: "S" as const },
      { AttributeName: "destinationAddress", AttributeType: "S" as const },
      { AttributeName: "farcasterFid", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [{ AttributeName: "sk", KeyType: "HASH" as const }],
        Projection: {
          ProjectionType: "ALL" as const,
        },
      },
      {
        IndexName: "statusNextCheckAtIndex",
        KeySchema: [
          { AttributeName: "fundingStatus", KeyType: "HASH" as const },
          { AttributeName: "nextCheckAt", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: [
            "id",
            "address",
            "fundingAmountSat",
            "network",
            "createdAt",
          ],
        },
      },
      {
        IndexName: "statusFundedAtIndex",
        KeySchema: [
          { AttributeName: "fundingStatus", KeyType: "HASH" as const },
          { AttributeName: "fundedAt", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: [
            "id",
            "address",
            "fundingAmountSat",
            "network",
            "createdAt",
            "fundedAt",
            "sizeEstimate",
            "fundingTxid",
            "fundingVout",
          ],
        },
      },
      {
        IndexName: "collectionByName",
        KeySchema: [
          { AttributeName: "collectionName", KeyType: "HASH" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["collectionID", "maxSupply", "currentSupply"],
        },
      },
      {
        IndexName: "collectionId-index",
        KeySchema: [
          { AttributeName: "collectionId", KeyType: "HASH" as const },
          { AttributeName: "fundingStatus", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "INCLUDE" as const,
          NonKeyAttributes: ["address", "id", "fundingAmountSat"],
        },
      },
      {
        IndexName: "destination-address-collection-index",
        KeySchema: [
          { AttributeName: "destinationAddress", KeyType: "HASH" as const },
          { AttributeName: "collectionId", KeyType: "RANGE" as const },
        ],
        Projection: {
          ProjectionType: "ALL" as const,
        },
      },
      {
        IndexName: "farcasterFid-index",
        KeySchema: [
          { AttributeName: "farcasterFid", KeyType: "HASH" as const },
        ],
        Projection: {
          ProjectionType: "ALL" as const,
        },
      },
    ],
  } as CreateTableCommandInput,

  // Claims table
  {
    TableName: "Claims",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" as const },
      { AttributeName: "sk", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
      { AttributeName: "sk", AttributeType: "S" as const },
      { AttributeName: "ClaimedAddress", AttributeType: "S" as const },
      {
        AttributeName: "ClaimedAddressCollection",
        AttributeType: "S" as const,
      },
      { AttributeName: "ObservedBlockHeight", AttributeType: "N" as const },
      { AttributeName: "CollectionId", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    GlobalSecondaryIndexes: [
      {
        IndexName: "ClaimsByAddress",
        KeySchema: [
          { AttributeName: "ClaimedAddress", KeyType: "HASH" as const },
          { AttributeName: "sk", KeyType: "RANGE" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
      },
      {
        IndexName: "ClaimsByCollectionAddress",
        KeySchema: [
          {
            AttributeName: "ClaimedAddressCollection",
            KeyType: "HASH" as const,
          },
          { AttributeName: "sk", KeyType: "RANGE" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
      },
      {
        IndexName: "ObservedBlockHeight-index",
        KeySchema: [
          { AttributeName: "ObservedBlockHeight", KeyType: "HASH" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
      },
      {
        IndexName: "ClaimsByCollection",
        KeySchema: [
          { AttributeName: "CollectionId", KeyType: "HASH" as const },
          { AttributeName: "sk", KeyType: "RANGE" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
      },
    ],
  } as CreateTableCommandInput,

  // OpenEditionClaims table
  {
    TableName: "OpenEditionClaims",
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" as const },
      { AttributeName: "sk", KeyType: "RANGE" as const },
    ],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
      { AttributeName: "sk", AttributeType: "S" as const },
      { AttributeName: "gsi1pk", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "gsi1pk", KeyType: "HASH" as const },
          { AttributeName: "sk", KeyType: "RANGE" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
      },
    ],
  } as CreateTableCommandInput,

  // Batch table
  {
    TableName: "Batch",
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" as const }],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    TimeToLiveSpecification: {
      AttributeName: "TTL",
      Enabled: true,
    },
  } as CreateTableCommandInput,

  // Uploads table
  {
    TableName: "Uploads",
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" as const }],
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" as const },
    ],
    BillingMode: "PAY_PER_REQUEST" as const,
    TimeToLiveSpecification: {
      AttributeName: "TTL",
      Enabled: true,
    },
  } as CreateTableCommandInput,
];

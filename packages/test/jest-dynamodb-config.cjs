module.exports = {
  port: 8000,
  tables: [
    // Wallet table
    {
      TableName: "Wallet",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    },

    // RBAC table
    {
      TableName: "RBAC",
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "RoleName", AttributeType: "S" },
        { AttributeName: "ResourceType", AttributeType: "S" },
        { AttributeName: "ActionType", AttributeType: "S" },
        { AttributeName: "PermissionRoleID", AttributeType: "S" },
        { AttributeName: "CreatedAt", AttributeType: "N" },
        { AttributeName: "UserRoleID", AttributeType: "S" },
        { AttributeName: "Address", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      GlobalSecondaryIndexes: [
        {
          IndexName: "RolesByNameIndex",
          KeySchema: [{ AttributeName: "RoleName", KeyType: "HASH" }],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["RoleID"],
          },
        },
        {
          IndexName: "RoleByActionResourceIndex",
          KeySchema: [
            { AttributeName: "ResourceType", KeyType: "HASH" },
            { AttributeName: "ActionType", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["RoleID", "Identifier"],
          },
        },
        {
          IndexName: "PermissionRoleIDIndex",
          KeySchema: [
            { AttributeName: "PermissionRoleID", KeyType: "HASH" },
            { AttributeName: "CreatedAt", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["ActionType", "ResourceType", "Identifier"],
          },
        },
        {
          IndexName: "UserRoleIDIndex",
          KeySchema: [
            { AttributeName: "UserRoleID", KeyType: "HASH" },
            { AttributeName: "CreatedAt", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["Address"],
          },
        },
        {
          IndexName: "AddressIndex",
          KeySchema: [
            { AttributeName: "Address", KeyType: "HASH" },
            { AttributeName: "CreatedAt", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["UserRoleID"],
          },
        },
      ],
    },

    // UserNonce table
    {
      TableName: "UserNonce",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
        { AttributeName: "TTL", AttributeType: "N" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: {
        AttributeName: "TTL",
        Enabled: true,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [{ AttributeName: "sk", KeyType: "HASH" }],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["Nonce"],
          },
        },
      ],
    },

    // Funding table
    {
      TableName: "Funding",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
        { AttributeName: "fundingStatus", AttributeType: "S" },
        { AttributeName: "nextCheckAt", AttributeType: "N" },
        { AttributeName: "fundedAt", AttributeType: "N" },
        { AttributeName: "collectionName", AttributeType: "S" },
        { AttributeName: "collectionId", AttributeType: "S" },
        { AttributeName: "destinationAddress", AttributeType: "S" },
        { AttributeName: "farcasterFid", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [{ AttributeName: "sk", KeyType: "HASH" }],
          Projection: {
            ProjectionType: "ALL",
          },
        },
        {
          IndexName: "statusNextCheckAtIndex",
          KeySchema: [
            { AttributeName: "fundingStatus", KeyType: "HASH" },
            { AttributeName: "nextCheckAt", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
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
            { AttributeName: "fundingStatus", KeyType: "HASH" },
            { AttributeName: "fundedAt", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
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
          KeySchema: [{ AttributeName: "collectionName", KeyType: "HASH" }],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["collectionID", "maxSupply", "currentSupply"],
          },
        },
        {
          IndexName: "collectionId-index",
          KeySchema: [
            { AttributeName: "collectionId", KeyType: "HASH" },
            { AttributeName: "fundingStatus", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["address", "id", "fundingAmountSat"],
          },
        },
        {
          IndexName: "destination-address-collection-index",
          KeySchema: [
            { AttributeName: "destinationAddress", KeyType: "HASH" },
            { AttributeName: "collectionId", KeyType: "RANGE" },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
        {
          IndexName: "farcasterFid-index",
          KeySchema: [{ AttributeName: "farcasterFid", KeyType: "HASH" }],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
    },

    // Claims table
    {
      TableName: "Claims",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
        { AttributeName: "ClaimedAddress", AttributeType: "S" },
        {
          AttributeName: "ClaimedAddressCollection",
          AttributeType: "S",
        },
        { AttributeName: "ObservedBlockHeight", AttributeType: "N" },
        { AttributeName: "CollectionId", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      GlobalSecondaryIndexes: [
        {
          IndexName: "ClaimsByAddress",
          KeySchema: [
            { AttributeName: "ClaimedAddress", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "ClaimsByCollectionAddress",
          KeySchema: [
            {
              AttributeName: "ClaimedAddressCollection",
              KeyType: "HASH",
            },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "ObservedBlockHeight-index",
          KeySchema: [
            { AttributeName: "ObservedBlockHeight", KeyType: "HASH" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "ClaimsByCollection",
          KeySchema: [
            { AttributeName: "CollectionId", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },

    // OpenEditionClaims table
    {
      TableName: "OpenEditionClaims",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
        { AttributeName: "gsi1pk", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "gsi1pk", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },

    // Batch table
    {
      TableName: "Batch",
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: {
        AttributeName: "TTL",
        Enabled: true,
      },
    },

    // Uploads table
    {
      TableName: "Uploads",
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: {
        AttributeName: "TTL",
        Enabled: true,
      },
    },
  ],
};

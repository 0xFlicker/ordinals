import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/modules/**/typedefs/*.graphql",
  emitLegacyCommonJSImports: false,
  generates: {
    "./src/modules/": {
      preset: "@0xflick/graphql-modules-preset" as "graphql-modules",
      config: {
        useTypeImports: true,
        useEsmImports: true,
        graphqlModulesImportPath: "@0xflick/graphql-modules",
        contextType: "../context/index.js#Context",
        mappers: {
          InscriptionFunding:
            "../modules/inscriptionFunding/models.js#InscriptionFundingModel",
          Role: "../modules/permissions/models.js#RoleModel",
          Web3User: "../modules/user/models.js#Web3UserModel",
          Web3LoginUser: "../modules/user/models.js#Web3LoginUserModel",
          Collection: "../modules/collections/models.js#CollectionModel",
          Inscription: "../modules/inscriptions/models.js#InscriptionModel",
        },
      },
      presetConfig: {
        baseTypesPath: "../generated-types/graphql.ts",
        filename: "generated-types/module-types.ts",
      },
      plugins: [
        {
          add: {
            content: "/* eslint-disable */",
          },
        },
        "typescript",
        "typescript-resolvers",
      ],
    },
  },
};
export default config;

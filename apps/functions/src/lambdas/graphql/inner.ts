import { ApolloServer } from "apollo-server-lambda";
import { parse } from "graphql";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import {
  createApplication,
  createModule,
} from "@captemulation/graphql-modules";
import { createContext, resolvers } from "@0xflick/ordinals-graphql";
import {
  createLogger,
  deserializeSessionCookie,
  expireSessionCookie,
  serializeSessionCookie,
  sessionFromNamespace,
} from "@0xflick/ordinals-backend";
import type { APIGatewayProxyHandler } from "aws-lambda";
import type { LambdaContextFunctionParams } from "apollo-server-lambda/dist/ApolloServer.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const logger = createLogger({
  name: "graphql",
});
const apolloContext = createContext();

function setCookie(
  res: LambdaContextFunctionParams["express"]["res"],
  token: string,
) {
  res.setHeader(
    "set-cookie",
    serializeSessionCookie({
      value: token,
      path: "/",
      cookieName: "bitflick.session",
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    }),
  );
}
// Load and parse the GraphQL schema from file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaStr = readFileSync(join(__dirname, "schema.graphql"), "utf8");
const typeDefs = parse(schemaStr);
const app = createApplication({
  modules: [
    createModule({
      id: "ordinals",
      typeDefs,
      resolvers,
    }),
  ],
});
const executor = app.createApolloExecutor();
const schema = app.schema;

const server = new ApolloServer({
  schema,
  executor,
  context({ express }) {
    return {
      ...apolloContext,
      setToken: (token: string) => setCookie(express.res, token),
      getToken: (namespace?: string) => {
        const cookieToken = deserializeSessionCookie({
          cookies: express.req.headers.cookie,
          cookieName: sessionFromNamespace(namespace),
        });
        if (cookieToken) {
          return cookieToken;
        }
        const authHeader = express.req.headers.authorization;
        if (authHeader) {
          const [type, token] = authHeader.split(" ");
          if (type === "Bearer") {
            return token;
          }
        }
        return null;
      },
      clearToken: (namespace?: string) => {
        logger.info(`Clearing cookie ${sessionFromNamespace(namespace)}`);
        express.res.setHeader(
          "set-cookie",
          expireSessionCookie({
            cookieName: sessionFromNamespace(namespace),
            path: "/",
          }),
        );
      },
    };
  },
  introspection: true,
  plugins: [
    ApolloServerPluginLandingPageGraphQLPlayground(),
    {
      async requestDidStart(requestContext) {
        return {
          async didResolveOperation(requestContext) {
            requestContext.context.logger = requestContext.context.logger.child(
              {
                operation: requestContext.request.operationName,
              },
            );
            logger.trace(
              `Request ${requestContext.request.operationName} started`,
            );
          },
          async didResolveSource(requestContext) {
            logger.trace(
              `Request ${requestContext.request.operationName} resolved source`,
            );
          },
          async willSendResponse(requestContext) {
            logger.trace(
              `Request ${requestContext.request.operationName} will send response`,
            );
          },
          async didEncounterErrors() {
            requestContext.errors?.forEach((error, i) => {
              logger.warn(
                error,
                `Error number ${i} generated for request ${requestContext.request.operationName}`,
              );
            });
          },
        };
      },
    },
  ],
});

export const handler: APIGatewayProxyHandler = server.createHandler();

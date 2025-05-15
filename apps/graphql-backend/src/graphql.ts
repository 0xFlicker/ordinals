import { ApolloServer } from "apollo-server";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import {
  createGraphqlApplication,
  createContext,
} from "@0xflick/ordinals-graphql";
import {
  deserializeSessionCookie,
  expireSessionCookie,
  serializeSessionCookie,
  sessionExpirationFromNamespace,
  sessionFromNamespace,
} from "@0xflick/ordinals-backend";

export async function start() {
  const app = await createGraphqlApplication();
  const executor = app.createApolloExecutor();
  const schema = app.schema;

  const apolloServer = new ApolloServer({
    schema,
    executor,
    formatError(error) {
      console.error(error.extensions.exception?.stacktrace?.join("\n"));
      return error;
    },
    context: ({ req, res }) => {
      return {
        ...createContext(),
        getToken: (namespace?: string) => {
          const cookieToken = deserializeSessionCookie({
            cookies: req.headers.cookie,
            cookieName: sessionFromNamespace(namespace),
          });
          if (cookieToken) {
            return cookieToken;
          }
          const authHeader = req.headers.authorization;
          if (authHeader) {
            const [type, token] = authHeader.split(" ");
            if (type === "Bearer") {
              return token;
            }
          }
          return null;
        },
        setToken: (token: string, namespace?: string) => {
          res.setHeader(
            "set-cookie",
            serializeSessionCookie({
              cookieName: sessionFromNamespace(namespace),
              expires: new Date(
                Date.now() + 1000 * sessionExpirationFromNamespace(namespace),
              ),
              path: "/",
              value: token,
            }),
          );
        },
        clearToken: (namespace?: string) => {
          res.setHeader(
            "set-cookie",
            expireSessionCookie({
              cookieName: sessionFromNamespace(namespace),
              path: "/",
            }),
          );
        },
      };
    },
    cors: {
      origin: ["http://localhost:3000", "https://localhost:3000"],
      credentials: true,
    },
    introspection: true,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
  });

  const { url } = await apolloServer.listen({
    port: 4000,
  });
  console.log(`🚀 Server ready at ${url}`);
}

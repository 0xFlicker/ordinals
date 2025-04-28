import { FC, PropsWithChildren } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider as ApolloProvider } from "@/graphql/Provider";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/theme";

export const DefaultProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <ApolloProvider>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </AppRouterCacheProvider>
    </ApolloProvider>
  );
};

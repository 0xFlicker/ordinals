"use client";
import { DefaultProvider } from "@/context/default";
import theme from "@/theme";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";

export default function Context({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <DefaultProvider>{children}</DefaultProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

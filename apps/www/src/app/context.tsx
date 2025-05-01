"use client";

import theme from "@/theme";
import { DefaultProvider } from "@/context/default";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { ReactNode } from "react";

export default function Context({
  children,
}: {
  children: NonNullable<ReactNode>;
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <DefaultProvider>{children}</DefaultProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

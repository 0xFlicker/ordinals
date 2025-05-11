import Container from "@mui/material/Container";
import { AppBar } from "@/components/AppBar";
import { FC, PropsWithChildren } from "react";
import { Box } from "@mui/material";

import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";
import { Status } from "@/features/bitflick/Status";
export const SwitchableNetwork: FC<
  PropsWithChildren<{
    title?: string;
    user?: { handle?: string; userId?: string };
    hidden?: boolean;
  }>
> = ({ children, title, user, hidden }) => {
  return (
    <>
      <AppBar
        left={title}
        right={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Status />
            <Box sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              <WalletConnectButton />
            </Box>
          </Box>
        }
        sx={{
          ...(hidden
            ? {
                position: "fixed",
                boxShadow: "none",
                "& .MuiToolbar-root": {
                  minHeight: "64px",
                },
              }
            : {}),
        }}
        color={hidden ? "transparent" : "inherit"}
      />
      <Container
        sx={{
          ...(hidden
            ? {
                pt: 8,
              }
            : {}),
        }}
      >
        {children}
      </Container>
    </>
  );
};

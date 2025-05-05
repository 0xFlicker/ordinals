import Container from "@mui/material/Container";
import { AppBar } from "@/components/AppBar";
import { FC, PropsWithChildren } from "react";

import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";

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
        right={<WalletConnectButton user={user} />}
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

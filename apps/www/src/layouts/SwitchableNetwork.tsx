import Container from "@mui/material/Container";
import { AppBar } from "@/components/AppBar";
import { FC, PropsWithChildren } from "react";

import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";

export const SwitchableNetwork: FC<
  PropsWithChildren<{
    title: string;
    user?: { handle?: string; userId?: string };
  }>
> = ({ children, title, user }) => {
  return (
    <>
      <AppBar left={title} right={<WalletConnectButton user={user} />} />
      <Container
        sx={{
          pt: 8,
        }}
      >
        {children}
      </Container>
    </>
  );
};

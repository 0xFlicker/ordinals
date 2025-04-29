"use client";
import Container from "@mui/material/Container";
import { AppBar } from "@/components/AppBar";
import Button, { ButtonProps } from "@mui/material/Button";
import {
  FC,
  PropsWithChildren,
  useCallback,
  MouseEvent,
  useState,
} from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuList from "@mui/material/MenuList";
import { MenuItemConnect as WagmiConnect, useWeb3 } from "@/features/web3";
import { ConnectMenuItem as XverseConnectMenuItem } from "@/features/xverse";
import { WalletConnectButton } from "@/features/wallet-standard/components/WalletConnectButton";

interface IConnectedDropDownProps {
  anchorEl: Element | null;
  handleClose: () => void;
}

const ConnectedDropDownModal: FC<IConnectedDropDownProps> = ({
  anchorEl,
  handleClose,
}) => {
  const open = Boolean(anchorEl);
  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        onClose={handleClose}
        keepMounted
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Box sx={{ width: 320 }}>
          <MenuList disablePadding>
            <WagmiConnect />
            <XverseConnectMenuItem />
          </MenuList>
        </Box>
      </Menu>
    </>
  );
};

export const Connect: FC<{
  size?: ButtonProps["size"];
}> = ({ size }) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<Element | null>(null);
  const { isConnected: ethereumIsConnected } = useWeb3();

  const handleMenu = useCallback((event: MouseEvent) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  return (
    <>
      <Button
        startIcon={ethereumIsConnected ? <CheckCircleIcon /> : null}
        variant="outlined"
        size={size}
        sx={{
          m: "0.5rem",
        }}
        onClick={handleMenu}
      >
        connect
      </Button>
      <ConnectedDropDownModal
        anchorEl={menuAnchorEl}
        handleClose={() => setMenuAnchorEl(null)}
      />
    </>
  );
};

export const SwitchableNetwork: FC<
  PropsWithChildren<{
    title: string;
    user?: { handle: string };
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

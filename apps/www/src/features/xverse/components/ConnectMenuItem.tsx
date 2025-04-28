import { BitcoinIcon } from "@/components/BitcoinIcon";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { FC } from "react";
import { BitcoinSwitchNetworks } from "./BitcoinSwitchNetworks";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useXverseConnect } from "../hooks/useXverseConnect";

export const ConnectMenuItem: FC = () => {
  const { isConnected, isConnecting, ordinalsAddress, handleBitcoinConnect } =
    useXverseConnect();

  return (
    <MenuItem onClick={handleBitcoinConnect}>
      <ListItemIcon>
        <BitcoinIcon />
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography textAlign="right" noWrap>
            {!isConnected || isConnecting ? "connect" : ordinalsAddress}
          </Typography>
        }
      />
      <CheckCircleIcon
        color={isConnected ? "success" : "disabled"}
        sx={{
          ml: 2,
        }}
      />
      <BitcoinSwitchNetworks
        sx={{
          ml: 1,
        }}
      />
    </MenuItem>
  );
};

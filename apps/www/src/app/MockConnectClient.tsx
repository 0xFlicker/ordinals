"use client";
import { FC } from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import { BitcoinIcon } from "@/components/BitcoinIcon";

export const MockConnectClient: FC<{
  user: {
    handle: string;
  };
}> = ({ user }) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Avatar sx={{ width: 24, height: 24, bgcolor: "primary.dark", mr: 1 }}>
        <BitcoinIcon />
      </Avatar>
      <Typography>{user.handle}</Typography>
    </Box>
  );
};

import { FC, ReactNode } from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
  SxProps,
  Theme,
  AppBarProps,
} from "@mui/material";

export const AppBar: FC<{
  left?: ReactNode;
  right?: ReactNode;
  sx?: SxProps<Theme>;
  color?: AppBarProps["color"];
}> = ({ left, right, sx, color = "default" }) => {
  return (
    <>
      <MuiAppBar color={color} sx={sx}>
        <Toolbar>
          {left}
          <Box sx={{ flexGrow: 1 }} component="span" />
          {right}
        </Toolbar>
      </MuiAppBar>
    </>
  );
};

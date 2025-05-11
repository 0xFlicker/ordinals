"use client";
import { FC, useState } from "react";
import gql from "graphql-tag";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import { useTheme } from "@mui/material/styles";
import { useBitcoinNetworkStatusQuery } from "./Status.generated";
import { BitcoinNetwork } from "@/graphql/types";
import { styled } from "@mui/material/styles";
import { BitcoinNetworkStatus } from "@/apiGraphql/api";

gql`
  query BitcoinNetworkStatus($network: BitcoinNetwork!) {
    bitcoinNetworkStatus(network: $network) {
      status
      height
      bestBlockHash
      progress
    }
  }
`;

const StatusToolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

const NetworkStatus = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  minWidth: 200,
}));

const NetworkDivider = styled(Box)(({ theme }) => ({
  width: 1,
  height: 24,
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(0, 1),
}));

const StatusIndicator = styled(Box)<{ $synced: boolean }>(
  ({ theme, $synced }) => ({
    width: 12,
    height: 12,
    borderRadius: "50%",
    backgroundColor: $synced
      ? theme.palette.success.main
      : theme.palette.error.main,
    boxShadow: $synced ? `0 0 8px ${theme.palette.success.main}` : "none",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    "&:hover": {
      transform: "scale(1.1)",
    },
  })
);

const NetworkLabel = styled(Box)(({ theme }) => ({
  fontSize: "0.875rem",
  fontWeight: 500,
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
}));

const MobilePopover = styled(Popover)(({ theme }) => ({
  "& .MuiPopover-paper": {
    padding: theme.spacing(2),
    minWidth: 200,
  },
}));

export const Status: FC = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data: testnet4Data } = useBitcoinNetworkStatusQuery({
    variables: { network: BitcoinNetwork.Testnet4 },
    pollInterval: 10000,
  });
  const { data: mainnetData } = useBitcoinNetworkStatusQuery({
    variables: { network: BitcoinNetwork.Mainnet },
    pollInterval: 10000,
  });

  const testnet4Progress = testnet4Data?.bitcoinNetworkStatus?.progress ?? 0;
  const testnet4Height = testnet4Data?.bitcoinNetworkStatus?.height ?? null;
  const testnet4Status = testnet4Data?.bitcoinNetworkStatus?.status;
  const mainnetProgress = mainnetData?.bitcoinNetworkStatus?.progress ?? 0;
  const mainnetHeight = mainnetData?.bitcoinNetworkStatus?.height ?? null;
  const mainnetStatus = mainnetData?.bitcoinNetworkStatus?.status;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const renderNetworkStatus = (
    label: string,
    status: BitcoinNetworkStatus | undefined | null,
    progress: number,
    height: number | null
  ) => (
    <NetworkStatus>
      <Tooltip
        title={
          status !== "SYNCED"
            ? `Syncing: ${Math.round(progress * 100)}%`
            : "Fully synced"
        }
        arrow
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StatusIndicator $synced={status === "SYNCED"} />
          <NetworkLabel>{label}</NetworkLabel>
        </Box>
      </Tooltip>
      {status !== "SYNCED" && (
        <Box sx={{ width: 60, display: { xs: "none", sm: "block" } }}>
          <CircularProgress
            variant="determinate"
            value={progress * 100}
            size={16}
            thickness={4}
          />
        </Box>
      )}
      {height && (
        <Box
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            marginLeft: "auto",
          }}
        >
          #{height}
        </Box>
      )}
    </NetworkStatus>
  );

  return (
    <>
      <StatusToolbar>
        <Box
          onClick={handleClick}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
            mx: 2,
            "@media (min-width: 600px)": {
              display: "none",
            },
          }}
        >
          <Tooltip
            title={
              testnet4Status !== "SYNCED"
                ? `Syncing: ${Math.round(testnet4Progress * 100)}%`
                : "Fully synced"
            }
            arrow
          >
            <Box>
              <StatusIndicator $synced={testnet4Status === "SYNCED"} />
            </Box>
          </Tooltip>
          {testnet4Status !== "SYNCED" && (
            <CircularProgress
              variant="determinate"
              value={testnet4Progress * 100}
              size={16}
              thickness={4}
            />
          )}
        </Box>

        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            gap: 2,
          }}
        >
          {renderNetworkStatus(
            "Testnet4",
            testnet4Status,
            testnet4Progress,
            testnet4Height
          )}
          <NetworkDivider />
          {renderNetworkStatus(
            "Mainnet",
            mainnetStatus,
            mainnetProgress,
            mainnetHeight
          )}
        </Box>
      </StatusToolbar>

      <MobilePopover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
          {renderNetworkStatus(
            "Testnet4",
            testnet4Status,
            testnet4Progress,
            testnet4Height
          )}
          <NetworkDivider sx={{ width: "100%", height: 1, my: 1 }} />
          {renderNetworkStatus(
            "Mainnet",
            mainnetStatus,
            mainnetProgress,
            mainnetHeight
          )}
        </Box>
      </MobilePopover>
    </>
  );
};

"use client";
import { FC, useState, useMemo } from "react";
import gql from "graphql-tag";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import IconButton from "@mui/material/IconButton";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useBitcoinNetworkStatusQuery } from "./Status.generated";
import { BitcoinNetwork } from "@/graphql/types";
import { styled } from "@mui/material/styles";
import { BitcoinNetworkStatus } from "@/apiGraphql/api";

gql`
  query BitcoinNetworkStatus($network: BitcoinNetwork!) {
    bitcoinNetworkStatus(network: $network) {
      data {
        status
        height
        bestBlockHash
        progress
      }
      problems {
        message
        severity
      }
    }
  }
`;

const StatusToolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  height: "100%",
  width: "100%",
}));

const NetworkStatus = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0, 1.5),
  borderRadius: 9,
  background: "rgba(30, 30, 30, 0.7)",
  minWidth: 120,
  height: 36,
  flexShrink: 0,
}));

const NetworkDivider = styled(Box)(({ theme }) => ({
  width: 1,
  height: 26,
  backgroundColor: "rgba(255,255,255,0.06)",
  margin: theme.spacing(0, 1.2),
  borderRadius: 1,
}));

const StatusIndicator = styled(Box)<{ $synced: boolean }>(
  ({ theme, $synced }) => ({
    width: 13,
    height: 13,
    borderRadius: "50%",
    backgroundColor: $synced ? "#7CFB9A" : "#FF6B6B",
    boxShadow: $synced
      ? "0 0 6px 1.5px rgba(124,251,154,0.35)"
      : "0 0 6px 1.5px rgba(255,107,107,0.18)",
    border: $synced ? "1px solid #7CFB9A" : "1px solid #FF6B6B",
    display: "inline-block",
    marginRight: theme.spacing(1.2),
  })
);

const NetworkLabel = styled(Box)(() => ({
  fontSize: "0.98rem",
  fontWeight: 700,
  color: "#fff",
  letterSpacing: 0.2,
  display: "flex",
  alignItems: "center",
}));

const BlockHeight = styled(Box)(({ theme }) => ({
  fontSize: "0.78rem",
  color: theme.palette.grey[400],
  fontWeight: 500,
  marginLeft: theme.spacing(0.8),
}));

const MobilePopover = styled(Popover)(({ theme }) => ({
  "& .MuiPopover-paper": {
    padding: theme.spacing(2),
    minWidth: 200,
  },
}));

export const Status: FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [overflowAnchorEl, setOverflowAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isDesktop = useMediaQuery(theme.breakpoints.down("lg"));

  const { data: testnet4Data } = useBitcoinNetworkStatusQuery({
    variables: { network: BitcoinNetwork.Testnet4 },
    pollInterval: 10000,
  });
  const { data: mainnetData } = useBitcoinNetworkStatusQuery({
    variables: { network: BitcoinNetwork.Mainnet },
    pollInterval: 10000,
  });

  const testnet4Progress =
    testnet4Data?.bitcoinNetworkStatus?.data?.progress ?? 0;
  const testnet4Height =
    testnet4Data?.bitcoinNetworkStatus?.data?.height ?? null;
  const testnet4Status = testnet4Data?.bitcoinNetworkStatus?.data?.status;
  const mainnetProgress =
    mainnetData?.bitcoinNetworkStatus?.data?.progress ?? 0;
  const mainnetHeight = mainnetData?.bitcoinNetworkStatus?.data?.height ?? null;
  const mainnetStatus = mainnetData?.bitcoinNetworkStatus?.data?.status;

  const networks = useMemo(
    () => [
      {
        label: "Testnet4",
        status: testnet4Status,
        progress: testnet4Progress,
        height: testnet4Height,
      },
      {
        label: "Mainnet",
        status: mainnetStatus,
        progress: mainnetProgress,
        height: mainnetHeight,
      },
    ],
    [
      testnet4Status,
      testnet4Progress,
      testnet4Height,
      mainnetStatus,
      mainnetProgress,
      mainnetHeight,
    ]
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOverflowClick = (event: React.MouseEvent<HTMLElement>) => {
    setOverflowAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOverflowClose = () => {
    setOverflowAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const overflowOpen = Boolean(overflowAnchorEl);

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
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <StatusIndicator $synced={status === "SYNCED"} />
          <NetworkLabel>{label}</NetworkLabel>
        </Box>
      </Tooltip>
      {height && !isTablet && <BlockHeight>#{height}</BlockHeight>}
    </NetworkStatus>
  );

  if (isMobile) {
    return (
      <>
        <StatusToolbar>
          <Box
            onClick={handleClick}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              cursor: "pointer",
              height: "100%",
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
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <StatusIndicator $synced={testnet4Status === "SYNCED"} />
              </Box>
            </Tooltip>
            {testnet4Status !== "SYNCED" && (
              <CircularProgress
                variant="determinate"
                value={testnet4Progress * 100}
                size={20}
                thickness={4}
              />
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
            {networks.map((network) => (
              <Box key={network.label}>
                {renderNetworkStatus(
                  network.label,
                  network.status,
                  network.progress,
                  network.height
                )}
              </Box>
            ))}
          </Box>
        </MobilePopover>
      </>
    );
  }

  return (
    <>
      <StatusToolbar>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            overflow: "hidden",
            flex: 1,
          }}
        >
          {networks.map((network, index) => {
            if (isDesktop && index > 0) return null;
            return (
              <Box
                key={network.label}
                sx={{ display: "flex", alignItems: "center" }}
              >
                {renderNetworkStatus(
                  network.label,
                  network.status,
                  network.progress,
                  network.height
                )}
                {index < networks.length - 1 && <NetworkDivider />}
              </Box>
            );
          })}
        </Box>

        {isDesktop && networks.length > 1 && (
          <IconButton
            onClick={handleOverflowClick}
            sx={{ color: "white", ml: 1 }}
          >
            <MoreHorizIcon />
          </IconButton>
        )}
      </StatusToolbar>

      <Popover
        open={overflowOpen}
        anchorEl={overflowAnchorEl}
        onClose={handleOverflowClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {networks.slice(1).map((network) => (
            <Box key={network.label}>
              {renderNetworkStatus(
                network.label,
                network.status,
                network.progress,
                network.height
              )}
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
};

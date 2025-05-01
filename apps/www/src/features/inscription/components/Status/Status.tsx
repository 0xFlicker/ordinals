"use client";
import { FC, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import WaitingIcon from "@mui/icons-material/HourglassEmptyOutlined";
import { useFetchFundingStatusQuery } from "./FetchFundingStatus.generated";
import { Field } from "@/components/Field";
import { FundingStatus } from "@/graphql/types";
import { AppLink } from "@/components/AppLink";
import Skeleton from "@mui/material/Skeleton";

const Loading: FC = () => {
  return (
    <Card
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        border: "2px solid #000",
        boxShadow: 24,
        p: 4,
      }}
    >
      <CardHeader
        title="inscription status"
        titleTypographyProps={{
          variant: "h6",
        }}
        sx={{
          textAlign: "center",
        }}
      />
      <CardContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box width={16} height={16} sx={{ mr: 1 }}>
            <Skeleton variant="circular" width={16} height={16} />
          </Box>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "row" }}>
            <Skeleton variant="text" width="20%" sx={{ mr: "10%" }} />
            <Skeleton variant="text" width="70%" />
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box width={16} height={16} sx={{ mr: 1 }}>
            <Skeleton variant="circular" width={16} height={16} />
          </Box>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "row" }}>
            <Skeleton variant="text" width="20%" sx={{ mr: "10%" }} />
            <Skeleton variant="text" width="70%" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Row: FC<{
  label: string;
  status: ReactNode;
  inProgress: boolean;
  success: boolean;
}> = ({ label, status, inProgress, success }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        mb: 2,
      }}
    >
      <Box width={16} height={16} sx={{ mr: 1 }}>
        {inProgress ? <CircularProgress size={16} /> : null}
        {success ? <CheckIcon fontSize="small" /> : null}
        {!(inProgress || success) ? <WaitingIcon /> : null}
      </Box>

      <Field
        label={
          <Typography variant="body1" fontWeight="bold">
            {label}
          </Typography>
        }
        value={status}
      />
    </Box>
  );
};

export const Status: FC<{
  fundingId: string;
}> = ({ fundingId }) => {
  const { data, loading } = useFetchFundingStatusQuery({
    variables: {
      id: fundingId,
    },
    skip: !fundingId,
    pollInterval: 5000,
  });

  if (!data || loading) {
    return <Loading />;
  }

  const inscriptionData = data.inscriptionFunding;
  if (!inscriptionData) {
    return <Loading />;
  }

  const {
    status,
    fundingRevealTxId,
    fundingGenesisTxId,
    fundingRevealTxUrl,
    fundingGenesisTxUrl,
  } = inscriptionData;

  const fundedSuccess = [
    FundingStatus.Funded,
    FundingStatus.Genesis,
    FundingStatus.Revealed,
  ].includes(status);
  const fundedInProgress = status === FundingStatus.Funding;

  const revealInProgress = status === FundingStatus.Funded;
  return (
    <Card
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        border: "2px solid #000",
        boxShadow: 24,
        p: 4,
      }}
    >
      <CardHeader
        title="inscription status"
        titleTypographyProps={{
          variant: "h6",
        }}
        sx={{
          textAlign: "center",
        }}
      />
      <CardContent>
        <Row
          label="funding tx"
          status={
            fundedInProgress ? (
              <LinearProgress />
            ) : fundingGenesisTxUrl ? (
              <AppLink
                href={fundingGenesisTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                noWrap
              >
                {fundingGenesisTxId}
              </AppLink>
            ) : (
              fundingGenesisTxId
            )
          }
          inProgress={fundedInProgress}
          success={fundedSuccess}
        />

        <Row
          label="reveal tx"
          status={
            revealInProgress ? (
              <LinearProgress />
            ) : fundingRevealTxUrl ? (
              <AppLink
                href={fundingRevealTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                noWrap
              >
                {fundingRevealTxId}
              </AppLink>
            ) : (
              fundingRevealTxId
            )
          }
          inProgress={revealInProgress && !fundingRevealTxId}
          success={!!fundingRevealTxId}
        />
      </CardContent>
    </Card>
  );
};

"use client";
import { DefaultProvider } from "@/context/default";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { useXverse } from "@/features/xverse/Context";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import CardHeader from "@mui/material/CardHeader";
import { useAuth } from "@/features/auth";
import { useWeb3 } from "@/features/web3";
import { FC, ReactNode } from "react";

export const Field: FC<{
  label: ReactNode;
  value: ReactNode;
}> = ({ label, value }) => {
  return (
    <Grid
      container
      sx={{
        ml: 2,
      }}
      columns={12}
    >
      <Grid size={2}>
        <Typography variant="body1" gutterBottom fontWeight="bold">
          {label}:
        </Typography>
      </Grid>
      <Grid
        size={{
          xs: 12,
          md: 8,
        }}
      >
        <Typography variant="body1" gutterBottom>
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
};

export const ProfileCard: FC = () => {
  const { signIn, signOut, isAuthenticated, isAnonymous } = useAuth();
  const {
    state: {
      ordinalsAddress,
      paymentAddress,
      errorMessage: xverseErrorMessage,
      currentTarget: currentBitcoinNetwork,
      connectionStatus,
    },
  } = useXverse();
  const { selectedAddress, currentChain } = useWeb3();
  return (
    <>
      <Card>
        <CardHeader
          title="Ethereum"
          subheader={isAuthenticated ? "logged in" : "logged out"}
        ></CardHeader>
        <CardContent>
          <Field label="Address" value={selectedAddress} />
          <Field label="Chain" value={currentChain?.name} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Bitcoin"></CardHeader>
        <CardContent>
          <Field label="Network" value={currentBitcoinNetwork.network} />
          <Field label="Ordinals" value={ordinalsAddress} />
          <Field label="Payment" value={paymentAddress} />
        </CardContent>
      </Card>
    </>
  );
};

export default function Profile() {
  return (
    <DefaultProvider>
      <SwitchableNetwork
        title="profile"
        initialBitcoinNetwork={BitcoinNetworkType.Testnet}
        initialBitcoinPurpose={[
          AddressPurpose.Ordinals,
          AddressPurpose.Payment,
        ]}
      >
        <Grid container spacing={2} maxWidth="lg" columns={12}>
          <Grid size={12} alignContent="center">
            <ProfileCard />
          </Grid>
        </Grid>
      </SwitchableNetwork>
    </DefaultProvider>
  );
}

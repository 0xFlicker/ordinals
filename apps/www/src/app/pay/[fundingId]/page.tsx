import { PayRoute } from "@/routes/Pay";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { MultiChainProvider } from "@/features/wallet-standard";
import { getFullUser, getUserIdFromSession } from "@/app/actions";
import Grid from "@mui/material/Grid";

type PayPageContentProps = {
  fundingId: string;
  user?: any;
};

const PayPageContent = ({ fundingId, user }: PayPageContentProps) => (
  <MultiChainProvider
    initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
    initialBitcoinPurpose={[AddressPurpose.Payment]}
    initialUser={user}
  >
    <Grid container spacing={2} sx={{ mt: 10 }} columns={12}>
      <Grid size={12} sx={{ display: "flex", justifyContent: "center" }}>
        <PayRoute
          fundingId={fundingId}
          initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
        />
      </Grid>
    </Grid>
  </MultiChainProvider>
);

export default async function Page({
  params: { fundingId },
}: {
  params: { fundingId: string };
}) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return <PayPageContent fundingId={fundingId} />;
    }

    const user = await getFullUser(userId);
    return <PayPageContent fundingId={fundingId} user={user} />;
  } catch (err) {
    console.error(err);
    return <PayPageContent fundingId={fundingId} />;
  }
}

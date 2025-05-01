import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { Status } from "@/features/inscription";
import { getUserHandle, getUserIdFromSession } from "@/app/actions";
import { BitcoinNetworkType } from "sats-connect";
import { AddressPurpose } from "sats-connect";
import { MultiChainProvider } from "@/features/wallet-standard";

const PageContent = ({
  fundingId,
  user,
}: {
  fundingId: string;
  user?: { handle?: string | null; userId: string | null };
}) => {
  const { handle, userId } = user ?? {};
  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
    >
      <SwitchableNetwork
        title="bitflick"
        user={{ handle: handle ?? undefined, userId: userId ?? undefined }}
      >
        <Grid2 container spacing={2} sx={{ mt: 10 }} columns={12}>
          <Grid2 size={12} sx={{ display: "flex", justifyContent: "center" }}>
            <Status fundingId={fundingId} />
          </Grid2>
        </Grid2>
      </SwitchableNetwork>
    </MultiChainProvider>
  );
};
const StatusRoute = async ({ params }: { params: { fundingId: string } }) => {
  try {
    const userId = await getUserIdFromSession();
    const handle = userId ? await getUserHandle(userId) : null;
    return (
      <PageContent fundingId={params.fundingId} user={{ handle, userId }} />
    );
  } catch (error) {
    console.error(error);
    return <PageContent fundingId={params.fundingId} />;
  }
};

export default StatusRoute;

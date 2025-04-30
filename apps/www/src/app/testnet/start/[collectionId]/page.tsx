import { getUserHandle, getUserIdFromSession } from "@/app/actions";
import { Flow } from "@/features/inscription";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import Grid from "@mui/material/Grid";
import { BitcoinNetworkType } from "sats-connect";

export default async function Page({
  params: { collectionId },
}: {
  params: { collectionId: string };
}) {
  const userId = await getUserIdFromSession();
  const handle = userId ? await getUserHandle(userId) : null;
  return (
    <SwitchableNetwork
      title="bitflick"
      user={{
        handle: handle ?? undefined,
        userId: userId ?? undefined,
      }}
    >
      <Grid container spacing={2} sx={{ mt: 10 }} columns={12}>
        <Grid size={12}>
          <Flow
            collectionId={collectionId}
            initialBitcoinNetwork={BitcoinNetworkType.Testnet}
            step="start"
          />
        </Grid>
      </Grid>
    </SwitchableNetwork>
  );
}

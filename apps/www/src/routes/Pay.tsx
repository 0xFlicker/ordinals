import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { Pay } from "@/features/inscription";
import { getUserHandle, getUserIdFromSession } from "@/app/actions";
import { BitcoinNetworkType } from "sats-connect";

export const PayRoute = async ({
  fundingId,
  initialBitcoinNetwork,
}: {
  fundingId: string;
  initialBitcoinNetwork: BitcoinNetworkType;
}) => {
  const userId = await getUserIdFromSession();
  const handle = userId ? await getUserHandle(userId) : null;
  return (
    <SwitchableNetwork
      title="bitflick"
      user={{ handle: handle ?? undefined, userId: userId ?? undefined }}
    >
      <Grid2 container spacing={2} sx={{ mt: 10 }} columns={12}>
        <Grid2 size={12}>
          <Pay fundingId={fundingId} network={initialBitcoinNetwork} />
        </Grid2>
      </Grid2>
    </SwitchableNetwork>
  );
};

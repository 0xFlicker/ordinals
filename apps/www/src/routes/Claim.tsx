"use client";
import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { ActiveClaim } from "@/features/inscription";
import { BitcoinNetworkType } from "sats-connect";
import { getUserHandle } from "@/app/actions";
import { getUserIdFromSession } from "@/app/actions";

export const ClaimRoute = async ({
  collectionId,
  initialBitcoinNetwork,
}: {
  collectionId: string;
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
          <ActiveClaim
            network={initialBitcoinNetwork}
            collectionId={collectionId}
          />
        </Grid2>
      </Grid2>
    </SwitchableNetwork>
  );
};

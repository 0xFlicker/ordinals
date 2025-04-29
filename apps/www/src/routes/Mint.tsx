"use client";
import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { ActiveMint } from "@/features/inscription";
import { AutoConnect } from "@/features/web3";
import { getUserHandle, getUserIdFromSession } from "@/app/actions";

export const MintRoute = async ({
  collectionId,
  destinationAddress,
}: {
  collectionId: string;
  destinationAddress: string;
}) => {
  const userId = await getUserIdFromSession();
  const handle = userId ? await getUserHandle(userId) : null;
  return (
    <SwitchableNetwork title="bitflick" user={handle ? { handle } : undefined}>
      <AutoConnect>
        <Grid2 container spacing={2} columns={12}>
          <Grid2 size={12}>
            <ActiveMint
              collectionId={collectionId}
              destinationAddress={destinationAddress}
            />
          </Grid2>
        </Grid2>
      </AutoConnect>
    </SwitchableNetwork>
  );
};

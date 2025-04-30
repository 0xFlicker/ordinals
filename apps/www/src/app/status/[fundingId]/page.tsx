import Grid2 from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { Status } from "@/features/inscription";
import { getUserHandle, getUserIdFromSession } from "@/app/actions";

const StatusRoute = async ({ fundingId }: { fundingId: string }) => {
  const userId = await getUserIdFromSession();
  const handle = userId ? await getUserHandle(userId) : null;
  return (
    <SwitchableNetwork
      title="bitflick"
      user={{ handle: handle ?? undefined, userId: userId ?? undefined }}
    >
      <Grid2 container spacing={2} sx={{ mt: 10 }} columns={12}>
        <Grid2 size={12}>
          <Status fundingId={fundingId} />
        </Grid2>
      </Grid2>
    </SwitchableNetwork>
  );
};

export default StatusRoute;

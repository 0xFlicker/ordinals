import Grid from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { AdminPanel } from "@/features/admin";
import { getUserIdFromSession, getUserHandle } from "@/app/actions";

export const AdminRoute = async () => {
  const userId = await getUserIdFromSession();
  const handle = userId ? await getUserHandle(userId) : undefined;
  return (
    <SwitchableNetwork
      title="home"
      user={{ handle: handle ?? undefined, userId: userId ?? undefined }}
    >
      <Grid container spacing={2} columns={12}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 4,
          }}
        >
          <AdminPanel />
        </Grid>
      </Grid>
    </SwitchableNetwork>
  );
};

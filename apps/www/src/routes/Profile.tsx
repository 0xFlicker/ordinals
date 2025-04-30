import Grid from "@mui/material/Grid";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import { FC, ReactNode } from "react";
import { getUserHandle, getUserIdFromSession } from "@/app/actions";
import Typography from "@mui/material/Typography";

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

export default async function Profile() {
  const userId = await getUserIdFromSession();
  const handle = userId ? await getUserHandle(userId) : null;
  return (
    <SwitchableNetwork
      title="profile"
      user={{ handle: handle ?? undefined, userId: userId ?? undefined }}
    >
      <Grid container spacing={2} maxWidth="lg" columns={12}>
        <Grid size={12} alignContent="center"></Grid>
      </Grid>
    </SwitchableNetwork>
  );
}

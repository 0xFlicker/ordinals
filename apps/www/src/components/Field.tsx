import { FC, ReactNode } from "react";
import Grid from "@mui/material/GridLegacy";
import Typography from "@mui/material/Typography";

export const Field: FC<{
  label: ReactNode | string;
  value: ReactNode | string;
}> = ({ label, value }) => {
  return (
    <Grid
      container
      width="100%"
      sx={{
        ml: 2,
      }}
      alignItems="center"
      columns={12}
    >
      <Grid item xs={12} md={2} alignItems="center">
        {typeof label === "string" ? (
          <Typography variant="body1" gutterBottom fontWeight="bold">
            {label}
          </Typography>
        ) : (
          label
        )}
      </Grid>
      <Grid
        item
        xs={12}
        md={8}
        alignItems="center"
        sx={{
          ml: {
            xs: 2,
          },
        }}
      >
        {typeof value === "string" ? (
          <Typography variant="body1" gutterBottom>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Grid>
    </Grid>
  );
};

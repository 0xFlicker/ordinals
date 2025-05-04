import { FC } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem, { ListItemProps } from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import CircleIcon from "@mui/icons-material/Circle";
import { BitCard } from "@/components/BitCard";

const LineItem: FC<
  ListItemProps & {
    number: number;
    description: string;
  }
> = ({ number, description, ...props }) => {
  return (
    <ListItem {...props}>
      <ListItemIcon>
        <Box sx={{ position: "relative", width: 24, height: 24 }}>
          <CircleIcon sx={{ position: "absolute" }} color="primary" />
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: "52%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "background.paper",
              fontSize: "0.75rem",
              textAlign: "center",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {number}
          </Typography>
        </Box>
      </ListItemIcon>
      <ListItemText primary={description} />
    </ListItem>
  );
};

export const HowItWorks: FC = () => {
  return (
    <Grid size={12} sx={{ display: "flex", justifyContent: "center" }}>
      <BitCard
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pt: 4,
          pb: 2,
          px: 4,
        }}
      >
        <CardHeader title="How It Works" />
        <CardContent>
          <List
            sx={{
              mb: 4,
            }}
          >
            <LineItem number={1} description="Connect Wallet" />
            <LineItem number={2} description="Choose What to Inscribe" />
            <LineItem number={3} description="Pay, Mint, Done" />
          </List>

          <Typography variant="body1" color="text.secondary" marginBottom={2}>
            We generate the transaction. You pay the fee. We inscribe to your
            address.
          </Typography>
        </CardContent>
      </BitCard>
    </Grid>
  );
};

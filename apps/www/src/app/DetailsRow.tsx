import { FC } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import BitcoinIcon from "@/components/BitcoinIcon";
import Grid from "@mui/material/Grid";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import { BitCard } from "@/components/BitCard";

interface DetailsCellProps {
  title: string;
  description: string;
}

export const DetailsCell: FC<DetailsCellProps> = ({ title, description }) => {
  return (
    <Grid
      size={{
        xs: 12,
        md: 4,
      }}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "start",
        px: 2,
      }}
    >
      <BitCard
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "start",
          width: "100%",
          pt: 4,
          pb: 2,
        }}
      >
        <CardHeader
          title={title}
          sx={{
            "& .MuiCardHeader-content": {
              minHeight: "4em",
              display: "flex",
              alignItems: "center",
            },
            textAlign: "center",
          }}
        />
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "160px",
            mt: 4,
            mx: 2,
          }}
        >
          <Typography variant="body1" textAlign="center">
            {description}
          </Typography>
        </CardContent>
      </BitCard>
    </Grid>
  );
};

interface DetailsRowProps {
  cells: DetailsCellProps[];
}

export const DetailsRow: FC<DetailsRowProps> = ({ cells }) => {
  return (
    <>
      {cells.map((cell) => (
        <DetailsCell key={cell.title} {...cell} />
      ))}
    </>
  );
};

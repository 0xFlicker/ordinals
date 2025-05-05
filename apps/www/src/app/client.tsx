"use client";
import { AppBar } from "@/components/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import NextImage from "next/image";
import { AppLink } from "@/components/AppLink";
import { CTA } from "./CTA";
import { DetailsRow } from "./DetailsRow";
import Grid from "@mui/material/Grid";
import { HowItWorks } from "./HowItWorks";
export default function Client({ appRight }: { appRight?: React.ReactNode }) {
  return (
    <>
      <AppBar
        right={appRight}
        sx={{
          position: "fixed",
          boxShadow: "none",
          "& .MuiToolbar-root": {
            minHeight: "64px",
          },
        }}
        color="transparent"
      />
      <Box component="main">
        <Grid
          container
          spacing={2}
          rowSpacing={4}
          sx={{
            mt: 16,
          }}
        >
          <CTA />
          <DetailsRow
            cells={[
              {
                title: "Inscribe On-Demand",
                description:
                  "Create mintable ordinal collections with no up-front inscription costs",
              },
              {
                title: "No Bitcoin Setup Required",
                description: "No node. No command line. Just connect and go.",
              },
              {
                title: "Earn as a creator",
                description:
                  "Set your own price for each mint. We handle the rest.",
              },
            ]}
          />
          <HowItWorks />
        </Grid>
      </Box>
    </>
  );
}

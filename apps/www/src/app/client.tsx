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
          <AppLink
            href="/start/7d33db3a-8d0f-4fe0-a781-74d314953aae"
            underline="none"
            sx={{ textDecoration: "none" }}
          >
            <Container maxWidth="lg">
              <Box
                sx={{ mt: 16, mb: 4 }}
                display="flex"
                alignContent="center"
                justifyContent="center"
              >
                <NextImage
                  alt="thinking face"
                  src="/images/thinking.png"
                  height={512}
                  width={512}
                />
              </Box>
              <Box
                display="flex"
                alignContent="center"
                justifyContent="center"
                width="100%"
              >
                <Typography
                  variant="h3"
                  justifyContent="center"
                  color="text.primary"
                >
                  bitflick
                </Typography>
              </Box>
            </Container>
          </AppLink>
        </Grid>
      </Box>
    </>
  );
}

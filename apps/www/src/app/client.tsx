"use client";
import { AppBar } from "@/components/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import NextImage from "next/image";
import { AppLink } from "@/components/AppLink";
import { CTA } from "./CTA";

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
        <CTA />
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
      </Box>
    </>
  );
}

"use client";
import { AppBar } from "@/components/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import NextImage from "next/image";
import { AppLink } from "@/components/AppLink";

export default function Client({ appRight }: { appRight?: React.ReactNode }) {
  return (
    <>
      <AppBar
        left={
          <AppLink href="/">
            <NextImage
              alt="thinking face"
              src="/images/flick.png"
              height={64}
              width={64}
            />
          </AppLink>
        }
        right={appRight}
      />
      <AppLink
        href="/start/7d33db3a-8d0f-4fe0-a781-74d314953aae"
        underline="none"
        sx={{ textDecoration: "none" }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{ mt: 16 }}
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
              404 homepage not found
            </Typography>
          </Box>
        </Container>
      </AppLink>
    </>
  );
}

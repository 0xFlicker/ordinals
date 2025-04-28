"use client";
import { DefaultProvider } from "@/context/default";
import { AppBar } from "@/components/AppBar";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid2 from "@mui/material/Grid";
import NextImage from "next/image";
import QR from "qrcode.react";
import { FC } from "react";
import { AppLink } from "@/components/AppLink";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";

export const OpLockCat: FC<{}> = () => {
  return (
    <DefaultProvider>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid2 container rowSpacing={4} columns={12}>
          <Grid2
            component={Paper}
            size={12}
            elevation={2}
            minHeight={256}
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="16px"
          >
            <Typography
              component="h1"
              ml={6}
              fontSize={{
                xs: 16,
                sm: 32,
                md: 48,
                lg: 96,
              }}
            >
              OP LOCK CAT
            </Typography>
            <Box flexGrow={1} />
            <NextImage
              alt="closed box"
              src="/images/op-lock-cat/closed-box-1.png"
              height={256}
              width={256}
              style={{
                marginRight: 32,
                // transition to wiggle on the z axis every 5 seconds
                animation: "wiggle 5s infinite",
                transform: "rotateZ(0deg)",
                transformOrigin: "50% 50%",
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Grid2>
          <Grid2 size={12} width="100%" paddingY={4}>
            <Typography
              component="p"
              width="100%"
              textAlign="center"
              fontSize={{
                xs: 16,
                lg: 20,
              }}
            >
              OP LOCK CAT is an ordinal inscription where you decide when to
              open the box to discover if the cat is alive or dead
            </Typography>
          </Grid2>
          <Grid2
            size={{
              sm: 12,
              md: 4,
            }}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NextImage
              alt="closed box"
              src="/images/op-lock-cat/closed-box-2.png"
              height={256}
              width={256}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{
                animation: "wiggle 5s infinite 2s",
                transform: "rotateZ(0deg)",
                transformOrigin: "50% 50%",
              }}
            />
          </Grid2>
          <Grid2
            size={{
              sm: 12,
              md: 4,
            }}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography component="p" textAlign="center">
              When inscribing the ordinal, you choose a Bitcoin block in the
              future
            </Typography>
          </Grid2>
          <Grid2
            size={{
              sm: 12,
              md: 4,
            }}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NextImage
              alt="closed box"
              src="/images/op-lock-cat/closed-box-3.png"
              height={256}
              width={256}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{
                animation: "wiggle 5s infinite 4s",
                transform: "rotateZ(0deg)",
                transformOrigin: "50% 50%",
              }}
            />
          </Grid2>
          <Grid2
            size={{
              sm: 12,
              md: 4,
            }}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NextImage
              alt="closed box"
              src="/images/op-lock-cat/open-box-1.png"
              height={256}
              width={256}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Grid2>
          <Grid2
            size={{
              sm: 12,
              md: 4,
            }}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography component="p" textAlign="center">
              On that block, the box will open...
            </Typography>
          </Grid2>
          <Grid2
            size={{
              sm: 12,
              md: 4,
            }}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NextImage
              alt="closed box"
              src="/images/op-lock-cat/open-box-2.png"
              height={256}
              width={256}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Grid2>
          <Grid2
            size={12}
            width="100%"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Typography
              component="p"
              textAlign="center"
              fontSize={{
                xs: 16,
                sm: 32,
                md: 32,
                lg: 48,
              }}
            >
              and you will discover if the cat is alive or dead
            </Typography>
          </Grid2>
        </Grid2>
      </Container>
    </DefaultProvider>
  );
};

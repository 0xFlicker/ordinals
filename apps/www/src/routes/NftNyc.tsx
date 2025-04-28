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

// import Grid2 from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
// import Typography from "@mui/material/Typography";
// import { Connect } from "@/features/xverse/Connect";
// import { useXverse } from "@/features/xverse/Context";
// import { AsyncStatus } from "@/features/xverse/ducks";

// const TestConnectCard = () => {
//   const {
//     state: { ordinalsAddress, connectionStatus },
//   } = useXverse();
//   return (
//     <Card>
//       <CardContent>
//         <Typography variant="h5" component="div">
//           Connect
//         </Typography>
//         <Typography sx={{ mb: 1.5 }} color="text.secondary">
//           Connect to Xverse
//         </Typography>
//         <Typography variant="body2" textOverflow="ellipsis" overflow="hidden">
//           {connectionStatus === AsyncStatus.FULFILLED
//             ? ordinalsAddress
//             : "Connect to Xverse to get started"}
//         </Typography>
//       </CardContent>
//       <CardActions>
//         <Connect />
//       </CardActions>
//     </Card>
//   );
// };

export const NFTNyc: FC<{}> = () => {
  return (
    <DefaultProvider>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 16 }}>
        <Grid2 container columns={12}>
          <Grid2
            component={Paper}
            size={12}
            elevation={2}
            minHeight={384}
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="16px 16px 0 0"
          >
            <Typography
              component="h1"
              ml={6}
              fontSize={{
                xs: 32,
                sm: 48,
                md: 64,
                lg: 128,
              }}
            >
              flick the dev
            </Typography>
            <Box flexGrow={1} />
            <NextImage
              alt="thinking face"
              src="/images/thinking.png"
              height={196}
              width={196}
              style={{
                marginRight: 32,
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Grid2>
          <Grid2 component={Card} elevation={6} size={12} width="100%">
            <CardActionArea href="/op-lock-cat">
              <CardContent
                component={Box}
                display="flex"
                justifyContent="center"
                alignContent="center"
                padding={4}
              >
                <Box
                  width="100%"
                  display="flex"
                  padding={4}
                  justifyContent="center"
                  alignContent="center"
                >
                  <NextImage
                    src="/images/op-lock-cat/closed-box-1.png"
                    width={128}
                    height={128}
                    alt="closed box"
                    style={{
                      animation: "wiggle 5s infinite 2s",
                      transform: "rotateZ(0deg)",
                      transformOrigin: "50% 50%",
                    }}
                  />

                  <Box flexGrow={1} />
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <Typography
                      mx={4}
                      fontSize={{
                        md: 32,
                        lg: 32,
                      }}
                    >
                      OP_LOCK_CAT
                    </Typography>
                  </Box>
                  <Box flexGrow={1} />
                  <NextImage
                    src="/images/op-lock-cat/closed-box-2.png"
                    width={128}
                    height={128}
                    alt="closed box"
                    style={{
                      animation: "wiggle 5s infinite 0s",
                      transform: "rotateZ(0deg)",
                      transformOrigin: "50% 50%",
                    }}
                  />
                </Box>
              </CardContent>
            </CardActionArea>
          </Grid2>
          <Grid2 component={Card} elevation={6} size={12} width="100%">
            <CardActionArea href="https://warpcast.com/~/invite-page/6097?id=6207e4ee">
              <CardContent
                component={Box}
                display="flex"
                justifyContent="center"
                alignContent="center"
                padding={4}
              >
                <Box
                  width="100%"
                  display="flex"
                  padding={4}
                  justifyContent="center"
                  alignContent="center"
                >
                  <NextImage
                    src="/images/farcaster/logo.jpeg"
                    width={128}
                    height={128}
                    alt="warpcast"
                    style={{
                      borderRadius: 16,
                    }}
                  />

                  <Box flexGrow={1} />
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <Typography
                      mx={4}
                      fontSize={{
                        md: 32,
                        lg: 32,
                      }}
                    >
                      @flick
                    </Typography>
                  </Box>
                  <Box flexGrow={1} />
                  <NextImage
                    src="/images/farcaster/flick-invite.png"
                    width={128}
                    height={128}
                    alt="warpcast invite qr code"
                  />
                </Box>
              </CardContent>
            </CardActionArea>
          </Grid2>
          <Grid2 component={Card} elevation={6} size={12} width="100%">
            <CardActionArea href="https://x.com/0xflick">
              <CardContent
                component={Box}
                display="flex"
                justifyContent="center"
                alignContent="center"
                padding={4}
              >
                <Box
                  width="100%"
                  display="flex"
                  padding={4}
                  justifyContent="center"
                  alignContent="center"
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <NextImage
                      src="/images/x.svg"
                      width={128}
                      height={128}
                      alt="x"
                    />
                  </Box>
                  <Box flexGrow={1} />
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <Typography
                      mx={4}
                      fontSize={{
                        md: 32,
                        lg: 32,
                      }}
                    >
                      @0xflick
                    </Typography>
                  </Box>

                  <Box flexGrow={1} />
                  <Box padding={1} sx={{ backgroundColor: "white" }}>
                    <QR value="https://x.com/0xflick" size={128} />
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Grid2>
          <Grid2 component={Card} elevation={6} size={12} width="100%">
            <CardActionArea href="https://t.me/flick_the_dev">
              <CardContent
                component={Box}
                display="flex"
                justifyContent="center"
                alignContent="center"
                padding={4}
              >
                <Box
                  width="100%"
                  display="flex"
                  padding={4}
                  justifyContent="center"
                  alignContent="center"
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <NextImage
                      src="/images/nftnyc/telegram.png"
                      width={128}
                      height={128}
                      alt="x"
                    />
                  </Box>
                  <Box flexGrow={1} />
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <Typography
                      mx={4}
                      fontSize={{
                        md: 32,
                        lg: 32,
                      }}
                    >
                      @flick_the_dev
                    </Typography>
                  </Box>

                  <Box flexGrow={1} />
                  <Box padding={1} sx={{ backgroundColor: "white" }}>
                    <QR value="https://t.me/flick_the_dev" size={128} />
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Grid2>
          <Grid2 component={Card} elevation={6} size={12} width="100%">
            <CardActionArea href="/op-lock-cat">
              <CardContent
                component={Box}
                display="flex"
                justifyContent="center"
                alignContent="center"
                padding={4}
              >
                <Box
                  width="100%"
                  display="flex"
                  padding={4}
                  justifyContent="center"
                  alignContent="center"
                >
                  <NextImage
                    src="/images/nftnyc/0xflick.png"
                    width={196}
                    height={128}
                    alt="closed box"
                  />

                  <Box flexGrow={1} />
                  <Box
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    justifyContent="center"
                  >
                    <Typography
                      mx={4}
                      fontSize={{
                        md: 32,
                        lg: 32,
                      }}
                    >
                      other projects
                    </Typography>
                  </Box>
                  <Box flexGrow={1} />
                  <NextImage
                    src="/images/nftnyc/206.png"
                    width={128}
                    height={128}
                    alt="closed box"
                  />
                </Box>
              </CardContent>
            </CardActionArea>
          </Grid2>
        </Grid2>
      </Container>
    </DefaultProvider>
  );
};

import { FC } from "react";
import Box from "@mui/material/Box";
import NextImage from "next/image";
import Typography from "@mui/material/Typography";

const HEADER_IMG = "/images/hero.png";

export const Hero: FC = () => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: {
          xs: "50vh",
          sm: "70vh",
        },
        overflow: "hidden",
        backgroundColor: "background.default",
      }}
    >
      <NextImage
        src={HEADER_IMG}
        alt="Hero"
        fill
        style={{
          objectFit: "cover",
        }}
        priority
      />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            color: "white",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            fontSize: {
              xs: "3rem",
              sm: "4rem",
              md: "5rem",
            },
            fontWeight: "bold",
            letterSpacing: "0.1em",
          }}
        >
          bitflick
        </Typography>
      </Box>
    </Box>
  );
};

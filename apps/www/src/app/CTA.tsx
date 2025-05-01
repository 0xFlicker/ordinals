import { FC } from "react";
import NextImage from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";

const CTA_IMG = "/images/frame.png";

export const CTA: FC = () => {
  return (
    <Container maxWidth="lg" sx={{ my: 8 }}>
      <Paper
        sx={{
          position: "relative",
          borderRadius: 4,
          overflow: "hidden",
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        elevation={4}
      >
        <NextImage
          src={CTA_IMG}
          alt="CTA Background"
          fill
          style={{
            objectFit: "cover",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            px: 4,
            py: 8,
            maxWidth: "800px",
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            color="white"
            gutterBottom
            sx={{
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              mb: 3,
            }}
          >
            Create Your Digital Legacy
          </Typography>
          <Typography
            variant="body1"
            color="white"
            sx={{
              mb: 6,
              textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
              fontSize: "1.1rem",
              lineHeight: 1.6,
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            href="/app"
            sx={{
              px: 6,
              py: 2,
              fontSize: "1.2rem",
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Launch App
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

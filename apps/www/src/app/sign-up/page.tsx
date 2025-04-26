"use client";
import { AppBar } from "@/components/AppBar";
import Container from "@mui/material/Container";
import { SignupCard } from "@/features/auth/components/SignupCard";

export default function Signup() {
  return (
    <>
      <AppBar left="Sign Up" />
      <Container
        sx={{
          pt: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SignupCard />
      </Container>
    </>
  );
}

"use client";
import { AppBar } from "@/components/AppBar";
import Container from "@mui/material/Container";
import { SignupCard } from "@/features/auth/components/SignupCard";
import { useRouter, useSearchParams } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("r");

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
        <SignupCard
          onSignup={() => {
            router.push(redirectPath || `/`);
          }}
        />
      </Container>
    </>
  );
}

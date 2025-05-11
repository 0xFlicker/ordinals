import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { getUserIdFromSession, getFullUser } from "../actions";
import { MultiChainProvider } from "@/features/wallet-standard";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import { AppHeader } from "./AppHeader";
import Link from "next/link";
import Typography from "@mui/material/Typography";

const INSCRIBE_URL = "/inscribe";

export default async function InscribePage() {
  const userId = await getUserIdFromSession();
  const user = userId ? await getFullUser(userId) : undefined;
  return (
    <MultiChainProvider
      initialBitcoinNetwork={BitcoinNetworkType.Mainnet}
      initialBitcoinPurpose={[AddressPurpose.Payment]}
      initialUser={user}
    >
      <Container
        maxWidth="md"
        sx={{
          pt: 8,
        }}
      >
        <AppHeader user={user} />
        <Link href={INSCRIBE_URL} style={{ textDecoration: "none" }}>
          <Button
            variant="contained"
            sx={{
              borderRadius: "28px",
              textTransform: "none",
              mt: 4,
              px: 4,
              py: 1.5,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: "1.5em", lineHeight: 1, mr: 2 }}
            >
              +
            </Typography>{" "}
            Create Inscription
          </Button>
        </Link>
      </Container>
    </MultiChainProvider>
  );
}

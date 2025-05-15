import { PayRoute } from "@/routes/Pay";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { MultiChainProvider } from "@/features/wallet-standard";
import {
  getFullUser,
  getInscriptionFunding,
  getUserIdFromSession,
} from "@/app/actions";
import Grid from "@mui/material/Grid";
import { fromGraphqlBitcoinNetwork } from "@/graphql/transforms";

type PayPageContentProps = {
  fundingId: string;
  user?: any;
  network: BitcoinNetworkType;
};

const PayPageContent = ({ fundingId, user, network }: PayPageContentProps) => (
  <MultiChainProvider
    initialBitcoinNetwork={network}
    initialBitcoinPurpose={[AddressPurpose.Payment]}
    initialUser={user}
  >
    <PayRoute
      fundingId={fundingId}
      initialBitcoinNetwork={network}
      handle={user?.handle}
      userId={user?.id}
    />
  </MultiChainProvider>
);

export default async function Page({
  params: { fundingId },
}: {
  params: { fundingId: string };
}) {
  try {
    console.log("Getting inscription funding");
    const inscriptionFunding = await getInscriptionFunding(fundingId);
    if (!inscriptionFunding) {
      console.log("No inscription funding");
      return (
        <>
          {/* TODO: replace  with a Not Found error */}
          <PayPageContent
            fundingId={fundingId}
            network={BitcoinNetworkType.Mainnet}
          />
        </>
      );
    }
    const userId = await getUserIdFromSession();
    if (!userId) {
      console.log("No user id");
      return (
        <PayPageContent
          fundingId={fundingId}
          network={BitcoinNetworkType.Mainnet}
        />
      );
    }

    const user = await getFullUser(userId);

    const network = fromGraphqlBitcoinNetwork(inscriptionFunding.network);

    return (
      <PayPageContent fundingId={fundingId} user={user} network={network} />
    );
  } catch (err) {
    console.error(err);
    return (
      <PayPageContent
        fundingId={fundingId}
        network={BitcoinNetworkType.Mainnet}
      />
    );
  }
}

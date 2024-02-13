import { getSdk, BitcoinNetwork } from "@/apiGraphql/api";
import { loadFont } from "@/fonts";
import { baseUrl } from "@/utils/config";
import { ImageResponse } from "@vercel/og";
import { FC } from "react";
import { createGraphqlClient } from "@/apiGraphql/client";

enum FontSize {
  Small = 24,
  Medium = 32,
  Large = 48,
}

const FeeFields: FC<{
  title: string;
  value: number;
}> = ({ title, value }) => {
  return (
    <div
      style={{
        display: "flex",
        width: 600,
        alignItems: "flex-start",
        justifyContent: "center",
        fontFamily: "Roboto",
        fontWeight: 400,
        fontStyle: "normal",
        flexDirection: "row",
      }}
    >
      <span
        style={{
          fontSize: FontSize.Medium,
          width: 200,
        }}
      >
        {`${title}:`}
      </span>
      <span
        style={{
          fontSize: FontSize.Medium,
          width: 100,
          marginLeft: 8,
        }}
      >
        {value}
      </span>
    </div>
  );
};

const Info: FC<{
  minimum: number;
  fastest: number;
  halfHour: number;
  hour: number;
}> = ({ minimum, fastest, halfHour, hour }) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          width: 800,
          height: 420,
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Roboto",
          fontWeight: 400,
          fontStyle: "normal",
          flexDirection: "column",
          backgroundColor: "rgb(23, 16, 31)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: 800,
          }}
        >
          {
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              style={{
                width: "200",
                height: "200",
                padding: "20",
              }}
              src={`${baseUrl.get()}/images/206.png`}
            />
          }
          <p
            style={{
              fontSize: FontSize.Large,
              width: 600,
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Roboto",
              fontWeight: 400,
              fontStyle: "normal",
              flexDirection: "column",
            }}
          >
            BITCOIN FEE REPORT
          </p>
        </div>
        <FeeFields title="minimum" value={minimum} />
        <FeeFields title="hour" value={hour} />
        <FeeFields title="half hour" value={halfHour} />
        <FeeFields title="fastest" value={fastest} />
      </div>
    </>
  );
};

export async function GET() {
  const graphqlClient = createGraphqlClient();
  const sdk = getSdk(graphqlClient);

  const [fees, roboto] = await Promise.all([
    sdk.feeEstimate({
      network: BitcoinNetwork.Mainnet,
    }),
    loadFont("Roboto-Regular.ttf"),
  ]);
  return new ImageResponse(
    (
      <Info
        minimum={fees.currentBitcoinFees.minimum}
        fastest={fees.currentBitcoinFees.fastest}
        halfHour={fees.currentBitcoinFees.halfHour}
        hour={fees.currentBitcoinFees.hour}
      />
    ),
    {
      width: 800,
      height: 420,
      fonts: [
        {
          name: "Roboto",
          data: roboto,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 30;

import { loadFont } from "@/fonts";
import { baseUrl } from "@/utils/config";
import { ImageResponse } from "@vercel/og";
import { FC } from "react";

enum FontSize {
  Small = 24,
  Medium = 32,
  Large = 48,
}

const Info: FC<{}> = ({}) => {
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
        <p
          style={{
            fontSize: FontSize.Medium,
            width: 600,
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Roboto",
            fontWeight: 400,
            fontStyle: "normal",
            flexDirection: "column",
            marginTop: "65px",
          }}
        >
          Get the latest bitcoin fee estimates
        </p>
      </div>
    </>
  );
};

export async function GET() {
  const [roboto] = await Promise.all([loadFont("Roboto-Regular.ttf")]);
  return new ImageResponse(<Info />, {
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
  });
}

export const dynamic = "force-dynamic";

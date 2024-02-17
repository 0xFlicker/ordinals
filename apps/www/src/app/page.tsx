import { Home } from "@/routes/Home";
import { baseUrl } from "@/utils/config";

export default function Page() {
  const imgUrl = baseUrl.get() + "/api/meta/axolotl";
  return (
    <>
      <head>
        <meta property="og:site_name" content="bitflick" />
        <meta property="og:title" content="Bitflick Beta" />
        <meta
          property="og:description"
          content="a new way to inscribe on bitcoin"
        />
        <meta property="og:image" content={imgUrl} />
        <meta property="twitter:title" content="Axolotl Valley" />
        <meta
          property="twitter:description"
          content="mint an axolotl on bitcoin"
        />
        <meta content="verification" name="LR1011" />
        <meta property="twitter:image" content={imgUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@0xflick" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={imgUrl} />
      </head>
      <Home />
    </>
  );
}

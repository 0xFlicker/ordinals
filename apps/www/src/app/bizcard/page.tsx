import { NFTNyc } from "@/routes/NftNyc";
import React from "react";

import "./global.css";

export const metadata = {
  title: "@NFT.NYC",
  description: "Connect with Flick",
  openGraph: {
    images: [
      {
        url: "https://www.bitflick.xyz/images/nftnyc/bizcard-1.jpg",
      },
    ],
  },
};

export default function Page({}) {
  return <NFTNyc />;
}

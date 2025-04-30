import NextImage, { ImageProps } from "next/image";
import { FC } from "react";
import bitcoinSvg from "../../public/images/bitcoin-btc-logo.svg";

export const BitcoinIcon: FC<
  Omit<ImageProps, "src" | "alt"> & { size?: number }
> = ({ size = 24, ...props }) => {
  return (
    <NextImage
      {...props}
      src={bitcoinSvg}
      alt="Bitcoin"
      width={size}
      height={size}
    />
  );
};

import NextImage, { ImageProps } from "next/image";
import { FC } from "react";
import ethereumSvg from "../../public/images/ethereum-eth-logo.svg";

export const EthereumIcon: FC<
  Omit<ImageProps, "src" | "alt"> & { size?: number; hidden?: boolean }
> = ({ size = 24, hidden, ...props }) => {
  return (
    <NextImage
      {...props}
      style={{
        ...(hidden ? { visibility: "hidden" } : {}),
        ...(props.style ?? {}),
      }}
      src={ethereumSvg}
      alt="Ethereum"
      width={size}
      height={size}
    />
  );
};

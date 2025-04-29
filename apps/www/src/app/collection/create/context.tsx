"use client";

import { DefaultProvider } from "@/context/default";
import { AutoConnect } from "@/features/web3";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";

export const Context = ({ children }: { children: React.ReactNode }) => {
  return (
    <DefaultProvider>
      <SwitchableNetwork title="bitflick">
        <AutoConnect>{children}</AutoConnect>
      </SwitchableNetwork>
    </DefaultProvider>
  );
};

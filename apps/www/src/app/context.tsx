"use client";
import { DefaultProvider } from "@/context/default";

export default function Context({ children }: { children: React.ReactNode }) {
  return <DefaultProvider>{children}</DefaultProvider>;
}

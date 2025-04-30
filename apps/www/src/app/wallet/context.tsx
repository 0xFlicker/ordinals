import { ReactNode } from "react";

export default function Context({
  children,
}: {
  children: NonNullable<ReactNode>;
}) {
  return children;
}

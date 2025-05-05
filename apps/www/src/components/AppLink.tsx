"use client";
import NextLink from "next/link";
import { Link as MUILink, LinkProps } from "@mui/material";
import { FC, PropsWithChildren, forwardRef } from "react";

export const AppLink: FC<PropsWithChildren<LinkProps>> = forwardRef(
  function AppLink({ children, href, ...props }, ref) {
    return (
      <MUILink ref={ref} {...props} component={NextLink} href={href ?? "#"}>
        {children}
      </MUILink>
    );
  }
);

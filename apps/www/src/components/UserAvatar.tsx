"use client";
import { FC, useMemo } from "react";
import {
  IUserWithAddresses,
  IUserWithRoles,
} from "@0xflick/ordinals-rbac-models";
import Avatar from "@mui/material/Avatar";
// Type assertion for untyped module
const createStellarIdenticon = require("stellar-identicon-js") as (
  address: string
) => HTMLCanvasElement;

export const UserAvatar: FC<{
  user: IUserWithAddresses | IUserWithRoles;
}> = ({ user }) => {
  const canvas = useMemo(() => {
    if (user) {
      return createStellarIdenticon(user.userId);
    }
    return null;
  }, [user]);
  return <Avatar src={canvas?.toDataURL()} />;
};

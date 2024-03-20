import { hexToVector3, Vector3 } from "@0xflick/assets";

export const pureGreenVector: Vector3 = [0, 1, 0];
export const brown = "#906B4A";
export const pink = "#FEC8EA";
export const peach = "#FFCBBF";
export const white = "#F0F4FB";
export const lime = "#B1FF8B";
export const black = "#3D3F49";
export const red = "#ED8567";

export type TAllBaseColors =
  | typeof brown
  | typeof pink
  | typeof peach
  | typeof white
  | typeof lime
  | typeof black
  | typeof red;

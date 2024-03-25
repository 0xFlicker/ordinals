export type BackgroundType =
  | "gradient-diagonal"
  | "gradient-horizontal"
  | "pattern"
  | "stripes"
  | "plain";

export type AliveEyes =
  | "stunned"
  | "straight"
  | "sideeye"
  | "scared"
  | "nocare"
  | "happy"
  | "asleep"
  | "angry"
  | "wink";

export type CatPositionType = "peeking" | "hole" | "outside";

export type CatAliveType = "plain" | "tiger" | "dotted";

export type CatDeadType = "ghost" | "skeleton" | "zombie";

export type AliveOrDead = "a" | "d";

export type BoxType = "both-up" | "both-down" | "flipped";

export enum Layers {
  background = -99,
  box = 0,
  cat = 50,
  catAccent = 100,
  eyes = 150,
}

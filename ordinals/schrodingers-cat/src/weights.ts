import { mapWeightedValuesToRange } from "@0xflick/assets";
import {
  Colors,
  TAccentColors,
  TAllBaseColors,
  TBackgroundColors,
  TBoxColors,
} from "./colors.js";
import {
  AliveEyes,
  AliveOrDead,
  BackgroundType,
  BoxType,
  CatAliveType,
  CatDeadType,
  CatPositionType,
} from "./types.js";

export const colorWeights = mapWeightedValuesToRange<TAllBaseColors>(0, 255, {
  black: 1,
  brown: 1,
  bumblebee: 1,
  butterfly: 1,
  dolphin: 1,
  elephant: 1,
  flamingo: 1,
  frog: 1,
  ladybug: 1,
  lime: 1,
  lion: 1,
  night: 1,
  peach: 1,
  peacock: 1,
  pink: 1,
  polarBear: 1,
  red: 1,
  shark: 1,
  white: 1,
});

export const accentColorWeights = mapWeightedValuesToRange<TAccentColors>(
  0,
  255,
  {
    brown: 1,
    pink: 1,
    peach: 1,
    black: 1,
    red: 1,
    lion: 1,
    flamingo: 1,
    dolphin: 1,
    night: 1,
    frog: 1,
    ladybug: 1,
    bumblebee: 1,
    butterfly: 1,
    shark: 1,
    elephant: 1,
  },
);

export const backgroundColorWeights =
  mapWeightedValuesToRange<TBackgroundColors>(0, 255, {
    lime: 1,
    peacock: 1,
    bumblebee: 1,
    elephant: 1,
  });

export const backgroundTypeWeights = mapWeightedValuesToRange<BackgroundType>(
  0,
  255,
  {
    ["gradient-diagonal"]: 1,
    ["gradient-horizontal"]: 1,
    pattern: 1,
    stripes: 1,
    plain: 1,
  },
);

export const aliveOrDeadWeights = mapWeightedValuesToRange<AliveOrDead>(
  0,
  255,
  {
    a: 50,
    d: 50,
  },
);

export const deadCatWeights = mapWeightedValuesToRange<CatDeadType>(0, 255, {
  ghost: 1,
  skeleton: 1,
  zombie: 1,
});

export const eyeWeights = mapWeightedValuesToRange<AliveEyes>(0, 255, {
  stunned: 1,
  straight: 1,
  sideeye: 1,
  scared: 1,
  nocare: 1,
  happy: 1,
  asleep: 1,
  angry: 1,
  wink: 1,
});

export const catPositionWeights = mapWeightedValuesToRange<CatPositionType>(
  0,
  255,
  {
    peeking: 1,
    hole: 1,
    outside: 1,
  },
);

export const catSkinWeights = mapWeightedValuesToRange<CatAliveType>(0, 255, {
  plain: 1,
  tiger: 1,
  dotted: 1,
});

export const boxColorWeights = mapWeightedValuesToRange<TBoxColors>(0, 255, {
  cardboard: 1,
  tanBox: 1,
  whiteBox: 1,
  blackBox: 1,
});

export const openBoxWeights = mapWeightedValuesToRange<BoxType>(0, 255, {
  ["both-down"]: 1,
  ["both-up"]: 1,
  flipped: 1,
});

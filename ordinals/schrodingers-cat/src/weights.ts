import { mapWeightedValuesToRange } from "@0xflick/assets";
import { black, brown, lime, peach, pink, red, white } from "./colors.js";

export const colorWeights = mapWeightedValuesToRange(0, 255, {
  [black]: 30,
  [brown]: 30,
  [white]: 20,
  [pink]: 5,
  [peach]: 5,
  [lime]: 5,
  [red]: 5,
});

export const aliveOrDeadWeights = mapWeightedValuesToRange(0, 255, {
  a: 50,
  d: 50,
});

export const deadCatWeights = mapWeightedValuesToRange(0, 255, {
  ghost: 70,
  skeleton: 10,
  zombie: 20,
});

export const aliveEyeWeights = mapWeightedValuesToRange(0, 255, {
  stunned: 1,
  straight: 1,
  sideways: 1,
  scared: 1,
  nocare: 1,
  happy: 1,
  asleep: 1,
  angry: 1,
  wink: 1,
});

export const catTypeWeights = mapWeightedValuesToRange(0, 255, {
  peek: 1,
  hole: 1,
  outside: 1,
});

export const catPlainType = mapWeightedValuesToRange(0, 255, {
  plain: 70,
  tiger: 30,
});

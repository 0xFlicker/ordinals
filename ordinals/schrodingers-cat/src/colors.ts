import {
  chromaKey,
  FilterOperations,
  hexToVector3,
  Vector3,
} from "@0xflick/assets";

export const pureGreen: Vector3 = [0, 1, 0];
export enum Colors {
  brown = "#906B4A",
  pink = "#FEC8EA",
  peach = "#FFCBBF",
  white = "#F0F4FB",
  lime = "#B1FF8B",
  black = "#3D3F49",
  red = "#ED8567",
  lion = "#C19A6B",
  flamingo = "#FC8EAC",
  dolphin = "#6A5ACD",
  night = "#000000",
  polarBear = "#FCFCFC",
  peacock = "#1F75FE",
  frog = "#32CD32",
  ladybug = "#FF0000",
  bumblebee = "#FFD300",
  butterfly = "#FF69B4",
  shark = "#708090",
  elephant = "#808080",
  // box colors
  cardboard = "#8B4513",
  tanBox = "#D2B48C",
  whiteBox = "#F0F4FB",
  blackBox = "#3D3F49",
}

function createColorDetails<T extends keyof typeof Colors>(
  colors: [T, Colors][],
): { [colorName in T]: ApplyFilter[] } {
  return colors.reduce(
    (acc, [colorName, color]) => {
      return {
        ...acc,
        [colorName]: [
          (f: FilterOperations) => chromaKey(f, pureGreen, hexToVector3(color)),
        ],
      };
    },
    {} as { [colorName in T]: ApplyFilter[] },
  );
}

export type ApplyFilter = (o: FilterOperations) => unknown;

export type BoxColors =
  | Colors.cardboard
  | Colors.tanBox
  | Colors.whiteBox
  | Colors.blackBox;
export type TBoxColors = "cardboard" | "tanBox" | "whiteBox" | "blackBox";

const boxColors: [TBoxColors, BoxColors][] = [
  ["cardboard", Colors.cardboard],
  ["tanBox", Colors.tanBox],
  ["whiteBox", Colors.whiteBox],
  ["blackBox", Colors.blackBox],
];
export const boxColorDetails = createColorDetails(boxColors);

export type TAllBaseColors = Exclude<keyof typeof Colors, TBoxColors>;
const colors: [keyof typeof Colors, Colors][] = Object.entries(Colors).map(
  ([colorName, value]) => [
    colorName as keyof typeof Colors,
    Colors[colorName as keyof typeof Colors],
  ],
);
export const baseColorDetails = createColorDetails(colors);

export type TColorizer = typeof baseColorDetails;

export type BackgroundColors =
  | Colors.bumblebee
  | Colors.lime
  | Colors.elephant
  | Colors.peacock;
export type TBackgroundColors = "bumblebee" | "lime" | "elephant" | "peacock";

const backgroundColors: [TBackgroundColors, BackgroundColors][] = [
  ["lime", Colors.lime],
  ["peacock", Colors.peacock],
  ["elephant", Colors.elephant],
  ["bumblebee", Colors.bumblebee],
];

export const backgroundColorDetails = createColorDetails(backgroundColors);
export type TBackgroundColorDetails = typeof backgroundColorDetails;

export type AccentColors =
  | Colors.brown
  | Colors.pink
  | Colors.peach
  | Colors.black
  | Colors.red
  | Colors.lion
  | Colors.flamingo
  | Colors.dolphin
  | Colors.night
  | Colors.frog
  | Colors.ladybug
  | Colors.bumblebee
  | Colors.butterfly
  | Colors.shark
  | Colors.elephant;
export type TAccentColors =
  | "brown"
  | "pink"
  | "peach"
  | "black"
  | "red"
  | "lion"
  | "flamingo"
  | "dolphin"
  | "night"
  | "frog"
  | "ladybug"
  | "bumblebee"
  | "butterfly"
  | "shark"
  | "elephant";

const accentColors: [keyof typeof Colors, Colors][] = [
  ["brown", Colors.brown],
  ["pink", Colors.pink],
  ["peach", Colors.peach],
  ["black", Colors.black],
  ["red", Colors.red],
  ["lion", Colors.lion],
  ["flamingo", Colors.flamingo],
  ["dolphin", Colors.dolphin],
  ["night", Colors.night],
  ["frog", Colors.frog],
  ["ladybug", Colors.ladybug],
  ["bumblebee", Colors.bumblebee],
  ["butterfly", Colors.butterfly],
  ["shark", Colors.shark],
  ["elephant", Colors.elephant],
];

export const accentColorDetails = createColorDetails(accentColors);

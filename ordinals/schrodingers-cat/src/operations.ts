import {
  createFilter,
  FilterOperations,
  cachedDrawImage,
  composeDrawOps,
  composeWithCanvas,
  resolveProperties,
  chromaKey,
  hexToVector3,
} from "@0xflick/assets";
import type { ILayer, IImageFetcher } from "@0xflick/assets";

import {
  type TAllBaseColors,
  type TBackgroundColors,
  type BackgroundColors,
  type TColorizer,
  type Colors,
  type ApplyFilter,
  type TBackgroundColorDetails,
  // black,
  // brown,
  // lime,
  // peach,
  // pink,
  // pureGreen,
  // red,
  // white,
  // bumblebee,
  // butterfly,
  // dolphin,
  // elephant,
  // flamingo,
  // frog,
  // ladybug,
  // lion,
  // night,
  // peacock,
  // polarBear,
  // shark,
  accentColorDetails,
  backgroundColorDetails,
  baseColorDetails,
  TBoxColors,
  boxColorDetails,
  TAccentColors,
} from "./colors.js";
import {
  AliveEyes,
  BackgroundType,
  BoxType,
  CatAliveType,
  CatDeadType,
  CatPositionType,
  Layers,
} from "./types.js";

function applyColorFilters<T extends string>({
  colors,
  color,
}: {
  colors: Record<T, ApplyFilter[]>;
  color: T;
}) {
  const ops: ILayer["draw"][] = [];
  const filters = colors[color];
  if (filters) {
    ops.push(
      ...filters.map((filterOp) => {
        const [ops, filter] = createFilter();
        filterOp(filter);
        return ops();
      }),
    );
  }
  return ops;
}

export async function makeColoredLayer<
  C extends string,
  D extends Record<string, ApplyFilter[]>,
>(
  {
    zIndex,
    color,
    colorDetails,
    path,
  }: {
    color: C;
    colorDetails: D;
    path: string;
    zIndex: number;
  },
  imageFetcher: IImageFetcher,
) {
  return {
    draw: composeDrawOps(
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`${path}`), imageFetcher),
      ),
      ...applyColorFilters({ colors: colorDetails, color }),
    ),
    zIndex,
  };
}

interface IBackgroundLayer {
  color: TBackgroundColors;
  layerName: BackgroundType;
}
export async function makeBackgroundLayer(
  { color, layerName }: IBackgroundLayer,
  imageFetcher: IImageFetcher,
) {
  return {
    draw: composeDrawOps(
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`bg-${layerName}`), imageFetcher),
      ),
      ...applyColorFilters({ colors: backgroundColorDetails, color }),
    ),
    zIndex: Layers.background,
  };
}

export async function makeBoxLayer(
  { color, open }: { color: TBoxColors; open?: BoxType },
  imageFetcher: IImageFetcher,
) {
  const baseBox = !!open ? "open" : "closed";
  const ops: ILayer["draw"][] = [];
  ops.push(
    await composeWithCanvas(
      cachedDrawImage(resolveProperties("closed"), imageFetcher),
      ...applyColorFilters({ colors: boxColorDetails, color }),
    ),
  );
  if (open) {
    ops.push(
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`${baseBox}`), imageFetcher),
        ...applyColorFilters({ colors: boxColorDetails, color }),
      ),
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`open-${open}`), imageFetcher),
        ...applyColorFilters({ colors: boxColorDetails, color }),
      ),
    );
  }
  return {
    draw: composeDrawOps(...ops),
    zIndex: Layers.box,
  };
}

export async function makeCatLayer(
  {
    accentColor,
    color,
    catSkin,
    position,
    eyes,
  }: {
    accentColor: TAccentColors;
    color: TAllBaseColors;
    catSkin: CatAliveType | "ethereal" | "missing";
    position: CatPositionType;
    eyes: "missing" | AliveEyes | "undead";
  },
  imageFetcher: IImageFetcher,
) {
  const ops: ILayer["draw"][] = [];
  if (!["ethereal", "missing"].includes(catSkin)) {
    ops.push(
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`${position}-plain`), imageFetcher),
        ...applyColorFilters({ colors: baseColorDetails, color }),
      ),
    );
  }
  if (catSkin === "ethereal") {
    ops.push(
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`${position}-ghost`), imageFetcher),
        ...applyColorFilters({ colors: baseColorDetails, color }),
      ),
    );
  }
  if (catSkin === "missing") {
    ops.push(
      await composeWithCanvas(
        cachedDrawImage(
          resolveProperties(`${position}-skeleton`),
          imageFetcher,
        ),
        ...applyColorFilters({ colors: baseColorDetails, color }),
      ),
    );
  }
  if (!["ethereal", "missing", "plain"].includes(catSkin)) {
    ops.push(
      await composeWithCanvas(
        cachedDrawImage(
          resolveProperties(`${position}-${catSkin}`),
          imageFetcher,
        ),
        ...applyColorFilters({
          colors: accentColorDetails,
          color: accentColor,
        }),
      ),
    );
  }
  if (eyes === "undead") {
    ops.push(
      await composeWithCanvas(
        cachedDrawImage(resolveProperties(`${position}-zombie`), imageFetcher),
        ...applyColorFilters({
          colors: accentColorDetails,
          color: accentColor,
        }),
      ),
    );
  }
  if (eyes !== "missing") {
    ops.push(
      cachedDrawImage(resolveProperties(`${position}-${eyes}`), imageFetcher),
    );
  }

  return {
    draw: composeDrawOps(...ops),
    zIndex: Layers.box,
  };
}

import type { ILayer, IMetadata, IImageFetcher } from "@0xflick/assets";
import { weightSampleFromWeights } from "@0xflick/assets";
import {
  makeCatLayer,
  makeBackgroundLayer,
  makeBoxLayer,
} from "./operations.js";
import * as weights from "./weights.js";
import {
  AliveEyes,
  AliveOrDead,
  BoxType,
  CatAliveType,
  CatDeadType,
  CatPositionType,
} from "./types.js";
import { TAccentColors, TAllBaseColors } from "./colors.js";

export function uint8ArrayToHexString(uint8Array: Uint8Array) {
  let hexString = "";
  for (let i = 0; i < uint8Array.length; i++) {
    let hex = uint8Array[i].toString(16);
    hex = hex.length === 1 ? "0" + hex : hex;
    hexString += hex;
  }
  return hexString;
}

export type IAttributeMetadata = Omit<
  IMetadata,
  "name" | "image" | "tokenId"
> & {
  boxSeed: string;
  revealSeed?: string;
};

export function generateTraits({
  boxSeed,
  revealSeed,
}: {
  boxSeed: Uint8Array;
  revealSeed?: Uint8Array;
}) {
  const createSeedChomper = (seed: Uint8Array) => {
    const ref = { seed };
    return [
      ref,
      (range: number) => {
        if (range != 255) {
          throw new Error(`Expected a range of 255 but got ${range}`);
        }
        const value = ref.seed[0];
        ref.seed = ref.seed.slice(1);
        return value;
      },
    ] as const;
  };
  const [boxSeedRef, boxSeedChomper] = createSeedChomper(boxSeed);
  const isRevealed = !!revealSeed;
  const [revealSeedRef, revealSeedChomper] = isRevealed
    ? createSeedChomper(revealSeed)
    : [];
  const backgroundColor = weightSampleFromWeights(
    weights.backgroundColorWeights,
    boxSeedChomper,
  );
  const backgroundType = weightSampleFromWeights(
    weights.backgroundTypeWeights,
    boxSeedChomper,
  );
  const baseColor = weightSampleFromWeights(
    weights.colorWeights,
    boxSeedChomper,
  );
  const boxColor = weightSampleFromWeights(
    weights.boxColorWeights,
    boxSeedChomper,
  );

  let aliveOrDead: null | AliveOrDead = null;
  let boxType: null | BoxType = !isRevealed
    ? weightSampleFromWeights(weights.openBoxWeights, boxSeedChomper)
    : null;
  // let catColor: null | TAllBaseColors = null;
  let accentColor: null | TAccentColors = null;
  let catType: null | CatDeadType | "healthy" = null;
  let eyeType: null | AliveEyes | "undead" | "missing" = null;
  let catSkinType: null | CatAliveType | "ethereal" | "missing" = null;
  let catPositionType: null | CatPositionType = null;

  if (isRevealed) {
    aliveOrDead = weightSampleFromWeights(
      weights.aliveOrDeadWeights,
      revealSeedChomper,
    );
    boxType = weightSampleFromWeights(
      weights.openBoxWeights,
      revealSeedChomper,
    );

    if (aliveOrDead === "a") {
      // catColor = weightSampleFromWeights(
      //   weights.colorWeights,
      //   revealSeedChomper,
      // );
      accentColor = weightSampleFromWeights(
        weights.accentColorWeights,
        revealSeedChomper,
      );
      catPositionType = weightSampleFromWeights(
        weights.catPositionWeights,
        revealSeedChomper,
      );
      catType = "healthy";
      catSkinType = weightSampleFromWeights(
        weights.catSkinWeights,
        revealSeedChomper,
      );
      eyeType = weightSampleFromWeights(weights.eyeWeights, revealSeedChomper);
    } else {
      catType = weightSampleFromWeights(
        weights.deadCatWeights,
        revealSeedChomper,
      );
      catPositionType = weightSampleFromWeights(
        weights.catPositionWeights,
        revealSeedChomper,
      );
      switch (catType) {
        case "ghost":
          eyeType = weightSampleFromWeights(
            weights.eyeWeights,
            revealSeedChomper,
          );
          catSkinType = "ethereal";
          break;
        case "skeleton":
          eyeType = "missing";
          catSkinType = "missing";
          break;
        case "zombie":
          catSkinType = weightSampleFromWeights(
            weights.catSkinWeights,
            revealSeedChomper,
          );
          eyeType = "undead";
          break;
      }
    }
  } else {
    boxType = weightSampleFromWeights(weights.openBoxWeights, boxSeedChomper);
  }

  const metadata: IAttributeMetadata = {
    boxSeed: uint8ArrayToHexString(boxSeed),
    ...(revealSeed && { revealSeed: uint8ArrayToHexString(revealSeed) }),
    attributes: [
      {
        trait_type: "Background Color",
        value: backgroundColor,
      },
      {
        trait_type: "Background Type",
        value: backgroundType,
      },
      {
        trait_type: "Base Color",
        value: baseColor,
      },
      {
        trait_type: "Box Color",
        value: boxColor,
      },
      ...(aliveOrDead !== null
        ? [
            {
              trait_type: "Box Type",
              value: boxType,
            },
          ]
        : []),
      ...(aliveOrDead === "a"
        ? [
            {
              trait_type: "Cat Color",
              value: accentColor,
            },
            {
              trait_type: "Cat Position",
              value: catPositionType,
            },
            {
              trait_type: "Cat Type",
              value: catType,
            },
            {
              trait_type: "Eye Type",
              value: eyeType,
            },
            {
              trait_type: "Cat Skin Type",
              value: catSkinType,
            },
          ]
        : []),
      ...(aliveOrDead === "d"
        ? [
            {
              trait_type: "Cat Type",
              value: catType,
            },
            {
              trait_type: "Eye Type",
              value: eyeType,
            },
            ...(catSkinType
              ? [
                  {
                    trait_type: "Cat Skin Type",
                    value: catSkinType,
                  },
                ]
              : []),
          ]
        : []),
    ],
  };

  return {
    metadata,
    backgroundColor,
    backgroundType,
    baseColor,
    boxColor,
    boxType,
    aliveOrDead,
    accentColor,
    catPositionType,
    catSkinType,
    catType,
    eyeType,
  };
}

export async function operations({
  boxSeed,
  revealSeed,
  imageFetcher,
}: {
  boxSeed: Uint8Array;
  revealSeed?: Uint8Array;
  imageFetcher: IImageFetcher;
}): Promise<{
  metadata: IAttributeMetadata;
  layers: ILayer[];
}> {
  const {
    metadata,
    backgroundColor,
    backgroundType,
    boxColor,
    aliveOrDead,
    baseColor,
    accentColor,
    boxType,
    catType,
    catPositionType,
    catSkinType,
    eyeType,
  } = generateTraits({
    boxSeed,
    revealSeed,
  });
  // should only be alive or dead
  const open = catType !== null && boxType !== null ? boxType : null;
  return {
    metadata,
    layers: [
      await makeBackgroundLayer(
        { color: backgroundColor, layerName: backgroundType },
        imageFetcher,
      ),
      await makeBoxLayer({ color: boxColor, open }, imageFetcher),
      ...(aliveOrDead
        ? [
            await makeCatLayer(
              {
                accentColor,
                color: baseColor,
                catSkin: catSkinType,
                eyes: eyeType,
                position: catPositionType,
              },
              imageFetcher,
            ),
          ]
        : []),
    ],
  };
}

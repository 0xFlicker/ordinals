declare module "@0xflick/assets" {
  export interface IAttributeString {
    value: string;
    trait_type: string;
    colors?: string[];
  }
  export interface IAttributeNumeric {
    value: number;
    trait_type: string;
    display_type?: "number" | "boost_number" | "boost_percentage";
  }
  export type IMetadataAttribute = IAttributeString | IAttributeNumeric;
  export interface IMetadata {
    image: string;
    description?: string;
    tokenId?: string;
    external_url?: string;
    name: string;
    attributes?: IMetadataAttribute[];
    properties?: Record<string, string>;
    edition?: string | number;
    id?: string | number;
  }
  export interface IImageFetcher {
    (key: string): Promise<HTMLImageElement>;
  }
  export declare function getImage(
    imgPath: string,
    imageFetcher: IImageFetcher,
  ): Promise<HTMLImageElement>;
  export type Vector3 = [number, number, number];
  export type Vector4 = [number, number, number, number];
  export type Vector5 = [number, number, number, number, number];
  export type Matrix_5v4 = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  export declare function makeOperationFromMatrix(
    alpha: number,
    m: number[],
  ): (ctx: CanvasRenderingContext2D) => Promise<void>;
  export type FilterOperations = ReturnType<typeof createFilter>[1];
  export declare function createFilter(): [
    () => (ctx: CanvasRenderingContext2D) => Promise<void>,
    {
      getMatrix: () => Matrix_5v4;
      setMatrix: (m: Matrix_5v4) => void;
      setAlpha: (a: number) => void;
      multiply: (out: Matrix_5v4, a: Matrix_5v4, b: Matrix_5v4) => Matrix_5v4;
      colorMatrix: (_matrix: Matrix_5v4) => Matrix_5v4;
      loadMatrix: (_matrix: Matrix_5v4, _multiply?: boolean) => void;
    },
  ];
  export type MatrixState = ReturnType<typeof createFilter>[1];
  export declare function brightness(
    state: MatrixState,
    b: number,
    _multiply?: boolean,
  ): void;
  export declare function saturate(
    state: MatrixState,
    amount: number,
    _multiply?: boolean,
  ): void;
  export declare function greyscale(
    state: MatrixState,
    scale: number,
    _multiply?: boolean,
  ): void;
  export declare function chromaKey(
    state: MatrixState,
    chroma: Vector3,
    rgb: Vector3,
  ): void;
  export declare function hue(
    state: MatrixState,
    rotation: number,
    _multiply?: boolean,
  ): void;
  export declare function contrast(
    state: MatrixState,
    amount: number,
    _multiply?: boolean,
  ): void;
  export declare function desaturate(state: MatrixState): void;
  export declare function negative(
    state: MatrixState,
    _multiply?: boolean,
  ): void;
  export declare function sepia(state: MatrixState, _multiply?: boolean): void;
  export declare function technicolor(
    state: MatrixState,
    _multiply?: boolean,
  ): void;
  export declare function polaroid(
    state: MatrixState,
    _multiply?: boolean,
  ): void;
  export declare function kodachrome(
    state: MatrixState,
    _multiply?: boolean,
  ): void;
  export declare function browni(state: MatrixState, _multiply?: boolean): void;
  export declare function vintage(
    state: MatrixState,
    _multiply?: boolean,
  ): void;
  export declare function hexToVector3(hexColor: string): Vector3;
  export declare function createCanvas(
    width: number,
    height: number,
  ): HTMLCanvasElement;
  export declare const alwaysCompatible: (other: ILayer) => boolean;
  export declare function resolveProperties(path: string): string;
  export declare function weightSampleFromWeights<T extends string>(
    _weights: {
      [key in T]: number;
    },
    randomProvider?: (sum: number) => number,
  ): T;
  export declare function mapWeightedValuesToRange<T extends string>(
    min: number,
    max: number,
    weights: {
      [key in T]: number;
    },
  ): {
    [key in T]: number;
  };
  export declare function mapWeightsToRange(
    weights: number[],
    min: number,
    max: number,
  ): number[];
  export declare function weightedSample<T>(
    list: T[],
    weights: number[],
    randomProvider?: (sum: number) => number,
  ): T;
  export declare function weightedChance<T>(list: T[], weights: number[]): T;
  export declare function zipObj<T extends string, U>(
    keys: T[],
    values: U[],
  ): {
    [key in T]: U;
  };
  export interface ILayer {
    draw(ctx: CanvasRenderingContext2D): Promise<void>;
    zIndex: number;
  }
  export interface IGeneratable {
    generate(ctx: CanvasRenderingContext2D): void;
    layers: ILayer[];
  }
  export declare function cachedDrawImage(
    imgPath: string,
    imageFetcher: IImageFetcher,
  ): (ctx: CanvasRenderingContext2D) => Promise<void>;
  export declare function composeDrawOps(
    ...ops: ((ctx: CanvasRenderingContext2D) => Promise<void>)[]
  ): (ctx: CanvasRenderingContext2D) => Promise<void>;
  export declare function composeWithCanvas(
    ...ops: ((ctx: CanvasRenderingContext2D) => Promise<void>)[]
  ): Promise<(ctx: CanvasRenderingContext2D) => Promise<void>>;
  export declare function renderCanvas(
    canvas: HTMLCanvasElement,
    layers: ILayer[],
  ): Promise<void>;
  export declare function renderHtmlCanvas(
    canvas: HTMLCanvasElement,
    layers: ILayer[],
  ): Promise<void>;
  export declare function renderCanvasCtx(
    ctx: CanvasRenderingContext2D,
    layers: ILayer[],
    top: number,
    left: number,
    width: number,
    height: number,
    progress?: (current: number, total: number) => void,
  ): Promise<void>;
}

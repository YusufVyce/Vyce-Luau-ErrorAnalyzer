/** The parts of gifenc (no bundled types) that the GIF cropper uses. */
declare module "gifenc" {
  export type Palette = number[][];
  type Format = "rgb565" | "rgb444" | "rgba4444";

  export interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: Palette;
        delay?: number;
        transparent?: boolean;
        transparentIndex?: number;
        repeat?: number;
        dispose?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): Encoder;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: { format?: Format; oneBitAlpha?: boolean | number },
  ): Palette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: Format,
  ): Uint8Array;
}

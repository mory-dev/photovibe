import { describe, expect, it } from "vitest";
import type { PixelBuffer } from "./adjustments";
import { brightnessContrast, exposure, grayscale, hueSaturation, invert, levels, sepia } from "./adjustments";
import { gaussianBlur, noise, sharpen, vignette } from "./effects";

function image(pixels: Array<[number, number, number, number]>, width = pixels.length): PixelBuffer {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return { data, width, height: pixels.length / width };
}

const rgba = (img: PixelBuffer, index = 0) => [
  img.data[index * 4],
  img.data[index * 4 + 1],
  img.data[index * 4 + 2],
  img.data[index * 4 + 3],
];

describe("adjustments", () => {
  it("inverts each channel and leaves alpha alone", () => {
    const img = image([[10, 200, 255, 128]]);
    invert()(img);
    expect(rgba(img)).toEqual([245, 55, 0, 128]);
  });

  it("converts to grayscale with Rec. 709 luma", () => {
    const img = image([[255, 0, 0]].map((p) => [p[0], p[1], p[2], 255] as [number, number, number, number]));
    grayscale()(img);
    expect(rgba(img)).toEqual([54, 54, 54, 255]);
  });

  it("warms an image with sepia", () => {
    const img = image([[128, 128, 128, 255]]);
    sepia()(img);
    const [r, g, b] = rgba(img);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it("leaves the image untouched at neutral brightness and contrast", () => {
    const img = image([[10, 128, 240, 255]]);
    brightnessContrast(0, 0)(img);
    expect(rgba(img)).toEqual([10, 128, 240, 255]);
  });

  it("brightens and darkens", () => {
    const bright = image([[100, 100, 100, 255]]);
    brightnessContrast(20, 0)(bright);
    expect(rgba(bright)[0]).toBeGreaterThan(100);

    const dark = image([[100, 100, 100, 255]]);
    brightnessContrast(-20, 0)(dark);
    expect(rgba(dark)[0]).toBeLessThan(100);
  });

  it("pushes contrast away from mid grey", () => {
    const img = image([
      [60, 60, 60, 255],
      [200, 200, 200, 255],
    ]);
    brightnessContrast(0, 50)(img);
    expect(rgba(img, 0)[0]).toBeLessThan(60);
    expect(rgba(img, 1)[0]).toBeGreaterThan(200);
  });

  it("doubles the signal for one stop of exposure", () => {
    const img = image([[60, 60, 60, 255]]);
    exposure(1)(img);
    expect(rgba(img)[0]).toBe(120);
  });

  it("clamps rather than wrapping when exposure overflows", () => {
    const img = image([[200, 200, 200, 255]]);
    exposure(3)(img);
    expect(rgba(img)).toEqual([255, 255, 255, 255]);
  });

  it("rotates hue", () => {
    const img = image([[255, 0, 0, 255]]);
    hueSaturation(120, 0, 0)(img);
    const [r, g, b] = rgba(img);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("desaturates fully at -100", () => {
    const img = image([[255, 0, 0, 255]]);
    hueSaturation(0, -100, 0)(img);
    const [r, g, b] = rgba(img);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("maps the level range onto the full output range", () => {
    const img = image([
      [50, 50, 50, 255],
      [200, 200, 200, 255],
    ]);
    levels(50, 200, 1)(img);
    expect(rgba(img, 0)[0]).toBe(0);
    expect(rgba(img, 1)[0]).toBe(255);
  });

  it("lightens midtones with gamma above one", () => {
    const img = image([[128, 128, 128, 255]]);
    levels(0, 255, 2)(img);
    expect(rgba(img)[0]).toBeGreaterThan(128);
  });

  it("skips fully transparent pixels", () => {
    const img = image([[10, 20, 30, 0]]);
    invert()(img);
    expect(rgba(img)).toEqual([10, 20, 30, 0]);
  });
});

describe("effects", () => {
  it("averages a hard edge when blurred", () => {
    const img = image(
      [
        [0, 0, 0, 255],
        [255, 255, 255, 255],
        [0, 0, 0, 255],
      ],
      3,
    );
    gaussianBlur(1)(img);
    expect(rgba(img, 1)[0]).toBeLessThan(255);
    expect(rgba(img, 0)[0]).toBeGreaterThan(0);
  });

  it("is a no-op at radius zero", () => {
    const img = image([[10, 20, 30, 255]]);
    gaussianBlur(0)(img);
    expect(rgba(img)).toEqual([10, 20, 30, 255]);
  });

  it("increases edge contrast when sharpened", () => {
    const build = () =>
      image(
        [
          [0, 0, 0, 255],
          [128, 128, 128, 255],
          [255, 255, 255, 255],
        ],
        3,
      );
    const before = build();
    const after = build();
    sharpen(150, 1)(after);
    const spread = (img: PixelBuffer) => rgba(img, 2)[0] - rgba(img, 0)[0];
    expect(spread(after)).toBeGreaterThanOrEqual(spread(before));
  });

  it("is a no-op at zero amount", () => {
    for (const filter of [sharpen(0), vignette(0), noise(0)]) {
      const img = image([[10, 20, 30, 255]]);
      filter(img);
      expect(rgba(img)).toEqual([10, 20, 30, 255]);
    }
  });

  it("darkens the corners more than the centre", () => {
    const pixels: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 25; i += 1) pixels.push([200, 200, 200, 255]);
    const img = image(pixels, 5);
    vignette(80, 0)(img);
    const centre = rgba(img, 12)[0];
    const corner = rgba(img, 0)[0];
    expect(corner).toBeLessThan(centre);
  });

  it("produces the same noise for the same seed", () => {
    const a = image([[128, 128, 128, 255], [128, 128, 128, 255]], 2);
    const b = image([[128, 128, 128, 255], [128, 128, 128, 255]], 2);
    noise(50, 42)(a);
    noise(50, 42)(b);
    expect([...a.data]).toEqual([...b.data]);
  });
});

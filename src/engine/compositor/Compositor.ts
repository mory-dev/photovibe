import type { BlendMode, Document, RasterLayer, TextLayer, Transform2D } from "../document/types";
import { pixelStore, type TextureSource } from "../pixels/pixel-store";
import { BLEND_MODE_INDEX, COMPOSITE_FRAG, COMPOSITE_VERT, PRESENT_FRAG, PRESENT_VERT } from "./shaders";
import { createFramebuffer, createProgram, createTexture, uploadTexture } from "./gl-utils";

interface LayerTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
  generation: number;
}

export interface ViewportCamera {
  zoom: number;
  panX: number;
  panY: number;
}

export class Compositor {
  private gl: WebGL2RenderingContext;
  private compositeProgram: WebGLProgram;
  private presentProgram: WebGLProgram;
  private quad: WebGLBuffer;
  private layerTextures = new Map<string, LayerTexture>();
  private whiteTexture: WebGLTexture;
  private fboA: { framebuffer: WebGLFramebuffer; texture: WebGLTexture } | null = null;
  private fboB: { framebuffer: WebGLFramebuffer; texture: WebGLTexture } | null = null;
  private docWidth = 0;
  private docHeight = 0;
  private compositeLoc: Record<string, WebGLUniformLocation | null>;
  private presentLoc: Record<string, WebGLUniformLocation | null>;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 is required");
    this.gl = gl;

    this.compositeProgram = createProgram(gl, COMPOSITE_VERT, COMPOSITE_FRAG);
    this.presentProgram = createProgram(gl, PRESENT_VERT, PRESENT_FRAG);
    this.quad = this.createQuad();
    this.whiteTexture = createTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

    this.compositeLoc = this.cacheUniforms(this.compositeProgram, [
      "u_resolution",
      "u_rect",
      "u_srcRect",
      "u_dst",
      "u_src",
      "u_mask",
      "u_opacity",
      "u_blendMode",
      "u_hasMask",
      "u_srcSize",
    ]);
    this.presentLoc = this.cacheUniforms(this.presentProgram, [
      "u_image",
      "u_resolution",
      "u_docRect",
      "u_checkerSize",
      "u_pixelated",
    ]);
  }

  render(document: Document, camera: ViewportCamera, viewWidth: number, viewHeight: number): void {
    this.ensureFramebuffers(document.width, document.height);
    this.composite(document);
    this.present(document, camera, viewWidth, viewHeight);
  }

  readPixels(x: number, y: number): { r: number; g: number; b: number; a: number } {
    const gl = this.gl;
    if (!this.fboA) return { r: 0, g: 0, b: 0, a: 0 };
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.framebuffer);
    const pixel = new Uint8Array(4);
    const sampleY = this.docHeight - 1 - Math.round(y);
    gl.readPixels(Math.round(x), sampleY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255 };
  }

  dispose(): void {
    const gl = this.gl;
    for (const entry of this.layerTextures.values()) gl.deleteTexture(entry.texture);
    this.layerTextures.clear();
    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.framebuffer);
      gl.deleteTexture(this.fboA.texture);
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.framebuffer);
      gl.deleteTexture(this.fboB.texture);
    }
    gl.deleteTexture(this.whiteTexture);
    gl.deleteBuffer(this.quad);
    gl.deleteProgram(this.compositeProgram);
    gl.deleteProgram(this.presentProgram);
  }

  private composite(document: Document): void {
    const gl = this.gl;
    if (!this.fboA || !this.fboB) return;

    this.clearFramebuffer(this.fboA);
    let srcFbo = this.fboA;
    let dstFbo = this.fboB;

    for (const layer of document.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      if (layer.kind === "adjustment") continue;

      const source = this.sourceForLayer(layer);
      if (!source) continue;

      const texture = this.ensureLayerTexture(layer.id, source);
      const { x, y, width, height } = layerRect(layer, texture.width, texture.height);

      gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo.framebuffer);
      gl.viewport(0, 0, document.width, document.height);
      gl.useProgram(this.compositeProgram);
      this.bindQuad(this.compositeProgram);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcFbo.texture);
      gl.uniform1i(this.compositeLoc.u_dst, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform1i(this.compositeLoc.u_src, 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
      gl.uniform1i(this.compositeLoc.u_mask, 2);

      gl.uniform2f(this.compositeLoc.u_resolution, document.width, document.height);
      gl.uniform4f(this.compositeLoc.u_rect, 0, 0, document.width, document.height);
      gl.uniform4f(this.compositeLoc.u_srcRect, x, y, width, height);
      gl.uniform2f(this.compositeLoc.u_srcSize, texture.width, texture.height);
      gl.uniform1f(this.compositeLoc.u_opacity, layer.opacity);
      gl.uniform1i(this.compositeLoc.u_blendMode, blendIndex(layer.blendMode));
      gl.uniform1i(this.compositeLoc.u_hasMask, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const swap = srcFbo;
      srcFbo = dstFbo;
      dstFbo = swap;
    }

    if (srcFbo !== this.fboA) {
      this.fboA = srcFbo;
      this.fboB = dstFbo;
    }
  }

  private present(
    document: Document,
    camera: ViewportCamera,
    viewWidth: number,
    viewHeight: number,
  ): void {
    const gl = this.gl;
    if (!this.fboA) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, viewWidth, viewHeight);
    gl.useProgram(this.presentProgram);
    this.bindQuad(this.presentProgram);

    const docW = document.width * camera.zoom;
    const docH = document.height * camera.zoom;
    const x = viewWidth / 2 + camera.panX - docW / 2;
    const y = viewHeight / 2 + camera.panY - docH / 2;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, camera.zoom >= 1 ? gl.NEAREST : gl.LINEAR);
    gl.uniform1i(this.presentLoc.u_image, 0);
    gl.uniform2f(this.presentLoc.u_resolution, viewWidth, viewHeight);
    gl.uniform4f(this.presentLoc.u_docRect, x, y, docW, docH);
    gl.uniform2f(this.presentLoc.u_checkerSize, 8 * Math.max(camera.zoom, 0.5), 8 * Math.max(camera.zoom, 0.5));
    gl.uniform1i(this.presentLoc.u_pixelated, camera.zoom >= 1 ? 1 : 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private sourceForLayer(layer: RasterLayer | TextLayer): TextureSource | undefined {
    if (layer.kind === "raster" && layer.pixelData) {
      return pixelStore.get(layer.id) ?? layer.pixelData;
    }
    return pixelStore.get(layer.id);
  }

  private ensureLayerTexture(layerId: string, source: TextureSource): LayerTexture {
    const generation = pixelStore.getLayerGeneration(layerId);
    const existing = this.layerTextures.get(layerId);
    const width = source.width;
    const height = source.height;
    if (existing && existing.generation === generation && existing.width === width && existing.height === height) {
      return existing;
    }

    const gl = this.gl;
    const texture = existing?.texture ?? createTexture(gl);
    uploadTexture(gl, texture, source as TexImageSource);
    const entry = { texture, width, height, generation };
    this.layerTextures.set(layerId, entry);
    return entry;
  }

  private ensureFramebuffers(width: number, height: number): void {
    if (this.docWidth === width && this.docHeight === height && this.fboA && this.fboB) return;
    const gl = this.gl;
    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.framebuffer);
      gl.deleteTexture(this.fboA.texture);
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.framebuffer);
      gl.deleteTexture(this.fboB.texture);
    }
    this.fboA = createFramebuffer(gl, width, height);
    this.fboB = createFramebuffer(gl, width, height);
    this.docWidth = width;
    this.docHeight = height;
  }

  private clearFramebuffer(target: { framebuffer: WebGLFramebuffer }): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, this.docWidth, this.docHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private createQuad(): WebGLBuffer {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Failed to create quad buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    return buffer;
  }

  private bindQuad(program: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const pos = gl.getAttribLocation(program, "a_pos");
    const uv = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
  }

  private cacheUniforms(program: WebGLProgram, names: string[]): Record<string, WebGLUniformLocation | null> {
    const gl = this.gl;
    const out: Record<string, WebGLUniformLocation | null> = {};
    for (const name of names) out[name] = gl.getUniformLocation(program, name);
    return out;
  }
}

function blendIndex(mode: BlendMode): number {
  return BLEND_MODE_INDEX[mode];
}

function layerRect(
  layer: RasterLayer | TextLayer,
  texW: number,
  texH: number,
): { x: number; y: number; width: number; height: number } {
  const t: Transform2D = layer.transform;
  return {
    x: t.x,
    y: t.y,
    width: texW * t.scaleX,
    height: texH * t.scaleY,
  };
}

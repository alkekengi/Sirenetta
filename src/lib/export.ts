import { resolveSvgSize, withExplicitSize } from "@/lib/svgSize";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Detached-anchor clicks are ignored by Safari/Firefox.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can abort the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}

export async function svgToPngBlob(
  svg: string,
  scale = 2,
  background: string | null = "#ffffff",
): Promise<Blob> {
  const { width, height } = resolveSvgSize(svg);
  const blob = new Blob([withExplicitSize(svg, width, height)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("SVG load failed"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png"),
    );
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(
  svg: string,
  filename: string,
  scale = 2,
  background: string | null = "#ffffff",
) {
  downloadBlob(await svgToPngBlob(svg, scale, background), filename);
}

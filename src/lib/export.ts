export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}

export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("SVG load failed"));
      image.src = url;
    });
    const width = img.width || 800;
    const height = img.height || 600;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png"),
    );
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(svg: string, filename: string, scale = 2) {
  downloadBlob(await svgToPngBlob(svg, scale), filename);
}

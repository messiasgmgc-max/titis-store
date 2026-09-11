// Utilitários de imagem no navegador: reduzir fotos antes de enviar/armazenar.

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler esta imagem.'));
    img.src = src;
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function drawScaled(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/** Converte um arquivo de imagem em data URL JPEG redimensionado (padrão 1024px). */
export async function fileToDataUrl(file: File, maxSize = 1024, quality = 0.86): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem (JPG, PNG ou WEBP).');
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  return drawScaled(img, maxSize).toDataURL('image/jpeg', quality);
}

/** Converte um arquivo de imagem em Blob JPEG redimensionado (para upload no Storage). */
export async function fileToBlob(file: File, maxSize = 1600, quality = 0.88): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem (JPG, PNG ou WEBP).');
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const canvas = drawScaled(img, maxSize);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir a imagem.'))), 'image/jpeg', quality);
  });
}

/** Tamanho aproximado em bytes de um data URL base64. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}

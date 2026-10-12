interface PrepareMessage {
  id: number;
  type: 'prepare';
  fileData: ArrayBuffer;
  maxWidth: number;
  quality: number;
  thumbnailSize: number;
  thumbnailQuality: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality,
    );
  });
}

function loadImage(fileData: ArrayBuffer): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([fileData]));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    image.src = url;
  });
}

async function compressFromImage(image: HTMLImageElement, maxWidth: number, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  let width = image.width;
  let height = image.height;
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
  return canvasToBlob(canvas, 'image/jpeg', quality);
}

function thumbnailFromImage(image: HTMLImageElement, size: number, quality: number): string {
  const canvas = document.createElement('canvas');
  const ratio = Math.max(size / image.width, size / image.height);
  canvas.width = image.width * ratio;
  canvas.height = image.height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

self.onmessage = async (event: MessageEvent<PrepareMessage>) => {
  const { id, fileData, maxWidth, quality, thumbnailSize, thumbnailQuality } = event.data;
  try {
    const image = await loadImage(fileData);
    const compressed = await compressFromImage(image, maxWidth, quality);
    const thumbnail = thumbnailFromImage(image, thumbnailSize, thumbnailQuality);
    self.postMessage({ id, type: 'prepare', compressed, thumbnail });
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

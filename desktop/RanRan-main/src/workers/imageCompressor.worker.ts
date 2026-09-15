interface CompressMessage {
  type: 'compress';
  fileData: ArrayBuffer;
  fileName: string;
  maxWidth: number;
  quality: number;
}

interface ThumbnailMessage {
  type: 'thumbnail';
  fileData: ArrayBuffer;
  fileName: string;
  size: number;
  quality: number;
}

type WorkerMessage = CompressMessage | ThumbnailMessage;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality
    );
  });
}

function compressImageInWorker(
  fileData: ArrayBuffer,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([fileData]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = async () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const result = await canvasToBlob(canvas, 'image/jpeg', quality);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

function createThumbnailInWorker(
  fileData: ArrayBuffer,
  size: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([fileData]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ratio = Math.max(size / img.width, size / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const { type, fileData } = e.data;
    
    if (type === 'compress') {
      const { maxWidth, quality } = e.data;
      const compressedBlob = await compressImageInWorker(fileData, maxWidth, quality);
      // 通过 postMessage 传输 Blob（structured clone，零拷贝）
      self.postMessage({ type: 'compress', result: compressedBlob });
    } else if (type === 'thumbnail') {
      const { size, quality } = e.data;
      const thumbnailBase64 = await createThumbnailInWorker(fileData, size, quality);
      self.postMessage({ type: 'thumbnail', result: thumbnailBase64 });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

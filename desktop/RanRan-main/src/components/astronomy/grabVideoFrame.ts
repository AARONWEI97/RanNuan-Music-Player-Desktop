const FRAME_W = 640;
const FRAME_H = 360;

let scratch: HTMLCanvasElement | null = null;

function getScratch() {
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = FRAME_W;
    scratch.height = FRAME_H;
  }
  return scratch;
}

function isMostlyBlack(ctx: CanvasRenderingContext2D) {
  const sample = 24;
  const data = ctx.getImageData(0, 0, sample, sample).data;
  let sum = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i] + data[i + 1] + data[i + 2];
  }
  return sum / pixels < 18;
}

export async function grabVideoFrame(video: HTMLVideoElement): Promise<ImageBitmap | null> {
  if (video.readyState < 2 || video.videoWidth < 2) return null;
  const canvas = getScratch();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, FRAME_W, FRAME_H);
  if (isMostlyBlack(ctx)) return null;
  try {
    return await createImageBitmap(canvas);
  } catch {
    return null;
  }
}

export const HOLO_FRAME_SIZE = { width: FRAME_W, height: FRAME_H };
export const HOLO_FRAME_LIMIT = 18;

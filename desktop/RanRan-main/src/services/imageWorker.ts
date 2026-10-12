interface CompressResult {
  compressed: Blob;
  thumbnail: string;
}

interface WorkerResponse {
  id: number;
  type: 'prepare' | 'error';
  compressed?: Blob;
  thumbnail?: string;
  error?: string;
}

const POOL_SIZE = 3;
const workers: Worker[] = [];
let roundRobin = 0;
let nextJobId = 1;
const pending = new Map<number, {
  worker: Worker;
  resolve: (result: CompressResult) => void;
  reject: (error: Error) => void;
}>();

function attach(worker: Worker) {
  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const job = pending.get(event.data.id);
    if (!job) return;
    pending.delete(event.data.id);
    if (event.data.type === 'error' || !event.data.compressed || !event.data.thumbnail) {
      job.reject(new Error(event.data.error || '图片压缩失败'));
      return;
    }
    job.resolve({ compressed: event.data.compressed, thumbnail: event.data.thumbnail });
  });
  worker.addEventListener('error', () => {
    [...pending.entries()].forEach(([id, job]) => {
      if (job.worker !== worker) return;
      pending.delete(id);
      job.reject(new Error('图片压缩线程中断'));
    });
  });
}

function takeWorker(): Worker {
  if (workers.length < POOL_SIZE) {
    const worker = new Worker(
      new URL('../workers/imageCompressor.worker.ts', import.meta.url),
      { type: 'module' },
    );
    attach(worker);
    workers.push(worker);
  }
  const worker = workers[roundRobin % workers.length];
  roundRobin += 1;
  return worker;
}

export function compressImageInWorker(
  file: File,
  maxWidth: number = 1920,
  thumbnailSize: number = 600,
  compressQuality: number = 0.7,
  thumbnailQuality: number = 0.85,
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const id = nextJobId;
    nextJobId += 1;
    const worker = takeWorker();
    pending.set(id, { worker, resolve, reject });
    file.arrayBuffer().then((fileData) => {
      worker.postMessage(
        {
          id,
          type: 'prepare',
          fileData,
          maxWidth,
          quality: compressQuality,
          thumbnailSize,
          thumbnailQuality,
        },
        [fileData],
      );
    }).catch((error: unknown) => {
      pending.delete(id);
      reject(error instanceof Error ? error : new Error('无法读取图片'));
    });
  });
}

export function terminateWorker(): void {
  pending.forEach((job) => job.reject(new Error('图片压缩已取消')));
  pending.clear();
  workers.forEach((worker) => worker.terminate());
  workers.length = 0;
}

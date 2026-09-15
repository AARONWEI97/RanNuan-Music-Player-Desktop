export interface LrcLine {
  time: number;
  text: string;
}

export function parseLrc(lrcContent: string): LrcLine[] {
  const lines = lrcContent.split('\n');
  const result: LrcLine[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const times: number[] = [];
    let match: RegExpExecArray | null;
    
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      times.push(minutes * 60 + seconds + ms / 1000);
    }

    const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    
    if (times.length > 0 && text) {
      for (const time of times) {
        result.push({ time, text });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

export function findCurrentLine(lines: LrcLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  
  let low = 0;
  let high = lines.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].time <= currentTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return Math.max(0, high);
}

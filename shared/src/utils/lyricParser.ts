import type { ILyricText, IWordData, ApiLyric, MusicILyric } from '../types';

const LRC_TIME_REGEX = /\[(\d{1,2}):(\d{1,2})([.:]\d{1,3})?\]/g;
const YRC_WORD_REGEX = /<(\d+),(\d+)>/g;

function parseTimeToMs(min: string, sec: string, ms: string): number {
  const minutes = parseInt(min, 10);
  const seconds = parseInt(sec, 10);
  let milliseconds = 0;
  if (ms) {
    const raw = ms.slice(1);
    const padded = raw.length <= 2 ? raw.padEnd(3, '0') : raw;
    milliseconds = parseInt(padded, 10);
  }
  return minutes * 60 * 1000 + seconds * 1000 + milliseconds;
}

function parseStandardLrc(lrcString: string): { time: number; text: string }[] {
  const lines = lrcString.split('\n');
  const result: { time: number; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const times: number[] = [];
    let match: RegExpExecArray | null;
    LRC_TIME_REGEX.lastIndex = 0;

    while ((match = LRC_TIME_REGEX.exec(trimmed)) !== null) {
      times.push(parseTimeToMs(match[1], match[2], match[3] || ''));
    }

    if (times.length === 0) continue;

    const text = trimmed.replace(LRC_TIME_REGEX, '').trim();

    for (const time of times) {
      result.push({ time, text });
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

function parseYrcLine(line: string): { time: number; text: string; words: IWordData[] } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  LRC_TIME_REGEX.lastIndex = 0;
  const timeMatch = LRC_TIME_REGEX.exec(trimmed);
  if (!timeMatch) return null;

  const lineTime = parseTimeToMs(timeMatch[1], timeMatch[2], timeMatch[3] || '');
  const contentPart = trimmed.slice(timeMatch.index + timeMatch[0].length);

  const words: IWordData[] = [];
  let fullText = '';
  let lastIndex = 0;

  YRC_WORD_REGEX.lastIndex = 0;
  let wordMatch: RegExpExecArray | null;

  while ((wordMatch = YRC_WORD_REGEX.exec(contentPart)) !== null) {
    const beforeText = contentPart.slice(lastIndex, wordMatch.index);
    if (beforeText) {
      fullText += beforeText;
    }

    const wordStartTime = parseInt(wordMatch[1], 10);
    const wordDuration = parseInt(wordMatch[2], 10);

    const afterPart = contentPart.slice(YRC_WORD_REGEX.lastIndex);
    const nextWordMatch = afterPart.match(/<\d+,\d+>/);
    let wordText: string;

    if (nextWordMatch && nextWordMatch.index !== undefined) {
      wordText = afterPart.slice(0, nextWordMatch.index);
    } else {
      wordText = afterPart;
    }

    if (wordText) {
      words.push({
        text: wordText,
        startTime: wordStartTime,
        duration: wordDuration,
      });
      fullText += wordText;
    }

    lastIndex = YRC_WORD_REGEX.lastIndex + (wordText ? wordText.length : 0);
  }

  if (words.length === 0) {
    const text = contentPart.replace(YRC_WORD_REGEX, '').trim();
    if (!text) return null;
    return { time: lineTime, text, words: [] };
  }

  return { time: lineTime, text: fullText, words };
}

function parseYrcLrc(lrcString: string): { time: number; text: string; words: IWordData[] }[] {
  const lines = lrcString.split('\n');
  const result: { time: number; text: string; words: IWordData[] }[] = [];

  for (const line of lines) {
    const parsed = parseYrcLine(line);
    if (parsed) {
      result.push(parsed);
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

function parseTranslationLrc(lrcString: string): Map<number, string> {
  const parsed = parseStandardLrc(lrcString);
  const map = new Map<number, string>();
  for (const item of parsed) {
    map.set(item.time, item.text);
  }
  return map;
}

function matchTranslation(
  mainTime: number,
  translationMap: Map<number, string>,
  tolerance: number = 500
): string {
  if (translationMap.has(mainTime)) {
    return translationMap.get(mainTime) || '';
  }

  let closestTime = -1;
  let closestDiff = Infinity;

  for (const [time] of translationMap) {
    const diff = Math.abs(time - mainTime);
    if (diff < closestDiff && diff <= tolerance) {
      closestDiff = diff;
      closestTime = time;
    }
  }

  return closestTime >= 0 ? (translationMap.get(closestTime) || '') : '';
}

export function parseLyric(apiLyric: ApiLyric): MusicILyric | null {
  const lrcString = apiLyric?.lrc?.lyric;
  const klyricString = apiLyric?.klyric?.lyric;
  const tlyricString = apiLyric?.tlyric?.lyric;

  if (!lrcString && !klyricString) return null;

  const translationMap = tlyricString
    ? parseTranslationLrc(tlyricString)
    : new Map<number, string>();

  if (klyricString) {
    const yrcLines = parseYrcLrc(klyricString);
    if (yrcLines.length > 0) {
      const lrcTimeArray: number[] = [];
      const lrcArray: ILyricText[] = [];

      for (const line of yrcLines) {
        lrcTimeArray.push(line.time);
        lrcArray.push({
          text: line.text,
          trText: matchTranslation(line.time, translationMap),
          words: line.words.length > 0 ? line.words : undefined,
          hasWordByWord: line.words.length > 0,
          startTime: line.time,
          duration: 0,
        });
      }

      for (let i = 0; i < lrcArray.length; i++) {
        if (i < lrcArray.length - 1) {
          lrcArray[i].duration = lrcTimeArray[i + 1] - lrcTimeArray[i];
        }
      }

      return {
        lrcTimeArray,
        lrcArray,
        hasWordByWord: true,
      };
    }
  }

  if (lrcString) {
    const standardLines = parseStandardLrc(lrcString);
    if (standardLines.length === 0) return null;

    const lrcTimeArray: number[] = [];
    const lrcArray: ILyricText[] = [];

    for (const line of standardLines) {
      lrcTimeArray.push(line.time);
      lrcArray.push({
        text: line.text,
        trText: matchTranslation(line.time, translationMap),
        hasWordByWord: false,
        startTime: line.time,
        duration: 0,
      });
    }

    for (let i = 0; i < lrcArray.length; i++) {
      if (i < lrcArray.length - 1) {
        lrcArray[i].duration = lrcTimeArray[i + 1] - lrcTimeArray[i];
      }
    }

    return {
      lrcTimeArray,
      lrcArray,
      hasWordByWord: false,
    };
  }

  return null;
}

export function findCurrentLineIndex(
  lrcTimeArray: number[],
  currentTimeMs: number
): number {
  if (lrcTimeArray.length === 0) return -1;

  if (currentTimeMs < lrcTimeArray[0]) return -1;

  for (let i = lrcTimeArray.length - 1; i >= 0; i--) {
    if (currentTimeMs >= lrcTimeArray[i]) {
      return i;
    }
  }

  return -1;
}

export function getWordProgress(
  words: IWordData[],
  currentTimeMs: number
): { wordIndex: number; progress: number } {
  if (!words || words.length === 0) {
    return { wordIndex: -1, progress: 0 };
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordEnd = word.startTime + word.duration;
    if (currentTimeMs >= word.startTime && currentTimeMs < wordEnd) {
      const progress = (currentTimeMs - word.startTime) / word.duration;
      return { wordIndex: i, progress: Math.min(1, Math.max(0, progress)) };
    }
    if (currentTimeMs < word.startTime) {
      return { wordIndex: Math.max(0, i - 1), progress: i === 0 ? 0 : 1 };
    }
  }

  return { wordIndex: words.length - 1, progress: 1 };
}

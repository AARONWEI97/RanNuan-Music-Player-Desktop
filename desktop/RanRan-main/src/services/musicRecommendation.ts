import type { Photo } from '../types';

export interface MoodProfile {
  mood: string;
  energy: number;
  valence: number;
  description: string;
}

export interface MoodQuery {
  mood: string;
  description: string;
  keywords: string[];
  energy: number;
  valence: number;
}

const timeMoodMap: Record<string, MoodProfile> = {
  dawn: { mood: 'peaceful', energy: 0.3, valence: 0.7, description: '清晨宁静' },
  morning: { mood: 'energetic', energy: 0.6, valence: 0.8, description: '活力早晨' },
  afternoon: { mood: 'bright', energy: 0.7, valence: 0.8, description: '明媚午后' },
  evening: { mood: 'romantic', energy: 0.4, valence: 0.6, description: '浪漫黄昏' },
  night: { mood: 'melancholic', energy: 0.2, valence: 0.3, description: '忧郁夜晚' },
};

const seasonMoodMap: Record<string, MoodProfile> = {
  spring: { mood: 'hopeful', energy: 0.6, valence: 0.8, description: '希望之春' },
  summer: { mood: 'joyful', energy: 0.8, valence: 0.9, description: '欢乐夏日' },
  autumn: { mood: 'nostalgic', energy: 0.4, valence: 0.5, description: '怀旧秋日' },
  winter: { mood: 'contemplative', energy: 0.2, valence: 0.4, description: '沉思冬日' },
};

const tagMoodMap: Record<string, Partial<MoodProfile>> = {
  '旅行': { mood: 'adventurous', energy: 0.7, valence: 0.8 },
  '家庭': { mood: 'warm', energy: 0.5, valence: 0.9 },
  '朋友': { mood: 'cheerful', energy: 0.7, valence: 0.8 },
  '自然': { mood: 'peaceful', energy: 0.4, valence: 0.7 },
  '城市': { mood: 'dynamic', energy: 0.6, valence: 0.6 },
  '美食': { mood: 'joyful', energy: 0.5, valence: 0.8 },
  '宠物': { mood: 'playful', energy: 0.6, valence: 0.9 },
  '日落': { mood: 'romantic', energy: 0.3, valence: 0.6 },
  '海滩': { mood: 'relaxed', energy: 0.4, valence: 0.8 },
  '山脉': { mood: 'majestic', energy: 0.5, valence: 0.7 },
};

const moodKeywords: Record<string, string[]> = {
  peaceful: ['轻音乐', '钢琴', '安静'],
  contemplative: ['轻音乐', '民谣', '夜晚'],
  energetic: ['流行', '活力', '动感'],
  joyful: ['欢快', '流行', '快乐'],
  bright: ['清新', '流行', '阳光'],
  romantic: ['情歌', '浪漫', '民谣'],
  nostalgic: ['怀旧', '民谣', '青春'],
  melancholic: ['抒情', '夜晚', '伤感'],
  adventurous: ['旅行', '摇滚', '公路'],
  dynamic: ['电子', '节奏', '城市'],
  warm: ['温暖', '民谣', '治愈'],
  cheerful: ['快乐', '流行', '轻松'],
  hopeful: ['治愈', '清新', '春天'],
  playful: ['轻快', '可爱', '流行'],
  relaxed: ['放松', '海', '轻音乐'],
  majestic: ['史诗', '器乐', '壮阔'],
};

function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function getSeason(date: Date): string {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function analyzePhotoMood(photo: Photo): MoodProfile {
  const date = new Date(photo.createdAt);
  const timeOfDay = getTimeOfDay(date);
  const season = getSeason(date);

  const baseMood = { ...timeMoodMap[timeOfDay] };
  const seasonModifier = seasonMoodMap[season];

  let combinedMood: MoodProfile = {
    ...baseMood,
    energy: (baseMood.energy + seasonModifier.energy) / 2,
    valence: (baseMood.valence + seasonModifier.valence) / 2,
  };

  if (photo.tags && photo.tags.length > 0) {
    let tagEnergySum = 0;
    let tagValenceSum = 0;
    let tagCount = 0;

    for (const tag of photo.tags) {
      const tagMood = tagMoodMap[tag];
      if (tagMood) {
        tagEnergySum += tagMood.energy || 0.5;
        tagValenceSum += tagMood.valence || 0.5;
        tagCount++;
        if (tagMood.mood) combinedMood.mood = tagMood.mood;
      }
    }

    if (tagCount > 0) {
      combinedMood.energy = (combinedMood.energy + tagEnergySum / tagCount) / 2;
      combinedMood.valence = (combinedMood.valence + tagValenceSum / tagCount) / 2;
    }
  }

  return combinedMood;
}

export function getMoodQueryForPhotos(photos: Photo[], extraKeywords?: string): MoodQuery {
  const fallback: MoodQuery = {
    mood: 'bright',
    description: '随便听听',
    keywords: extraKeywords ? extraKeywords.split(/\s+/).filter(Boolean) : ['流行'],
    energy: 0.5,
    valence: 0.6,
  };

  if (photos.length === 0 && !extraKeywords) return fallback;

  if (photos.length === 0) return fallback;

  const moods = photos.map(analyzePhotoMood);
  const avgEnergy = moods.reduce((sum, m) => sum + m.energy, 0) / moods.length;
  const avgValence = moods.reduce((sum, m) => sum + m.valence, 0) / moods.length;
  const mood = moods[0].mood;
  const keywords = [...(moodKeywords[mood] || ['流行'])];

  if (extraKeywords) {
    extraKeywords.split(/\s+/).filter(Boolean).forEach((word) => {
      if (!keywords.includes(word)) keywords.unshift(word);
    });
  }

  const photoTags = photos.flatMap((photo) => photo.tags || []).slice(0, 3);
  photoTags.forEach((tag) => {
    if (!keywords.includes(tag)) keywords.push(tag);
  });

  return {
    mood,
    description: moods[0].description,
    keywords: keywords.slice(0, 5),
    energy: avgEnergy,
    valence: avgValence,
  };
}

export function getMoodDescription(mood: MoodProfile): string {
  const energyLevel = mood.energy > 0.6 ? '充满活力' : mood.energy > 0.4 ? '平静' : '沉静';
  const valenceLevel = mood.valence > 0.7 ? '快乐' : mood.valence > 0.5 ? '温馨' : '忧郁';
  return `${energyLevel}的${valenceLevel}时刻`;
}

export { analyzePhotoMood };

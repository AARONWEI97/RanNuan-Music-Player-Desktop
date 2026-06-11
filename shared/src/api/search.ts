import request from './request';

interface IParams {
  keywords: string;
  type: number;
  limit?: number;
  offset?: number;
}

export const getSearch = (params: IParams) => {
  return request.get<any>('/cloudsearch', {
    params
  });
};

interface NeteaseSuggestResult {
  result?: {
    songs?: Array<{ name: string }>;
    artists?: Array<{ name: string }>;
    albums?: Array<{ name: string }>;
  };
  code?: number;
}

export const getSearchSuggestions = async (keyword: string) => {
  if (!keyword || !keyword.trim()) {
    return Promise.resolve([]);
  }

  try {
    const res = await request.get<NeteaseSuggestResult>('/search/suggest', {
      params: { keywords: keyword }
    });

    const result = res?.data?.result || {};
    const names: string[] = [];
    if (Array.isArray(result.songs)) names.push(...result.songs.map((s: any) => s.name));
    if (Array.isArray(result.artists)) names.push(...result.artists.map((a: any) => a.name));
    if (Array.isArray(result.albums)) names.push(...result.albums.map((al: any) => al.name));

    const unique = Array.from(new Set(names)).slice(0, 10);
    return unique;
  } catch (error) {
    console.error('getSearchSuggestions error:', error);
    return [];
  }
};

import type { SongResult } from '@shared'

export interface MusicEntity {
  id?: number
  name: string
}

export function hasMusicId(id: unknown): boolean {
  return Number.isSafeInteger(Number(id)) && Number(id) > 0
}

export function getSongArtists(song?: Partial<SongResult> | null): MusicEntity[] {
  const artists = song?.ar?.length ? song.ar : song?.artists
  return Array.isArray(artists) ? artists.filter(artist => artist?.name) : []
}

export function getSongAlbum(song?: Partial<SongResult> | null) {
  return song?.al?.name ? song.al : song?.album
}

export function isOnlineSong(song: SongResult): boolean {
  return hasMusicId(song.id) && song.source !== 'dj'
}

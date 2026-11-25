import { Fragment } from 'react'
import type { SongResult } from '@shared'
import { useMusicNavigation } from '@/hooks/useMusicNavigation'
import { getSongAlbum, getSongArtists, type MusicEntity } from '@/utils/songMetadata'

interface LinkProps {
  className?: string
  onNavigate?: () => void
}

export function ArtistLinks({ artists, fallback = '未知歌手', className = '', onNavigate }: LinkProps & {
  artists?: MusicEntity[]
  fallback?: string
}) {
  const { goToArtist } = useMusicNavigation(onNavigate)
  if (!artists?.length) return <span className={className}>{fallback}</span>
  return <span className={className}>
    {artists.map((artist, index) => <Fragment key={`${artist.id}-${artist.name}-${index}`}>
      {index > 0 && <span> / </span>}
      <button type="button" className="hover:text-[#e60026] hover:underline focus-visible:underline transition-colors"
        title={`查看歌手：${artist.name}`}
        onDoubleClick={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); void goToArtist(artist) }}>
        {artist.name}
      </button>
    </Fragment>)}
  </span>
}

export function AlbumLink({ album, className = '', onNavigate }: LinkProps & { album?: MusicEntity | null }) {
  const { goToAlbum } = useMusicNavigation(onNavigate)
  if (!album?.name) return null
  return <button type="button" className={`hover:text-[#e60026] hover:underline focus-visible:underline transition-colors ${className}`}
    title={`查看专辑：${album.name}`}
    onDoubleClick={event => event.stopPropagation()}
    onClick={event => { event.stopPropagation(); void goToAlbum(album) }}>
    {album.name}
  </button>
}

export function SongMetadata({ song, showAlbum = true, onNavigate, className = '' }: LinkProps & {
  song?: Partial<SongResult> | null
  showAlbum?: boolean
}) {
  const album = getSongAlbum(song)
  return <span className={className}>
    <ArtistLinks artists={getSongArtists(song)} onNavigate={onNavigate} />
    {showAlbum && album?.name && <> · <AlbumLink album={album} onNavigate={onNavigate} /></>}
  </span>
}

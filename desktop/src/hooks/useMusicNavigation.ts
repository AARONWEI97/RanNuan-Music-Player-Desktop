import { useNavigateToMusicPage } from '@/hooks/useNavigateToMusicPage'
import { getSearch } from '@shared'
import { hasMusicId, type MusicEntity } from '@/utils/songMetadata'
import { showToast } from '@/utils/toast'

let latestIntent = 0

/** 部分本地文件、旧缓存只有名称；精确匹配后再跳转，避免产生 /artist/0。 */
export function useMusicNavigation(beforeNavigate?: () => void) {
  const navigate = useNavigateToMusicPage()

  const openEntity = async (kind: 'artist' | 'album', entity: MusicEntity, onNavigate = beforeNavigate) => {
    const intent = ++latestIntent
    const sourceKey = window.history.state?.key
    const stillCurrent = () => intent === latestIntent && window.history.state?.key === sourceKey
    try {
      let id = entity.id
      if (!hasMusicId(id)) {
        const response = await getSearch({ keywords: entity.name, type: kind === 'artist' ? 100 : 10, limit: 30 })
        if (!stillCurrent()) return false
        const result = response?.data?.result
        const candidates: MusicEntity[] = (kind === 'artist' ? result?.artists : result?.albums) || []
        const matches = candidates.filter(item => item.name === entity.name && hasMusicId(item.id))
        if (matches.length !== 1) {
          showToast(`无法确定对应${kind === 'artist' ? '歌手' : '专辑'}`, '请在搜索页进一步查找')
          return false
        }
        id = matches[0].id
      }
      const path = `/${kind}/${id}`
      if (window.location.pathname === path) return false
      onNavigate?.()
      navigate(path)
      return true
    } catch (error) {
      if (!stillCurrent()) return false
      showToast('跳转失败', error instanceof Error ? error.message : '请稍后重试')
      return false
    }
  }

  return {
    goToArtist: (artist: MusicEntity, onNavigate?: () => void) => openEntity('artist', artist, onNavigate),
    goToAlbum: (album: MusicEntity, onNavigate?: () => void) => openEntity('album', album, onNavigate),
  }
}

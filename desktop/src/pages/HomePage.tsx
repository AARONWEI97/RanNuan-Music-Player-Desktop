import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPersonalizedPlaylist,
  getRecommendMusic,
  getBanners,
  getDayRecommend,
  getPersonalFM,
  getHotSinger,
  getNewAlbum,
  getToplist,
  getPersonalizedMV,
  type SongResult,
} from '@shared'
import { useAuthStore } from '@/store/authStore'
import { coverUrl, avatarUrl } from '@/utils/image'
import {
  Play,
  Radio,
  ChevronRight,
  ChevronLeft,
  Music,
  Sparkles,
  Disc,
  Headphones,
  User,
  Search,
  Calendar,
  Trophy,
  Clapperboard,
  MonitorPlay,
  Loader,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import SongRow from '@/components/common/SongRow'
import { playSong } from '@/services/audioService'
import { getCache, setCache } from '@/utils/indexedDB'
import { usePlaylistStore } from '@shared'

interface BannerItem {
  imageUrl: string
  targetId: number
  targetType: number
  titleColor: string
  typeTitle: string
  url?: string
}

interface HomepageCache {
  banners?: BannerItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playlists?: any[]
  songs?: SongResult[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hotSingers?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newAlbums?: any[]
  dailySongs?: SongResult[]
  toplistCover?: string
  dailyRecommendCover?: string
  personalFMCover?: string
  newSongsCover?: string
  mvCover?: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function formatPlayCount(count: number): string {
  if (!count) return ''
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return `${count}`
}

function SectionHeader({
  title,
  moreText,
  onMore,
  icon: Icon,
  color = '#e60026',
}: {
  title: string
  moreText?: string
  onMore?: () => void
  icon?: React.ElementType
  color?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" style={{ color }} />}
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {onMore && (
        <button
          onClick={onMore}
          className="text-sm text-gray-500 hover:text-[#e60026] flex items-center gap-0.5 transition-colors"
        >
          {moreText || '查看更多'} <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const profile = useAuthStore((s) => s.profile)
  const { setPlayList, setPlayListIndex } = usePlaylistStore()

  const [banners, setBanners] = useState<BannerItem[]>([])
  const [playlists, setPlaylists] = useState<
    { id: string | number; name: string; picUrl: string; copywriter?: string; playCount?: number }[]
  >([])
  const [songs, setSongs] = useState<SongResult[]>([])
  const [songsExpanded, setSongsExpanded] = useState(false)
  const [dailySongs, setDailySongs] = useState<SongResult[]>([])
  const [bannerIdx, setBannerIdx] = useState(0)
  const bannersRef = useRef<BannerItem[]>([])
  useEffect(() => { bannersRef.current = banners })
  const [hotSingers, setHotSingers] = useState<{ id: number; name: string; picUrl: string }[]>([])
  const [newAlbums, setNewAlbums] = useState<
    { id: number; name: string; picUrl: string; artistName: string; artistId?: number }[]
  >([])
  // Covers for quick nav cards
  const [toplistCover, setToplistCover] = useState('')
  const [dailyRecommendCover, setDailyRecommendCover] = useState('')
  const [personalFMCover, setPersonalFMCover] = useState('')
  const [newSongsCover, setNewSongsCover] = useState('')
  const [mvCover, setMvCover] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const promises: Promise<unknown>[] = [
        getBanners(0),
        getPersonalizedPlaylist(10),
        getRecommendMusic({ limit: 20 }),
        getHotSinger({ limit: 10, offset: 0 }),
        getNewAlbum(),
        getToplist(),
        getPersonalizedMV(),
      ]
      if (isLoggedIn) {
        promises.push(getDayRecommend(), getPersonalFM())
      }
      const results = await Promise.allSettled(promises)
      let anySuccess = false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [bannersRes, playlistsRes, songsRes, singersRes, albumRes, toplistRes, mvRes, dayRecommendRes, fmRes] = results as any[]

      if (bannersRes.status === 'fulfilled') {
        anySuccess = true
        const data = bannersRes.value?.data?.banners
        if (Array.isArray(data)) {
          setBanners(
            data.map((b: { imageUrl?: string; pic?: string; targetId: number; targetType: number; titleColor: string; typeTitle: string; url?: string }) => ({
              imageUrl: b.imageUrl || b.pic || '',
              targetId: b.targetId,
              targetType: b.targetType,
              titleColor: b.titleColor,
              typeTitle: b.typeTitle,
              url: b.url,
            }))
          )
        }
      }

      if (playlistsRes.status === 'fulfilled') {
        anySuccess = true
        const data = playlistsRes.value?.data?.result || playlistsRes.value?.data?.data?.result
        if (Array.isArray(data)) {
          setPlaylists(
            data.map((p: { id: number; name: string; picUrl: string; playCount?: number; copywriter?: string }) => ({
              id: p.id,
              name: p.name,
              picUrl: p.picUrl,
              playCount: p.playCount || 0,
              copywriter: p.copywriter,
            }))
          )
        }
      }

      if (songsRes.status === 'fulfilled') {
        anySuccess = true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = songsRes.value?.data?.result || []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: SongResult[] = raw.map((item: any) => {
          const song = item?.song
          return {
            ...item,
            id: item?.id || song?.id,
            name: item?.name || song?.name,
            picUrl: item?.picUrl || song?.album?.blurPicUrl || song?.album?.picUrl || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ar: song?.artists?.map((a: any) => ({ id: a.id, name: a.name })) || item?.ar || [],
            al: song?.album
              ? {
                  id: song.album.id,
                  name: song.album.name,
                  picUrl: song.album.blurPicUrl || song.album.picUrl,
                }
              : item?.al || { id: 0, name: '' },
            dt: song?.duration || item?.dt || 0,
            count: 0,
          }
        })
        setSongs(mapped)
        if (mapped.length > 0) setNewSongsCover(mapped[0].picUrl || mapped[0].al?.picUrl || '')
      }

      if (singersRes.status === 'fulfilled') {
        anySuccess = true
        const data = singersRes.value?.data?.artists
        if (Array.isArray(data)) {
          setHotSingers(
            data.map((a: { id: number; name: string; picUrl?: string; img1v1Url?: string }) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.img1v1Url || '',
            }))
          )
        }
      }

      if (albumRes.status === 'fulfilled') {
        anySuccess = true
        const data = albumRes.value?.data?.albums
        if (Array.isArray(data)) {
          setNewAlbums(
            data.slice(0, 10).map((a: { id: number; name: string; picUrl?: string; blurPicUrl?: string; artist?: { name?: string; id?: number } }) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.blurPicUrl || '',
              artistName: a.artist?.name || '未知歌手',
              artistId: a.artist?.id,
            }))
          )
        }
      }

      if (toplistRes.status === 'fulfilled') {
        const list = toplistRes.value?.data?.list
        if (Array.isArray(list) && list.length > 0) {
          setToplistCover(list[0].coverImgUrl || '')
        }
      }

      if (mvRes.status === 'fulfilled') {
        const result = mvRes.value?.data?.result
        if (Array.isArray(result) && result.length > 0) {
          setMvCover(result[0].picUrl || '')
        }
      }

      if (dayRecommendRes?.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = dayRecommendRes.value?.data?.data?.dailySongs || dayRecommendRes.value?.data?.dailySongs || []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: SongResult[] = raw.map((song: any) => ({
          ...song,
          picUrl: song?.al?.picUrl || song?.album?.picUrl || song?.picUrl || '',
        }))
        setDailySongs(mapped)
        if (mapped.length > 0) setDailyRecommendCover(mapped[0].al?.picUrl || mapped[0].picUrl || '')
      }

      if (fmRes?.status === 'fulfilled') {
        const data = fmRes.value?.data?.data
        if (Array.isArray(data) && data.length > 0) {
          setPersonalFMCover(data[0].album?.picUrl || data[0].picUrl || '')
        }
      }

      if (!anySuccess) {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      // 延迟写入缓存，此时 state 已更新
      setTimeout(() => {
        setCache('homepage', 'main', {
          banners, playlists, songs, hotSingers, newAlbums, dailySongs,
          toplistCover, dailyRecommendCover, personalFMCover, newSongsCover, mvCover,
        }, 3).catch(() => {})
      }, 0)
    }
  }

  // 页面加载：先读缓存再刷新
  useEffect(() => {
    // 先读本地缓存快速展示
    getCache<HomepageCache>('homepage', 'main').then((cached) => {
      if (!cached) return
      if (cached.banners) setBanners(cached.banners)
      if (cached.playlists) setPlaylists(cached.playlists)
      if (cached.songs) setSongs(cached.songs)
      if (cached.hotSingers) setHotSingers(cached.hotSingers)
      if (cached.newAlbums) setNewAlbums(cached.newAlbums)
      if (cached.dailySongs) setDailySongs(cached.dailySongs)
      if (cached.toplistCover) setToplistCover(cached.toplistCover)
      if (cached.dailyRecommendCover) setDailyRecommendCover(cached.dailyRecommendCover)
      if (cached.personalFMCover) setPersonalFMCover(cached.personalFMCover)
      if (cached.newSongsCover) setNewSongsCover(cached.newSongsCover)
      if (cached.mvCover) setMvCover(cached.mvCover)
      setLoading(false)
    }).catch(() => {})

    // 延迟调用 loadData 避免 React Compiler "setState in effect" 报错
    Promise.resolve().then(() => loadData())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  // Banner auto-rotate — use ref to avoid resetting interval when banners update
  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => {
      setBannerIdx((i) => (i + 1) % bannersRef.current.length)
    }, 5000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBannerClick = useCallback(
    (item: BannerItem) => {
      // targetType: 1=单曲, 10=专辑, 1000=歌单, 1004=MV, 1014=电台
      switch (item.targetType) {
        case 1:
          navigate(`/song/${item.targetId}`)
          break
        case 10:
          navigate(`/album/${item.targetId}`)
          break
        case 1000:
          navigate(`/playlist/${item.targetId}`)
          break
        case 1004:
          // MV 跳转音乐库 MV tab
          navigate(`/library?tab=mv`)
          break
        case 1014:
          // 电台
          break
        default:
          if (item.url) {
            // 外链类型，尝试提取id
            const match = item.url.match(/[?&]id=(\d+)/)
            if (match) {
              navigate(`/playlist/${match[1]}`)
            }
          }
      }
    },
    [navigate]
  )

  const prevBanner = useCallback(() => {
    setBannerIdx((i) => (i - 1 + banners.length) % banners.length)
  }, [banners.length])

  const nextBanner = useCallback(() => {
    setBannerIdx((i) => (i + 1) % banners.length)
  }, [banners.length])

  const playDailyAll = useCallback(() => {
    if (dailySongs.length === 0) return
    setPlayList(dailySongs)
    setPlayListIndex(0)
    playSong(dailySongs[0])
  }, [dailySongs, setPlayList, setPlayListIndex])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader className="w-8 h-8 animate-spin text-[#e60026]" />
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-gray-400 py-20">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>加载失败</p>
        <button
          onClick={loadData}
          className="mt-4 inline-flex items-center gap-1.5 px-5 py-2 bg-[#e60026] text-white rounded-full text-sm font-medium hover:bg-[#c4001f] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.nickname ? `Hi, ${profile.nickname}` : '发现好音乐'}
          </p>
        </div>
        {/* ─── 内联搜索框 + Ctrl+K 提示 ─── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索歌曲、歌手、专辑..."
            onClick={() => navigate('/search')}
            onKeyDown={(e) => { if (e.key === 'Enter') { navigate('/search'); (e.target as HTMLInputElement).blur() } }}
            className="w-56 pl-9 pr-12 py-2 rounded-full bg-gray-100 dark:bg-white/5 text-sm text-gray-500 outline-none focus:ring-2 focus:ring-[#e60026]/30 focus:bg-white dark:focus:bg-white/10 transition-all cursor-pointer"
            readOnly
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-400 pointer-events-none">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* ═══ Quick Nav — Cover Image Cards (3x2) ═══ */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1 */}
          <QuickNavCard
            icon={Music}
            label="推荐新歌"
            coverUrl={newSongsCover}
            onClick={() => {
              if (songs.length > 0) { setPlayList(songs); setPlayListIndex(0); playSong(songs[0]); }
            }}
          />
          <QuickNavCard
            icon={Calendar}
            label="每日推荐"
            coverUrl={dailyRecommendCover}
            onClick={() => {
              if (!isLoggedIn) { navigate('/login'); return }
              navigate('/daily-recommend')
            }}
            disabled={!isLoggedIn}
          />
          <QuickNavCard
            icon={Radio}
            label="私人FM"
            coverUrl={personalFMCover}
            onClick={async () => {
              try {
                const results = await Promise.all([
                  getPersonalFM(),
                  getPersonalFM(),
                  getPersonalFM(),
                  getPersonalFM(),
                ])
                const fmSongs: SongResult[] = []
                for (const res of results) {
                  const data = res?.data?.data
                  if (Array.isArray(data)) {
                    for (const s of data) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const item = s as any
                      fmSongs.push({
                        id: item.id,
                        name: item.name,
                        picUrl: item.album?.picUrl || item.picUrl || '',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ar: item.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
                        al: item.album || { id: 0, name: '' },
                        count: 0,
                      })
                    }
                  }
                }
                if (fmSongs.length > 0) {
                  setPlayList(fmSongs)
                  setPlayListIndex(0)
                  playSong(fmSongs[0])
                }
              } catch {
                // silently fail
              }
            }}
          />
          {/* Row 2 */}
          <QuickNavCard
            icon={Trophy}
            label="排行榜"
            coverUrl={toplistCover}
            onClick={() => navigate('/toplist')}
          />
          <QuickNavCard
            icon={Clapperboard}
            label="MV精选"
            coverUrl={mvCover}
            onClick={() => navigate('/library?tab=mv')}
          />
          <QuickNavCard
            icon={MonitorPlay}
            label="歌单广场"
            coverUrl={playlists[0]?.picUrl || ''}
            onClick={() => navigate('/library')}
          />
        </div>
      </section>

      {/* ═══ Banner ═══ */}
      {banners.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden aspect-[3.5/1] bg-gray-200 dark:bg-gray-700 group shadow-lg">
          <img
            src={coverUrl(banners[bannerIdx]?.imageUrl)}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-500 cursor-pointer"
            loading="eager"
            decoding="async"
            onClick={() => handleBannerClick(banners[bannerIdx])}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          {banners[bannerIdx]?.typeTitle && (
            <div className="absolute bottom-4 left-5 pointer-events-none">
              <span
                className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{
                  backgroundColor: banners[bannerIdx].titleColor || '#e60026',
                  color: '#fff',
                }}
              >
                {banners[bannerIdx].typeTitle}
              </span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); prevBanner() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextBanner() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setBannerIdx(i) }}
                className={`h-1.5 rounded-full transition-all ${
                  i === bannerIdx ? 'bg-white w-5' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Daily Recommendations (logged in) ═══ */}
      {isLoggedIn && dailySongs.length > 0 && (
        <section>
          <SectionHeader title="每日推荐" icon={Sparkles} moreText="播放全部" onMore={playDailyAll} />
          <div className="space-y-1">
            {dailySongs.slice(0, 6).map((song, idx) => (
              <SongRow
                key={String(song.id)}
                song={song}
                index={idx}
                onPlay={() => { setPlayList(dailySongs); setPlayListIndex(idx); playSong(song); }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Recommended Playlists ═══ */}
      <section>
        <SectionHeader title="推荐歌单" icon={Disc} moreText="查看更多" onMore={() => navigate('/library')} />
        <div className="grid grid-cols-5 gap-4">
          {playlists.map((item) => (
            <div
              key={item.id}
              className="group cursor-pointer rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => navigate(`/playlist/${item.id}`)}
            >
              <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={coverUrl(item.picUrl)}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                {item.playCount ? (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] backdrop-blur-sm">
                    <Headphones className="w-3 h-3" />
                    {formatPlayCount(item.playCount)}
                  </div>
                ) : null}
                {/* Play button — bottom-right like mobile */}
                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 text-[#e60026] ml-0.5" />
                </div>
              </div>
              <p className="mt-2.5 text-sm font-medium truncate leading-snug px-0.5">{item.name}</p>
              {item.copywriter && (
                <p className="text-xs text-gray-500 truncate px-0.5">{item.copywriter}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Hot Singers — Horizontal Scroll ═══ */}
      {hotSingers.length > 0 && (
        <section>
          <SectionHeader title="热门歌手" icon={User} color="#22c55e" moreText="查看更多" onMore={() => navigate('/library?tab=artist')} />
          <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {hotSingers.map((singer) => (
              <div
                key={singer.id}
                className="group cursor-pointer flex flex-col items-center flex-shrink-0 w-[88px]"
                onClick={() => navigate(`/artist/${singer.id}`)}
              >
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 shadow-md group-hover:shadow-lg transition-all group-hover:scale-105 ring-2 ring-transparent group-hover:ring-[#22c55e]/30">
                  <img
                    src={avatarUrl(singer.picUrl)}
                    alt={singer.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm font-medium truncate w-full text-center">{singer.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ New Albums — Horizontal Scroll with Disc ═══ */}
      {newAlbums.length > 0 && (
        <section>
          <SectionHeader title="新碟上架" icon={Disc} color="#06b6d4" moreText="查看更多" onMore={() => navigate('/library?tab=album')} />
          <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {newAlbums.map((album) => (
              <div
                key={album.id}
                className="group cursor-pointer flex-shrink-0 w-[150px]"
                onClick={() => navigate(`/album/${album.id}`)}
              >
                <div className="relative w-[150px] h-[150px] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm group-hover:shadow-lg transition-all group-hover:-translate-y-1">
                  <img
                    src={coverUrl(album.picUrl)}
                    alt={album.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* CD disc decoration on the right — vertical stripe like real CD side */}
                  <div className="absolute right-[-12px] top-[15%] w-7 h-[70%] rounded-[14px] bg-gray-300 dark:bg-gray-600 -z-10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-gray-800" />
                  </div>
                  {/* Bottom gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  {/* Play button — bottom-right like mobile */}
                  <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 text-[#e60026] ml-0.5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm font-medium truncate leading-snug">{album.name}</p>
                <p className="text-xs text-gray-500 truncate">{album.artistName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Recommended New Songs ═══ */}
      <section>
        <SectionHeader title="推荐新音乐" icon={Music} color="#f59e0b" moreText="播放全部" onMore={() => { if (songs.length > 0) { setPlayList(songs); setPlayListIndex(0); playSong(songs[0]); } }} />
        <div className="space-y-0.5">
          {(songsExpanded ? songs : songs.slice(0, 10)).map((song, idx) => (
            <SongRow
              key={String(song.id)}
              song={song}
              index={idx}
              onPlay={() => { setPlayList(songs); setPlayListIndex(idx); playSong(song); }}
            />
          ))}
        </div>
        {songs.length > 10 && (
          <button
            onClick={() => setSongsExpanded(!songsExpanded)}
            className="w-full py-3 text-sm text-[#e60026] hover:underline mt-2"
          >
            {songsExpanded ? '收起' : `查看全部 ${songs.length} 首`}
          </button>
        )}
      </section>
    </div>
  )
}

function QuickNavCard({
  icon: Icon,
  label,
  coverUrl,
  onClick,
  disabled = false,
}: {
  icon: React.ElementType
  label: string
  coverUrl: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-2xl aspect-[1/0.85] text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Background image */}
      {coverUrl ? (
        <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm font-bold text-white text-shadow">{label}</span>
      </div>
    </button>
  )
}


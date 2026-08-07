import { useEffect, useState, useId } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { usePlayerStore, usePlaylistStore, getMusicLrc, getSimiSong, getMusicUrl, getNewComment, getSongWiki, getSongCreators, getSongDynamicCover, getSongChorus, getSongCopyrightRcmd, getSongRedCount, getFirstListenInfo, parseLyric as parseApiLyric } from '@shared'
import { Play, Pause, SkipBack, SkipForward, Heart, ArrowLeft, MessageCircle, Music, Disc3, Download, BookOpen } from 'lucide-react'
import { togglePlay, playSong, seekTo } from '@/services/audioService'
import { toggleFavorite, isFavorite } from '@/store/favoritesStore'
import SongRow from '@/components/common/SongRow'
import CommentSection from '@/components/common/CommentSection'
import { coverUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'
import type { SongResult, ILyricText } from '@shared'

function fmtMs(ms: number) {
  if (!ms || ms < 0) return '00:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

function formatCount(n?: number | null) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return ''
  const value = Number(n)
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return `${value}`
}

type ApiObject = Record<string, unknown>

function asApiObject(value: unknown): ApiObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as ApiObject
    : null
}

function getApiPath(value: unknown, path: readonly string[]): unknown {
  let current: unknown = value
  for (const key of path) {
    const object = asApiObject(current)
    if (!object) return undefined
    current = object[key]
  }
  return current
}

function firstApiValue(value: unknown, paths: readonly (readonly string[])[]): unknown {
  for (const path of paths) {
    const result = getApiPath(value, path)
    if (result !== null && result !== undefined) return result
  }
  return undefined
}

function firstApiString(value: unknown, paths: readonly (readonly string[])[]): string {
  const result = firstApiValue(value, paths)
  return typeof result === 'string' ? result : ''
}

function firstApiArray(value: unknown, paths: readonly (readonly string[])[]): unknown[] {
  if (Array.isArray(value)) return value
  const result = firstApiValue(value, paths)
  return Array.isArray(result) ? result : []
}

function resolveFirstListenText(info: unknown) {
  if (!info) return ''
  if (typeof info === 'string') return info
  const timestamp = firstApiValue(info, [['firstListenTime'], ['listenTime'], ['time']])
  if (typeof timestamp === 'number' && timestamp > 1000000000) {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }
  return pickText(info)
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function collectTexts(input: unknown, result: string[] = [], depth = 0) {
  if (!input) return result
  if (depth > 5) return result
  if (typeof input === 'string') {
    const text = normalizeText(input)
    if (
      text.length >= 12 &&
      !/^https?:\/\//i.test(text) &&
      !/^\/\//.test(text) &&
      !/^[\d.:-]+$/.test(text)
    ) {
      result.push(text)
    }
    return result
  }
  if (Array.isArray(input)) {
    input.forEach((item) => collectTexts(item, result, depth + 1))
    return result
  }
  const object = asApiObject(input)
  if (!object) return result
  Object.entries(object).forEach(([key, value]) => {
    if (/url|pic|cover|image|avatar|icon|id|time|count|code|type|status/i.test(key)) return
    collectTexts(value, result, depth + 1)
  })
  return result
}

function pickText(input: unknown) {
  if (!input) return ''
  if (typeof input === 'string') return normalizeText(input)
  if (typeof input !== 'object') return normalizeText(input)

  const priorityKeys = [
    'summary',
    'briefDesc',
    'desc',
    'description',
    'content',
    'text',
    'lyric',
    'lyricPart',
    'title',
    'name',
  ]

  for (const key of priorityKeys) {
    const value = getApiPath(input, [key])
    if (typeof value === 'string' && normalizeText(value).length >= 2) return normalizeText(value)
    if (Array.isArray(value)) {
      const text = collectTexts(value).sort((a, b) => b.length - a.length)[0]
      if (text) return text
    }
  }

  return collectTexts(input).sort((a, b) => b.length - a.length)[0] || ''
}

function pickUrl(input: unknown) {
  if (!input) return ''
  if (typeof input === 'string') return input
  return firstApiString(input, [['url'], ['coverUrl'], ['imageUrl'], ['picUrl'], ['src'], ['imgUrl']])
}

function pickCreatorNames(input: unknown) {
  const list = firstApiArray(input, [['creators'], ['data'], ['items'], ['songUserInfos']])
  return list
    .slice(0, 4)
    .map((item) => firstApiString(item, [
      ['name'], ['nickname'], ['userName'], ['artistName'], ['creatorName'], ['realName'], ['user', 'nickname'],
    ]))
    .filter(Boolean)
    .join(' / ')
}

function pickSongListText(input: unknown) {
  const list = firstApiArray(input, [['songs'], ['data'], ['items'], ['rcmdSongs'], ['songList']])
  return list
    .slice(0, 3)
    .map((item) => {
      const song = getApiPath(item, ['song']) ?? item
      const title = firstApiString(song, [['name'], ['songName'], ['title'], ['albumName']])
      if (title) return title
      return firstApiArray(song, [['artists']])
        .map((artist) => firstApiString(artist, [['name']]))
        .filter(Boolean)
        .join(' / ')
    })
    .filter(Boolean)
    .join(' · ')
}

type InfoItem = { label: string; value: string }

function uniqueTexts(list: string[]) {
  return Array.from(new Set(list.map(normalizeText).filter(Boolean)))
}

function getNodeTitle(node: unknown) {
  return normalizeText(firstApiString(node, [['uiElement', 'mainTitle', 'title'], ['mainTitle', 'title'], ['title']]))
}

function getTextLinkValues(node: unknown) {
  return firstApiArray(node, [['uiElement', 'textLinks'], ['textLinks']])
    .map((item) => firstApiString(item, [['text']]))
    .filter(Boolean)
}

function getButtonValues(node: unknown) {
  return firstApiArray(node, [['uiElement', 'buttons'], ['buttons']])
    .map((item) => firstApiString(item, [['text']]))
    .filter(Boolean)
}

function getResourceValues(resource: unknown): string[] {
  const images = firstApiArray(resource, [['uiElement', 'images']])
  return [
    getNodeTitle(resource),
    ...images.map((item) => firstApiString(item, [['title']])).filter(Boolean),
    ...getTextLinkValues(resource),
    ...getButtonValues(resource),
  ].filter(Boolean)
}

function getCreativeValue(creative: unknown) {
  const resources = firstApiArray(creative, [['resources']])
  return uniqueTexts([
    ...resources.flatMap(getResourceValues),
    ...getTextLinkValues(creative),
    ...getButtonValues(creative),
  ]).join(' / ')
}

function getWikiCreatives(wiki: unknown) {
  const blocks = firstApiArray(wiki, [['blocks']])
  const basic = blocks.find((block) => getApiPath(block, ['code']) === 'SONG_PLAY_ABOUT_SONG_BASIC')
  return firstApiArray(basic, [['creatives']])
}

function pickWikiFacts(wiki: unknown): InfoItem[] {
  const labels: Record<string, string> = {
    songTag: '曲风',
    songBizTag: '标签',
    language: '语种',
    bpm: 'BPM',
    entertainment: '影视',
    sheet: '乐谱',
  }
  return getWikiCreatives(wiki)
    .flatMap((creative) => {
      const creativeType = firstApiString(creative, [['creativeType']])
      const label = labels[creativeType]
      const value = getCreativeValue(creative)
      return label && value ? [{ label, value }] : []
    })
}

function pickWikiComment(wiki: unknown) {
  const comment = getWikiCreatives(wiki).find((creative) => getApiPath(creative, ['creativeType']) === 'songComment')
  const resources = firstApiArray(comment, [['resources']])
  const descriptions = resources.flatMap((resource) => {
    return firstApiArray(resource, [['uiElement', 'descriptions']])
      .map((item) => firstApiString(item, [['description'], ['title']]))
      .filter(Boolean)
  })
  return normalizeText(descriptions[0] || '')
}

function pickWikiImage(wiki: unknown) {
  const blocks = firstApiArray(wiki, [['blocks']])
  for (const block of blocks) {
    const images = firstApiArray(block, [['uiElement', 'images']])
    const url = images.map((item) => firstApiString(item, [['imageUrl']])).find(Boolean)
    if (url) return url
  }
  return ''
}

function formatChorus(input: unknown) {
  const start = firstApiValue(input, [['startTime'], ['start'], ['startMs'], ['chorusStartTime']])
  const end = firstApiValue(input, [['endTime'], ['end'], ['endMs'], ['chorusEndTime']])
  if (typeof start === 'number' && start > 0) {
    return typeof end === 'number' && end > start ? `${fmtMs(start)} - ${fmtMs(end)}` : fmtMs(start)
  }
  return pickText(input)
}

function pickCount(input: unknown) {
  if (typeof input === 'number') return input
  const value = firstApiValue(input, [['count'], ['redCount'], ['total'], ['value']])
  return typeof value === 'number' ? value : null
}

type DetailTab = 'lyrics' | 'comments' | 'similar'

type SongMeta = {
  wiki?: unknown
  creators?: unknown
  dynamicCover?: unknown
  chorus?: unknown
  copyrightRcmd?: unknown
  redCount?: unknown
  firstListen?: unknown
}

/* ─── 黑胶唱片 SVG 组件 ─── */
function VinylDisc({ size = 220 }: { size?: number }) {
  const uid = useId().replace(/:/g, '_')
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 自旋容器：SVG + Logo */}
      <div
        className="absolute inset-0"
        style={{
          animation: 'vinylSpin 6s linear infinite',
        }}
      >
        <svg width={size} height={size} viewBox="0 0 200 200" style={{ filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.5))' }}>
          <defs>
            <radialGradient id={`v-${uid}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor="#0a0a0a" />
              <stop offset="10%" stopColor="#050505" />
              <stop offset="16%" stopColor="#1e1e1e" />
              <stop offset="30%" stopColor="#050505" />
              <stop offset="50%" stopColor="#111" />
              <stop offset="72%" stopColor="#060606" />
              <stop offset="100%" stopColor="#161616" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="98" fill={`url(#v-${uid})`} />
          {/* 唱片纹理 */}
          {Array.from({ length: 14 }).map((_, i) => (
            <circle key={i} cx="100" cy="100" r={28 + i * 4.8} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.6" />
          ))}
          {/* 中心标签 */}
          <circle cx="100" cy="100" r="38" fill="#e60026" />
          <circle cx="100" cy="100" r="28" fill="#c10020" />
        </svg>
        {/* Logo 放中心随盘旋转 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/logo.png"
            className="w-14 h-14 rounded-full object-cover"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
            alt=""
          />
        </div>
      </div>
      {/* 唱臂（不旋转） */}
      <div
        className="absolute z-10"
        style={{
          top: '-15%', right: '-12%',
          width: '30%', height: '70%',
          background: 'linear-gradient(135deg, #333, #555, #333)',
          borderRadius: '2px 2px 0 0',
          transform: 'rotate(-25deg)',
          transformOrigin: 'bottom right',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />
    </div>
  )
}/* ═══════════════ MAIN ═══════════════ */

/* ═══════════════ MAIN ═══════════════ */
export default function SongDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeSongId } = useParams<{ id: string }>()
  const initialTab = new URLSearchParams(location.search).get('tab')
  const { playMusic, isPlay, currentProgress, duration, isLoading } = usePlayerStore()
  const { prevPlay, nextPlay, getCurrentSong } = usePlaylistStore()
  const [tab, setTab] = useState<DetailTab>(
    initialTab === 'comments' || initialTab === 'similar' ? initialTab : 'lyrics'
  )
  const [lyrics, setLyrics] = useState<ILyricText[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [similarSongs, setSimilarSongs] = useState<SongResult[]>([])
  const [songMeta, setSongMeta] = useState<SongMeta>({ creators: [], copyrightRcmd: [] })
  const [metaLoading, setMetaLoading] = useState(false)
  const [fav, setFav] = useState(false)
  const [hoverPct, setHoverPct] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)

  const songId = playMusic?.id
  const coverImg = playMusic?.picUrl || playMusic?.al?.picUrl || playMusic?.album?.picUrl

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get('tab')
    if (nextTab === 'lyrics' || nextTab === 'comments' || nextTab === 'similar') {
      setTab(nextTab)
    }
  }, [location.search])

  // 智能返回：有历史则返回，否则跳转到首页
  const handleBack = () => {
    // location.key === 'default' 表示直接访问该页面（无历史栈）
    if (location.key === 'default' || window.history.length <= 2) {
      navigate('/', { replace: true })
    } else {
      navigate(-1)
    }
  }

  useEffect(() => { if (songId) setFav(isFavorite(Number(songId))) }, [songId])
  useEffect(() => {
    if (!songId) return
    let cancelled = false
    setMetaLoading(true)
    getMusicLrc(Number(songId)).then(r => setLyrics(parseApiLyric(r.data)?.lrcArray || []))
    // 预取评论总数，Tab 标签立即显示数字
    getNewComment({ id: Number(songId), type: 0, pageNo: 1, pageSize: 1, sortType: 2 }).then((response) => {
      const total = firstApiValue(response?.data, [['data', 'totalCount'], ['totalCount'], ['total']])
      setCommentTotal(typeof total === 'number' ? total : 0)
    })
    getSimiSong(Number(songId)).then(r => {
      // ★ 相似歌曲 API 返回字段可能是 artists/album 而非 ar/al，需要归一化
      const raw: unknown[] = Array.isArray(r?.data?.songs) ? r.data.songs : []
      setSimilarSongs(raw.map((value) => {
        const song = asApiObject(value) || {}
        const artists = firstApiArray(song, [['ar'], ['artists']]).map((artist) => ({
          id: Number(firstApiValue(artist, [['id']])) || 0,
          name: firstApiString(artist, [['name']]),
        }))
        const albumValue = firstApiValue(song, [['al'], ['album']])
        const album = {
          id: Number(firstApiValue(albumValue, [['id']])) || 0,
          name: firstApiString(albumValue, [['name']]),
          picUrl: firstApiString(albumValue, [['picUrl'], ['pic_id']]),
        }
        return {
          ...song,
          ar: artists,
          al: album,
          picUrl: firstApiString(song, [['picUrl'], ['al', 'picUrl'], ['album', 'picUrl'], ['album', 'pic_id']]),
        } as unknown as SongResult
      }))
    })
    Promise.allSettled([
      getSongWiki(Number(songId)),
      getSongCreators(Number(songId)),
      getSongDynamicCover(Number(songId)),
      getSongChorus(Number(songId)),
      getSongCopyrightRcmd(Number(songId)),
      getSongRedCount(Number(songId)),
      getFirstListenInfo(Number(songId)),
    ]).then(([wiki, creators, dynamicCover, chorus, copyrightRcmd, redCount, firstListen]) => {
      if (cancelled) return
      setSongMeta({
        wiki: wiki.status === 'fulfilled' ? (wiki.value?.data?.data ?? wiki.value?.data ?? null) : null,
        creators: creators.status === 'fulfilled' ? (creators.value?.data?.data ?? creators.value?.data ?? []) : [],
        dynamicCover: dynamicCover.status === 'fulfilled' ? (dynamicCover.value?.data?.data ?? dynamicCover.value?.data ?? null) : null,
        chorus: chorus.status === 'fulfilled' ? (chorus.value?.data?.data ?? chorus.value?.data ?? null) : null,
        copyrightRcmd: copyrightRcmd.status === 'fulfilled' ? (copyrightRcmd.value?.data?.data ?? copyrightRcmd.value?.data ?? []) : [],
        redCount: redCount.status === 'fulfilled' ? (redCount.value?.data?.data ?? redCount.value?.data ?? null) : null,
        firstListen: firstListen.status === 'fulfilled' ? (firstListen.value?.data?.data ?? firstListen.value?.data ?? null) : null,
      })
      setMetaLoading(false)
    }).finally(() => {
      if (!cancelled) setMetaLoading(false)
    })
    return () => { cancelled = true }
  }, [songId])

  const progress = duration > 0 ? (currentProgress / duration) * 100 : 0
  const displayPct = hoverPct ?? progress

  const handlePrev = () => { prevPlay(); const s = getCurrentSong(); if (s) playSong(s) }
  const handleNext = () => { nextPlay(); const s = getCurrentSong(); if (s) playSong(s) }
  const handleFav = () => { if (!songId) return; setFav(toggleFavorite(playMusic!)) }
  const handleTabChange = (nextTab: DetailTab) => {
    setTab(nextTab)
    const search = nextTab === 'lyrics' ? '' : `?tab=${nextTab}`
    navigate({ pathname: location.pathname, search }, { replace: true })
  }

  useEffect(() => {
    if (!songId || String(songId) === routeSongId) return
    navigate(`/song/${songId}${location.search}`, { replace: true })
  }, [songId, routeSongId, location.search, navigate])
  const handleProgressClick = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration)
  }

  // 下载当前歌曲
  const handleDownload = async () => {
    if (!playMusic || downloading) return

    setDownloading(true)
    try {
      const { queueSongDownload } = await import('@/utils/download')
      await queueSongDownload(playMusic)
    } finally {
      setDownloading(false)
    }
  }

  // 播放相似歌曲（先取 URL）
  const handlePlaySimilar = async (s: SongResult) => {
    try {
      const res = await getMusicUrl(Number(s.id), false)
      const url = res?.data?.data?.[0]?.url
      if (url) {
        s.playMusicUrl = url
        playSong(s)
      } else {
        showToast('获取播放链接失败', '该歌曲可能无法播放')
      }
    } catch {
      showToast('获取播放链接失败')
    }
  }

  // 当前歌词行
  const currentLyricIdx = lyrics.findIndex((l, i) => {
    const next = lyrics[i + 1]
    const start = l.startTime || 0
    const nextStart = next?.startTime || 0
    return currentProgress >= start && (!next || currentProgress < nextStart)
  })

  const hasCover = !!coverImg
  const wikiFacts = pickWikiFacts(songMeta.wiki)
  const wikiText = pickWikiComment(songMeta.wiki)
  const chorusText = formatChorus(songMeta.chorus)
  const redCount = pickCount(songMeta.redCount)
  const firstListen = songMeta.firstListen
  const dynamicCoverUrl = pickUrl(songMeta.dynamicCover) || pickWikiImage(songMeta.wiki)
  const creatorText = pickCreatorNames(songMeta.creators)
  const firstListenText = resolveFirstListenText(firstListen)
  const copyrightText = pickSongListText(songMeta.copyrightRcmd)
  const extraFacts: InfoItem[] = [
    creatorText ? { label: '创作者', value: creatorText } : null,
    chorusText ? { label: '副歌', value: chorusText } : null,
    firstListenText ? { label: '首次听到', value: firstListenText } : null,
    copyrightText ? { label: '替代版本', value: copyrightText } : null,
  ].filter(Boolean) as InfoItem[]
  const songInfoItems = [...wikiFacts, ...extraFacts]
  const hasSongInfo = Boolean(wikiText || songInfoItems.length || dynamicCoverUrl)
  const infoVisualUrl = dynamicCoverUrl || coverImg

  return (
    <div
      className="-mx-6 -mt-6 relative flex flex-col select-none bg-white dark:bg-[#1a1a1a] overflow-hidden pb-1"
    >
      {/* ═══ 背景层 ═══ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
        {hasCover ? (
          <>
            <img src={coverUrl(coverImg)} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-35 dark:opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/90 to-white dark:from-neutral-900/60 dark:via-neutral-900/90 dark:to-[#1a1a1a]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#e60026]/8 via-white to-white dark:from-[#e60026]/3 dark:via-neutral-900 dark:to-[#1a1a1a]" />
        )}
      </div>

      {/* ═══ 主体内容 ═══ */}
      <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto w-full px-5">

        {/* ── 顶部栏：返回 + 操作 ── */}
        <div className="flex items-center justify-between w-full pt-3 mb-1">
          <button onClick={handleBack} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-white/40 hover:text-[#e60026] dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#e60026] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-wait"
            title={downloading ? '正在获取下载链接' : '下载'}
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        {/* ── 封面区 ── */}
        <div className="relative mt-1 mb-4" style={{ paddingRight: isPlay ? 150 : 0, transition: 'padding-right 0.7s ease-out' }}>
          {isPlay && <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-14 z-0"><VinylDisc size={220} /></div>}
          <div
            className={`relative z-[5] w-52 h-52 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl ring-[3px] ring-white/70 dark:ring-white/8 ${
              isPlay ? '-translate-x-20' : ''} transition-transform duration-700 ease-out`}
            style={{ boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)' }}>
            {hasCover ? (
              <img src={coverUrl(coverImg)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <Disc3 className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
        </div>

        {/* ── 歌名 + 艺术家 + 专辑标签 ── */}
        <div className="w-full text-center mb-0.5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2"
            style={{ textShadow: hasCover ? '0 1px 3px rgba(0,0,0,0.06)' : undefined }}>
            {playMusic?.name || '未播放'}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-white/35 mt-1">
            {playMusic?.ar?.map(a => a.name).join(' / ') || '—'}
          </p>
          {playMusic?.al?.name && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/30">
              {playMusic.al.name}
            </span>
          )}
        </div>

        {/* ── 加载/播放指示器 ── */}
        {isLoading && (
          <div className="flex items-center gap-0.5 mb-1.5">
            {[0.3, 0.5, 0.2, 0.7].map((h, i) => (
              <div key={i} className="w-0.5 bg-[#e60026] rounded-full animate-bounce"
                style={{ height: `${h * 20}px`, animationDelay: `${i * 0.08}s`, animationDuration: '0.5s' }} />
            ))}
          </div>
        )}

        {/* ── 进度条 ── */}
        <div className="w-full mb-2">
          <div className="relative h-5 group cursor-pointer flex items-center" onClick={handleProgressClick}
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHoverPct(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }}
            onMouseLeave={() => setHoverPct(null)}>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-white/[0.08] rounded-full group-hover:h-1.5 transition-all">
              <div className="h-full bg-[#e60026] rounded-full transition-all duration-150" style={{ width: `${displayPct}%` }} />
            </div>
            {hoverPct !== null && duration > 0 && (
              <div className="absolute -top-1 text-[9px] font-bold text-white bg-[#e60026] px-1.5 py-0.5 rounded shadow pointer-events-none"
                style={{ left: `${hoverPct}%`, transform: 'translateX(-50%)' }}>{fmtMs((hoverPct / 100) * duration)}</div>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{fmtMs(currentProgress)}</span>
            <span>{fmtMs(duration)}</span>
          </div>
        </div>

        {/* ── 播放控制 + 收藏 ── */}
        <div className="flex items-center justify-center gap-7 w-full mb-2">
          <button onClick={() => { const s = usePlaylistStore.getState(); s.setPlayMode(s.playMode === 2 ? 0 : 2) }}
            className="p-1 text-gray-400 hover:text-[#e60026] transition-colors" title="单曲循环">
            <span className="text-[10px] font-bold">·</span>
          </button>
          <button onClick={handlePrev} className="p-1 text-gray-500 dark:text-gray-300 hover:text-[#e60026] transition-colors">
            <SkipBack className="w-6 h-6" />
          </button>
          <button onClick={togglePlay}
            className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-[#e60026] text-white hover:bg-[#c4001f] shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-105 transition-all active:scale-95">
            {isPlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button onClick={handleNext} className="p-1 text-gray-500 dark:text-gray-300 hover:text-[#e60026] transition-colors">
            <SkipForward className="w-6 h-6" />
          </button>
          <button onClick={handleFav} className={`p-1 transition-all duration-200 ${fav ? 'text-[#e60026] scale-110' : 'text-gray-400 hover:text-[#e60026]'}`}>
            <Heart className={`w-5 h-5 ${fav ? 'fill-[#e60026]' : ''}`} />
          </button>
        </div>

        {/* ── Tab ── */}
        <div className="flex gap-2 w-full mb-1 overflow-x-auto scrollbar-none">
          {([
            { k: 'lyrics' as DetailTab, l: '歌词', i: Music },
            { k: 'comments' as DetailTab, l: `评论${commentTotal ? ` ${commentTotal}` : ''}`, i: MessageCircle },
            { k: 'similar' as DetailTab, l: `相似${similarSongs.length ? ` ${similarSongs.length}` : ''}`, i: Disc3 },
          ]).map(t => (
            <button key={t.k} onClick={() => handleTabChange(t.k)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                tab === t.k ? 'bg-[#e60026] text-white shadow-sm shadow-red-500/20' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}>
              <t.i className="w-3.5 h-3.5" />{t.l}
            </button>
          ))}
        </div>

        {/* ── Tab 内容 ── */}
        <div className="w-full min-h-[280px]">
          {hasSongInfo && (
            <section className="relative mb-4 overflow-hidden rounded-xl border border-black/[0.04] bg-[#fffaf7] shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] dark:border-white/[0.06] dark:bg-[#211f1d]">
              {infoVisualUrl && (
                <img
                  src={coverUrl(infoVisualUrl)}
                  alt=""
                  className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rotate-6 rounded-[28px] object-cover opacity-20 blur-[1px] dark:opacity-14"
                />
              )}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e60026]/45 to-transparent" />

              <div className="relative p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e60026]">
                      <BookOpen className="h-3.5 w-3.5" />
                      音乐百科
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {playMusic?.name || '当前歌曲'}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {redCount !== null && redCount !== undefined && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#e60026] shadow-sm ring-1 ring-[#e60026]/10 dark:bg-white/[0.06] dark:ring-[#e60026]/20">
                        <Heart className="h-3.5 w-3.5 fill-current drop-shadow-sm" />
                        {formatCount(redCount)}
                      </span>
                    )}
                  </div>
                </div>

                {songInfoItems.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {songInfoItems.map((item, index) => (
                      <span
                        key={`${item.label}-${item.value}`}
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-5 ring-1 ${
                          index % 4 === 0
                            ? 'bg-[#e60026]/9 text-[#9f001b] ring-[#e60026]/12 dark:bg-[#e60026]/14 dark:text-red-200 dark:ring-[#e60026]/20'
                            : index % 4 === 1
                              ? 'bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/15'
                              : index % 4 === 2
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/15'
                                : 'bg-sky-50 text-sky-700 ring-sky-200/60 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-300/15'
                        }`}
                        title={`${item.label}: ${item.value}`}
                      >
                        <span className="font-semibold">{item.label}</span>
                        <span className="max-w-[220px] truncate opacity-85">{item.value}</span>
                      </span>
                    ))}
                  </div>
                )}

                {metaLoading ? (
                  <div className="h-16 rounded-lg bg-white/55 px-3 py-3 dark:bg-white/[0.04]">
                    <div className="mb-2 h-2.5 w-28 rounded-full bg-gray-200/80 dark:bg-white/[0.08]" />
                    <div className="h-2.5 w-full rounded-full bg-gray-200/60 dark:bg-white/[0.06]" />
                  </div>
                ) : wikiText ? (
                  <div className="relative rounded-lg bg-white/70 px-3.5 py-3 text-sm leading-6 text-gray-700 shadow-sm ring-1 ring-black/[0.03] dark:bg-black/15 dark:text-gray-200 dark:ring-white/[0.05]">
                    <div className="absolute left-0 top-3 h-8 w-0.5 rounded-full bg-[#e60026]" />
                    <p className="line-clamp-4 whitespace-pre-wrap pl-2">{wikiText}</p>
                  </div>
                ) : (
                  infoVisualUrl && (
                    <div className="flex items-center gap-3 rounded-lg bg-white/55 p-2.5 ring-1 ring-black/[0.03] dark:bg-white/[0.04] dark:ring-white/[0.05]">
                      <img src={coverUrl(infoVisualUrl)} alt="" className="h-11 w-11 rounded-md object-cover" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 line-clamp-1">
                          {playMusic?.al?.name || 'Track Notes'}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1">
                          {playMusic?.ar?.map(a => a.name).join(' / ') || 'RanNuan Music'}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {tab === 'lyrics' && (
            lyrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Music className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium mb-1">暂无歌词</p>
                <p className="text-[10px] opacity-40">纯音乐，请您欣赏</p>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                {lyrics.map((l, i) => {
                  const isActive = i === currentLyricIdx
                  return (
                    <div key={i}
                      className={`cursor-pointer transition-all duration-300 px-3 rounded ${
                        isActive
                          ? 'text-[#e60026] font-bold text-lg scale-105 -translate-x-1'
                          : 'text-gray-400 dark:text-gray-500 text-sm opacity-65 hover:opacity-90'
                      }`}
                      onClick={() => seekTo(l.startTime || 0)}
                      style={{ transformOrigin: 'left center' }}>
                      <p>{l.text}</p>
                      {(l.trText || l.romaText) && (
                        <div className={`mt-1 space-y-0.5 ${isActive ? 'text-[13px] font-medium text-[#e60026]/75' : 'text-xs text-gray-400 dark:text-gray-600'}`}>
                          {l.trText && <p>{l.trText}</p>}
                          {l.romaText && <p className="italic">{l.romaText}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {tab === 'comments' && songId && (
            <CommentSection resourceId={Number(songId)} resourceType="song" onTotalChange={setCommentTotal} />
          )}

          {tab === 'similar' && (
            similarSongs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <Disc3 className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">加载中...</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {similarSongs.map((s, i) => (
                  <SongRow key={s.id} song={s} index={i} showPic onPlay={() => handlePlaySimilar(s)} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

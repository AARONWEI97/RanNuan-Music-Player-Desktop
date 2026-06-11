import { useEffect, useState, useId } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePlayerStore, usePlaylistStore, getMusicLrc, getSimiSong, getMusicUrl, getNewComment } from '@shared'
import { Play, Pause, SkipBack, SkipForward, Heart, ArrowLeft, MessageCircle, Music, Disc3, Download } from 'lucide-react'
import { togglePlay, playSong, seekTo } from '@/services/audioService'
import { toggleFavorite, isFavorite } from '@/store/favoritesStore'
import SongRow from '@/components/common/SongRow'
import CommentSection from '@/components/common/CommentSection'
import { coverUrl } from '@/utils/image'
import { showToast } from '@/utils/toast'
import type { SongResult } from '@shared'

interface LyricLine { time: number; text: string }

function parseLyric(lrc: string): LyricLine[] {
  const lines = lrc.split('\n')
  const result: LyricLine[] = []
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
  for (const line of lines) {
    const times: number[] = []
    let match: RegExpExecArray | null
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const ms = parseInt(match[3].padEnd(3, '0'))
      times.push(min * 60000 + sec * 1000 + ms)
    }
    const text = line.replace(/\[.*?\]/g, '').trim()
    if (text && times.length > 0) {
      for (const t of times) result.push({ time: t, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

function fmtMs(ms: number) {
  if (!ms || ms < 0) return '00:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

type DetailTab = 'lyrics' | 'comments' | 'similar'

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
  const { playMusic, isPlay, currentProgress, duration, isLoading } = usePlayerStore()
  const { prevPlay, nextPlay, getCurrentSong } = usePlaylistStore()
  const [tab, setTab] = useState<DetailTab>('lyrics')
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [similarSongs, setSimilarSongs] = useState<SongResult[]>([])
  const [fav, setFav] = useState(false)
  const [hoverPct, setHoverPct] = useState<number | null>(null)

  const songId = playMusic?.id
  const coverImg = playMusic?.picUrl || playMusic?.al?.picUrl || playMusic?.album?.picUrl

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
    getMusicLrc(Number(songId)).then(r => setLyrics(parseLyric(r?.data?.lrc?.lyric || r?.data?.klyric?.lyric || '')))
    // 预取评论总数，Tab 标签立即显示数字
    getNewComment({ id: Number(songId), type: 0, pageNo: 1, pageSize: 1, sortType: 2 }).then((r: any) => setCommentTotal(r?.data?.data?.totalCount || r?.data?.totalCount || r?.data?.total || 0))
    getSimiSong(Number(songId)).then(r => {
      // ★ 相似歌曲 API 返回字段可能是 artists/album 而非 ar/al，需要归一化
      const raw = r?.data?.songs || []
      setSimilarSongs(raw.map((s: any) => ({
        ...s,
        ar: s.ar || s.artists?.map((a: any) => ({ id: a.id, name: a.name })),
        al: s.al || (s.album ? { id: s.album.id, name: s.album.name, picUrl: s.album.picUrl || s.album.pic_id } : undefined),
        picUrl: s.picUrl || s.al?.picUrl || s.album?.picUrl || s.album?.pic_id || '',
      })))
    })
  }, [songId])

  const progress = duration > 0 ? (currentProgress / duration) * 100 : 0
  const displayPct = hoverPct ?? progress

  const handlePrev = () => { prevPlay(); const s = getCurrentSong(); if (s) playSong(s) }
  const handleNext = () => { nextPlay(); const s = getCurrentSong(); if (s) playSong(s) }
  const handleFav = () => { if (!songId) return; setFav(toggleFavorite(playMusic!)) }
  const handleProgressClick = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration)
  }

  // 下载当前歌曲
  const handleDownload = async () => {
    if (!playMusic) return
    const url = playMusic.playMusicUrl || playMusic.url
    if (url) {
      const { addDownload } = await import('@/utils/download')
      addDownload(Number(playMusic.id), playMusic.name, url, playMusic.ar?.map(a => a.name).join(' / '),
        { picUrl: playMusic.al?.picUrl, album: playMusic.al?.name })
      showToast('已加入下载队列', playMusic.name)
    } else {
      showToast('无法获取下载链接', '请先播放歌曲')
    }
  }

  // 播放相似歌曲（先取 URL）
  const handlePlaySimilar = async (s: SongResult) => {
    try {
      const res: any = await getMusicUrl(s.id as number, false)
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
    return currentProgress >= l.time && (!next || currentProgress < next.time)
  })

  const hasCover = !!coverImg

  return (
    <div className="-mx-6 -mt-6 -mb-24 relative flex flex-col select-none" style={{ minHeight: '100%' }}>
      {/* ═══ 背景层 ═══ */}
      {hasCover && (
        <>
          <img src={coverUrl(coverImg)} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-35 dark:opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/85 to-white dark:from-neutral-900/60 dark:via-neutral-900/88 dark:to-neutral-900" />
        </>
      )}
      {!hasCover && <div className="absolute inset-0 bg-gradient-to-br from-[#e60026]/8 via-white to-white dark:from-[#e60026]/3 dark:via-neutral-900 dark:to-neutral-900" />}

      {/* ═══ 主体内容 ═══ */}
      <div className="relative z-10 flex flex-col items-center h-full max-w-lg mx-auto w-full px-5">

        {/* ── 顶部栏：返回 + 操作 ── */}
        <div className="flex items-center justify-between w-full pt-3 mb-1">
          <button onClick={handleBack} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-white/40 hover:text-[#e60026] dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <button onClick={handleDownload} className="p-1.5 rounded-lg text-gray-400 hover:text-[#e60026] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all" title="下载">
            <Download className="w-4 h-4" />
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
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                tab === t.k ? 'bg-[#e60026] text-white shadow-sm shadow-red-500/20' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}>
              <t.i className="w-3.5 h-3.5" />{t.l}
            </button>
          ))}
        </div>

        {/* ── Tab 内容 ── */}
        <div className="w-full">
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
                    <p key={i}
                      className={`cursor-pointer transition-all duration-300 px-3 rounded ${
                        isActive
                          ? 'text-[#e60026] font-bold text-lg scale-105 -translate-x-1'
                          : 'text-gray-400 dark:text-gray-500 text-sm opacity-65 hover:opacity-90'
                      }`}
                      onClick={() => seekTo(l.time)}
                      style={{ transformOrigin: 'left center' }}>
                      {l.text}
                    </p>
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

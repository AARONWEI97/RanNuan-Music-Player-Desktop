import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSearch, getSearchSuggestions, getHotSearch, type SongResult, usePlaylistStore,
} from '@shared'
import { playSong } from '@/services/audioService'
import { coverUrl, avatarUrl } from '@/utils/image'
import SongRow from '@/components/common/SongRow'
import {
  Search, Play, Headphones, TrendingUp, Clock, X, Music, User, Disc, List,
} from 'lucide-react'

type SearchTab = 1 | 100 | 10 | 1000

interface ArtistResult { id: number; name: string; picUrl?: string; alias?: string[] }
interface AlbumResult { id: number; name: string; picUrl?: string; artist?: { name: string } }
interface PlaylistResult { id: number; name: string; coverImgUrl?: string; trackCount?: number; creator?: { nickname: string }; playCount?: number }

const searchTabs: { key: SearchTab; label: string; icon: typeof Music }[] = [
  { key: 1, label: '歌曲', icon: Music },
  { key: 100, label: '歌手', icon: User },
  { key: 10, label: '专辑', icon: Disc },
  { key: 1000, label: '歌单', icon: List },
]

const HISTORY_KEY = 'rannuan-search-history-v2'
const MAX_HISTORY = 20

interface HistoryItem { keyword: string; type: SearchTab }

function getHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function addHistory(kw: string, type: SearchTab) {
  const h = getHistory().filter((k) => k.keyword !== kw)
  h.unshift({ keyword: kw, type })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
}
function removeHistory(kw: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter((k) => k.keyword !== kw)))
}
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

function formatPlayCount(count: number): string {
  if (!count) return ''
  if (count >= 1e8) return `${(count / 1e8).toFixed(1)}亿`
  if (count >= 1e4) return `${(count / 1e4).toFixed(1)}万`
  return `${count}`
}

const ANIMATION_DELAY_STEP = 0.03

export default function SearchPage() {
  const navigate = useNavigate()
  const { setPlayList, setPlayListIndex } = usePlaylistStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>(1)
  const [songs, setSongs] = useState<SongResult[]>([])
  const [artists, setArtists] = useState<ArtistResult[]>([])
  const [albums, setAlbums] = useState<AlbumResult[]>([])
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestIndex, setSuggestIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hotKeywords, setHotKeywords] = useState<Array<{ searchWord: string; content?: string; iconUrl?: string; score?: number }>>([])
  const [history, setHistory] = useState<HistoryItem[]>(getHistory)

  // ─── Hot keywords on mount ───
  useEffect(() => {
    getHotSearch().then((res) => {
      const data = res?.data?.data
      if (Array.isArray(data)) setHotKeywords(data)
    }).catch(() => {})
  }, [])

  // ─── Click outside closes suggestions ───
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Debounced suggest ───
  const handleInput = useCallback((value: string) => {
    setKeyword(value)
    setSuggestIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try { setSuggestions(await getSearchSuggestions(value) || []) } catch { setSuggestions([]) }
    }, 300)
  }, [])

  // ─── Search ───
  const doSearch = useCallback(async (kw?: string, type?: SearchTab) => {
    const q = (kw || keyword).trim()
    if (!q) return
    const searchType = type || activeTab
    setSuggestions([])
    setLoading(true)
    setSearched(true)
    addHistory(q, searchType)
    setHistory(getHistory())
    try {
      const res = await getSearch({ keywords: q, type: searchType, limit: 30 })
      const result = res?.data?.result
      if (searchType === 1) setSongs(result?.songs || [])
      else if (searchType === 100) setArtists(result?.artists || [])
      else if (searchType === 10) setAlbums(result?.albums || [])
      else if (searchType === 1000) setPlaylists(result?.playlists || [])
    } finally { setLoading(false) }
  }, [keyword, activeTab])

  const handleTabChange = useCallback((tab: SearchTab) => {
    setActiveTab(tab)
    if (keyword.trim()) doSearch(keyword, tab)
  }, [keyword, doSearch])

  const handleSuggestClick = useCallback((s: string) => {
    setKeyword(s)
    setSuggestions([])
    doSearch(s, activeTab)
  }, [activeTab, doSearch])

  const handlePlayAll = useCallback(() => {
    if (songs.length === 0) return
    setPlayList(songs)
    setPlayListIndex(0)
    playSong(songs[0])
  }, [songs, setPlayList, setPlayListIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const sel = suggestIndex >= 0 && suggestions[suggestIndex] ? suggestions[suggestIndex] : keyword
      setSuggestions([])
      setSuggestIndex(-1)
      doSearch(sel, activeTab)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setSuggestIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setSuggestIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      if (searched) { clearSearch() }
      else setSuggestions([])
    }
  }

  const clearSearch = useCallback(() => {
    setKeyword('')
    setSearched(false)
    setSuggestions([])
    setSongs([])
    setArtists([])
    setAlbums([])
    setPlaylists([])
  }, [])

  const tabLabel = searchTabs.find((t) => t.key === activeTab)?.label || ''

  return (
    <div className="max-w-4xl mx-auto">
      {/* ═══ Search Header ═══ */}
      <div className="mb-6">
        <div className="relative" ref={searchContainerRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索歌曲、歌手、专辑、歌单..."
            className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[#e60026]/30 text-sm transition-shadow shadow-sm"
          />
          {keyword && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-300 dark:bg-white/10 flex items-center justify-center hover:bg-gray-400 dark:hover:bg-white/20 transition-colors"
              title="清除搜索"
            >
              <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* ─── Suggestions ─── */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#222] rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-2 z-10">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleSuggestClick(s)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    i === suggestIndex ? 'bg-gray-100 dark:bg-white/10 text-[#e60026]' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Tabs — pill style (Alger) ═══ */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {searchTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-[#e60026] text-white shadow-lg shadow-[#e60026]/25'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Loading Skeleton (Alger-style shimmer) ═══ */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg skeleton-shimmer">
              <div className="w-7 h-5 rounded bg-gray-200 dark:bg-white/[0.04]" />
              <div className="w-11 h-11 rounded bg-gray-200 dark:bg-white/[0.04]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/5 rounded bg-gray-200 dark:bg-white/[0.04]" />
                <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-white/[0.04]" />
              </div>
              <div className="h-3 w-12 rounded bg-gray-200 dark:bg-white/[0.04]" />
            </div>
          ))}
        </div>
      )}

      {/* ═══ Empty Results ═══ */}
      {!loading && searched && !(
        songs.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0
      ) && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Search className="w-16 h-16 mb-4 opacity-15" />
          <p className="text-sm">未找到与 &ldquo;{keyword}&rdquo; 相关的结果</p>
          <p className="text-xs mt-1">换个关键词试试</p>
        </div>
      )}

      {/* ═══ Unsearched: Hot + History ═══ */}
      {!loading && !searched && (
        <div className="space-y-10">
          {/* ─── Search History (stores type now, like Alger) ─── */}
          {history.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Clock className="w-4 h-4 text-gray-400" /> 搜索历史
                </h3>
                <button onClick={() => { clearHistory(); setHistory([]) }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors">清空</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <div key={h.keyword}
                    onClick={() => { setKeyword(h.keyword); setActiveTab(h.type); doSearch(h.keyword, h.type) }}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                    <span className="max-w-[160px] truncate">{h.keyword}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                      {searchTabs.find((t) => t.key === h.type)?.label}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeHistory(h.keyword); setHistory(getHistory()) }}
                      className="opacity-0 group-hover:opacity-100 ml-0.5 text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Hot Search — 4-column animated grid (Alger) ─── */}
          {hotKeywords.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <TrendingUp className="w-4 h-4 text-[#e60026]" /> 热门搜索
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {hotKeywords.map((item, index) => (
                  <div
                    key={item.searchWord}
                    onClick={() => { setKeyword(item.searchWord); doSearch(item.searchWord, activeTab) }}
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-gray-100 dark:border-white/[0.04] hover:border-[#e60026]/20 cursor-pointer transition-all animate-item"
                    style={{ animationDelay: `${index * ANIMATION_DELAY_STEP}s` }}
                  >
                    {/* Rank */}
                    <span className={`flex-shrink-0 w-7 text-lg font-bold italic transition-colors ${
                      index < 3 ? 'text-[#e60026]' : 'text-gray-300 dark:text-gray-700'
                    }`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#e60026] transition-colors">
                        {item.searchWord}
                      </p>
                      {item.content && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{item.content}</p>
                      )}
                    </div>
                    {item.iconUrl && (
                      <img src={item.iconUrl} className="h-4 object-contain opacity-70 flex-shrink-0" alt="" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ RESULTS ═══ */}

      {/* ─── Songs Action Bar (Alger-style, sticky) ─── */}
      {!loading && activeTab === 1 && songs.length > 0 && (
        <div className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/[0.04]">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e60026] hover:bg-[#c4001f] text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#e60026]/25"
            >
              <Play className="w-4 h-4 fill-white" />
              播放全部
            </button>
            <span className="text-xs text-gray-400">{songs.length} 首{tabLabel}</span>
          </div>
        </div>
      )}

      {/* ─── Songs (using SongRow) ─── */}
      {!loading && activeTab === 1 && songs.length > 0 && (
        <div className="space-y-0.5">
          {songs.map((song, idx) => (
            <div
              key={String(song.id)}
              className="animate-item"
              style={{ animationDelay: `${(idx % 15) * ANIMATION_DELAY_STEP}s` }}
            >
              <SongRow
                song={song}
                index={idx}
                onPlay={() => { setPlayList(songs); setPlayListIndex(idx); playSong(song) }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ─── Artists ─── */}
      {!loading && activeTab === 100 && artists.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400">{artists.length} 位歌手</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-5">
            {artists.map((a, idx) => (
              <div
                key={a.id}
                className="cursor-pointer group flex flex-col items-center animate-item"
                style={{ animationDelay: `${(idx % 12) * ANIMATION_DELAY_STEP}s` }}
                onClick={() => navigate(`/artist/${a.id}`)}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 shadow-sm group-hover:shadow-md transition-all group-hover:scale-105 ring-2 ring-transparent group-hover:ring-[#e60026]/20">
                  {a.picUrl ? <img src={avatarUrl(a.picUrl)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-8 h-8" /></div>}
                </div>
                <p className="text-sm font-medium truncate w-full text-center">{a.name}</p>
                {a.alias?.[0] && <p className="text-xs text-gray-500 truncate w-full text-center">{a.alias[0]}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Albums ─── */}
      {!loading && activeTab === 10 && albums.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400">{albums.length} 张专辑</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.map((a, idx) => (
              <div
                key={a.id}
                className="cursor-pointer group rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 animate-item"
                style={{ animationDelay: `${(idx % 10) * ANIMATION_DELAY_STEP}s` }}
                onClick={() => navigate(`/album/${a.id}`)}
              >
                <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm relative">
                  <img src={coverUrl(a.picUrl || '')} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-[#e60026] ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-sm font-medium truncate leading-snug px-0.5">{a.name}</p>
                <p className="text-xs text-gray-500 truncate px-0.5">{a.artist?.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Playlists ─── */}
      {!loading && activeTab === 1000 && playlists.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400">{playlists.length} 个歌单</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((p, idx) => (
              <div
                key={p.id}
                className="cursor-pointer group rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 animate-item"
                style={{ animationDelay: `${(idx % 10) * ANIMATION_DELAY_STEP}s` }}
                onClick={() => navigate(`/playlist/${p.id}`)}
              >
                <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm">
                  <img src={coverUrl(p.coverImgUrl || '')} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  {p.playCount !== undefined && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] backdrop-blur-sm">
                      <Headphones className="w-3 h-3" />{formatPlayCount(p.playCount)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-[#e60026] ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-sm font-medium truncate leading-snug px-0.5">{p.name}</p>
                <p className="text-xs text-gray-500 truncate px-0.5">{p.creator?.nickname} · {p.trackCount}首</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ CSS Animations (Alger fadeInUp) ═══ */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-item {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .skeleton-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

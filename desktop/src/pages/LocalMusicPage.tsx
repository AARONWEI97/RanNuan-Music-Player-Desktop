import { useState, useRef, useCallback, useEffect } from 'react'
import { FolderOpen, Music, Loader, Play, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { getSearch } from '@shared'
import { playSong } from '@/services/audioService'
import { useProgressiveRender } from '@/hooks/useProgressiveRender'
import { storeLocalFile, loadLocalFile, removeLocalFile } from '@/utils/indexedDB'
import { thumbUrl } from '@/utils/image'

interface LocalSong {
  id: string
  name: string
  size: number
  artist?: string
  picUrl?: string
  album?: string
  /** Internal: store blob URL (not persisted — rebuilt on load) */
  _blobUrl?: string
  /** Internal: true if file data is loading/missing from IndexedDB */
  _missing?: boolean
}

const META_KEY = 'rannuan-local-meta'

function loadMeta(): LocalSong[] {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveMeta(songs: LocalSong[]) {
  // strip transient fields before persisting
  const clean = songs.map(({ _blobUrl, _missing, ...rest }) => rest)
  localStorage.setItem(META_KEY, JSON.stringify(clean))
}

// ── 文件名清洗 ──
function cleanFilename(raw: string): string {
  let s = raw.replace(/\.[^/.]+$/, '')
  s = s.replace(/[（(]\s*(320kbps|128kbps|HQ|SQ|无损|lossless|flac|无损音质|高音质)\s*[)）]/gi, '')
  s = s.replace(/[（(]\s*(独家|首发|New|官方)\s*[)）]/gi, '')
  s = s.replace(/^(\d{1,3}[.、．]\s*)+/, '')
  s = s.replace(/\[[^\]]*\]/g, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s || raw.replace(/\.[^/.]+$/, '')
}

function parseFile(raw: string): { name: string; artist?: string } {
  const cleaned = cleanFilename(raw)
  for (const sep of [' - ', ' – ', ' — ']) {
    const i = cleaned.indexOf(sep)
    if (i > 0) {
      const artist = cleaned.slice(0, i).trim()
      const name = cleaned.slice(i + sep.length).trim()
      if (artist.length <= 40 && name.length >= 1) return { name, artist }
    }
  }
  return { name: cleaned }
}

// ── 搜索封面 ──
async function searchMatch(name: string, artist?: string): Promise<{ picUrl?: string; artist?: string; album?: string } | null> {
  const queries: string[] = []
  if (artist) { queries.push(`${name} ${artist}`, `${artist} ${name}`, name) }
  else {
    queries.push(name)
    const idx = name.indexOf(' - ')
    if (idx > 0) queries.push(name.slice(idx + 3).trim())
  }
  for (const q of queries) {
    try {
      const res: any = await getSearch({ keywords: q, type: 1, limit: 5 })
      const songs = res?.data?.result?.songs || res?.data?.data?.songs || []
      const exact = songs.find((s: any) =>
        s.name?.replace(/\s*[（(].*[)）]\s*/g, '').toLowerCase() === name.replace(/\s*[（(].*[)）]\s*/g, '').toLowerCase()
      )
      const best = exact || songs[0]
      if (best?.al?.picUrl) {
        return { picUrl: best.al.picUrl, artist: best.ar?.map((a: any) => a.name).join(' / '), album: best.al?.name }
      }
    } catch { /* next */ }
  }
  return null
}

function fmtSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// ═══════════════ MAIN ═══════════════
export default function LocalMusicPage() {
  const [songs, setSongs] = useState<LocalSong[]>([])
  const [matching, setMatching] = useState<Set<string>>(new Set())
  const [matchAll, setMatchAll] = useState(false)
  const [initDone, setInitDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 启动时从 IndexedDB 重建 blob URL ──
  useEffect(() => {
    const metas = loadMeta()
    Promise.allSettled(metas.map(async (m) => {
      const buf = await loadLocalFile(m.id)
      if (buf) {
        const blob = new Blob([buf])
        const url = URL.createObjectURL(blob)
        return { ...m, _blobUrl: url }
      }
      return { ...m, _missing: true }
    })).then(results => {
      const restored = results.map(r => r.status === 'fulfilled' ? r.value : (r.reason ?? {}))
      setSongs(restored as LocalSong[])
      setInitDone(true)
    })
  }, [])

  const persistMeta = useCallback((s: LocalSong[]) => { saveMeta(s) }, [])

  const { renderedItems, placeholderHeight, sentinelRef } = useProgressiveRender({
    items: songs, itemHeight: 56, initialCount: 40, batchSize: 30, resetKey: songs.length,
  })

  // ── 匹配单首 ──
  const matchOne = useCallback(async (id: string, name: string, artist?: string) => {
    setMatching(p => { const n = new Set(p); n.add(id); return n })
    const info = await searchMatch(name, artist)
    setSongs(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...info } : s)
      persistMeta(next)
      return next
    })
    setMatching(p => { const n = new Set(p); n.delete(id); return n })
  }, [persistMeta])

  // ── 匹配全部 ──
  const matchUnmatched = useCallback(async () => {
    const unmatched = songs.filter(s => !s.picUrl && !s._missing)
    if (unmatched.length === 0) return
    setMatchAll(true)
    const ids = new Set(unmatched.map(s => s.id))
    setMatching(ids)

    for (let i = 0; i < unmatched.length; i += 3) {
      const chunk = unmatched.slice(i, i + 3)
      await Promise.allSettled(chunk.map(async s => {
        const info = await searchMatch(s.name, s.artist)
        if (info) {
          setSongs(prev => {
            const next = prev.map(x => x.id === s.id ? { ...x, ...info } : x)
            persistMeta(next)
            return next
          })
        }
      }))
      chunk.forEach(s => setMatching(p => { const n = new Set(p); n.delete(s.id); return n }))
    }
    setMatchAll(false)
  }, [songs, persistMeta])

  // ── 上传 ──
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const ts = Date.now()
    const newSongs: LocalSong[] = []
    const storePromises: Promise<void>[] = []

    Array.from(files).forEach((file, i) => {
      const { name, artist } = parseFile(file.name)
      const id = `local-${ts}-${i}-${Math.random().toString(36).slice(2, 6)}`
      const blobUrl = URL.createObjectURL(file)

      // store file content to IndexedDB
      storePromises.push(
        file.arrayBuffer().then(buf => storeLocalFile(id, buf))
      )

      newSongs.push({
        id, name,
        size: file.size,
        artist,
        _blobUrl: blobUrl,
      })
    })

    // wait for IndexedDB writes to complete
    await Promise.allSettled(storePromises)

    const merged = [...songs, ...newSongs]
    setSongs(merged)
    persistMeta(merged)
    if (inputRef.current) inputRef.current.value = ''

    // match covers in background
    const ids = new Set(newSongs.map(s => s.id))
    setMatching(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n })
    const results = await Promise.allSettled(newSongs.map(s => searchMatch(s.name, s.artist)))
    results.forEach((r, i) => {
      const sid = newSongs[i].id
      if (r.status === 'fulfilled' && r.value) {
        setSongs(prev => {
          const n = prev.map(s => s.id === sid ? { ...s, ...r.value } : s)
          persistMeta(n)
          return n
        })
      }
      setMatching(prev => { const n = new Set(prev); n.delete(sid); return n })
    })
  }, [songs, persistMeta])

  // ── 删除 ──
  const remove = useCallback((id: string) => {
    const song = songs.find(s => s.id === id)
    if (song?._blobUrl) URL.revokeObjectURL(song._blobUrl)
    removeLocalFile(id).catch(() => {})
    const next = songs.filter(s => s.id !== id)
    setSongs(next)
    persistMeta(next)
  }, [songs, persistMeta])

  // ── 播放 ──
  const handlePlay = (song: LocalSong) => {
    if (song._missing || !song._blobUrl) return
    playSong({
      id: song.id,
      name: song.name,
      picUrl: song.picUrl || '',
      ar: [{ id: 0, name: song.artist || '本地音乐' }],
      al: { id: 0, name: song.album || '本地音乐' },
      count: 0,
      playMusicUrl: song._blobUrl,
    })
  }

  const unmatched = songs.filter(s => !s.picUrl && !s._missing).length
  const missingCount = songs.filter(s => s._missing).length

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">本地音乐</h1>
        <div className="flex items-center gap-2">
          {unmatched > 0 && (
            <button onClick={matchUnmatched} disabled={matchAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#e60026] bg-[#e60026]/6 hover:bg-[#e60026]/10 transition-colors disabled:opacity-50">
              {matchAll ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              匹配封面 {unmatched > 0 && `(${unmatched})`}
            </button>
          )}
          <button onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#e60026] text-white rounded-lg text-sm font-medium hover:bg-[#c4001f] active:scale-95 transition-all">
            <FolderOpen className="w-4 h-4" /> 导入音乐
          </button>
        </div>
        <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* missing warning */}
      {!initDone ? (
        <div className="flex justify-center py-16">
          <Loader className="w-6 h-6 animate-spin text-[#e60026]" />
        </div>
      ) : missingCount > 0 && songs.length > 0 ? (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">{missingCount} 个本地文件数据丢失</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">浏览器清理了数据，请重新导入这些歌曲</p>
          </div>
        </div>
      ) : null}

      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
            <Music className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">暂无本地音乐</h2>
          <p className="text-sm">点击上方「导入音乐」选择音频文件</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">数据永久保存在本地，刷新不丢失</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {renderedItems.map((song, idx) => {
            const isMatching = matching.has(song.id)
            const disabled = song._missing
            return (
              <div
                key={song.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors group ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                }`}
                onClick={() => { if (!disabled) handlePlay(song) }}
              >
                <span className={`text-xs w-5 text-center tabular-nums flex-shrink-0 ${disabled ? 'text-gray-300 dark:text-gray-700' : 'text-gray-400 dark:text-gray-500'}`}>
                  {String(idx + 1).padStart(2, '0')}
                </span>

                {/* cover */}
                {isMatching ? (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <Loader className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                ) : disabled ? (
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-300 dark:text-red-600/50" />
                  </div>
                ) : song.picUrl ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-100 dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.04]">
                    <img src={thumbUrl(song.picUrl)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <Music className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  </div>
                )}

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {song.name} {disabled && <span className="text-[10px] text-red-400 ml-1 font-normal">(数据丢失)</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                    {disabled ? '文件数据已丢失，请重新导入' : (song.artist || '未知歌手') + (song.album ? ` · ${song.album}` : '')}
                  </p>
                </div>

                <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0 hidden sm:block">{fmtSize(song.size)}</span>

                {/* actions */}
                {!disabled && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handlePlay(song) }}
                      className="p-1.5 rounded-lg hover:bg-[#e60026]/10 text-gray-400 hover:text-[#e60026] transition-colors">
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                    {!song.picUrl && !isMatching && (
                      <button onClick={(e) => { e.stopPropagation(); matchOne(song.id, song.name, song.artist) }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 hover:text-[#e60026] transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); remove(song.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {placeholderHeight > 0 && <div style={{ height: placeholderHeight }} />}
          <div ref={sentinelRef} className="h-0" />
        </div>
      )}
    </div>
  )
}

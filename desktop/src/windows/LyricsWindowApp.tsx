import { usePlayerSnapshot } from '@/services/panelClient'

/**
 * 独立桌面歌词窗口（700×200 逻辑像素，置顶透明，永久鼠标穿透）。
 *
 * 布局：三行歌词（上句 / 当前句 / 下句）+ 左下角 mini 歌曲信息角标。
 * 永远 pointer-events-none，不响应任何鼠标事件。
 */
export default function LyricsWindowApp() {
  const s = usePlayerSnapshot()

  const lyricIndex = s.lyric && s.lyric.lines.length > 0
    ? Math.max(0, s.lyric.index)
    : -1
  const prev    = lyricIndex > 0                         ? s.lyric?.lines[lyricIndex - 1] : null
  const current = lyricIndex >= 0                        ? s.lyric?.lines[lyricIndex]     : null
  const next    = lyricIndex >= 0                        ? s.lyric?.lines[lyricIndex + 1] : null

  const hasSong = !!s.song

  return (
    <div className="w-screen h-screen p-3 bg-transparent select-none pointer-events-none flex items-center justify-center">
      <div
        className="relative w-full h-full rounded-2xl flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,10,0.82) 0%, rgba(30,10,20,0.78) 100%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* 封面模糊铺底 */}
        {s.song?.picUrl && (
          <img
            key={s.song.picUrl}
            src={s.song.picUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-[0.18]"
            style={{ filter: 'blur(28px) saturate(1.6)', transform: 'scale(1.4)' }}
          />
        )}

        {/* ── 三行歌词区 ── */}
        <div className="relative z-10 w-full flex flex-col items-center gap-[5px] px-10">

          {/* 上一句 */}
          <div className="h-[22px] flex items-center">
            {prev?.text ? (
              <p
                key={`prev-${lyricIndex}`}
                className="text-[13px] text-white/38 truncate max-w-full animate-lyric-in"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {prev.text}
              </p>
            ) : null}
          </div>

          {/* 当前句 */}
          <div className="flex flex-col items-center min-h-[44px] justify-center">
            {current ? (
              <div key={`cur-${lyricIndex}`} className="animate-lyric-in text-center max-w-full">
                <p
                  className="text-[26px] font-bold leading-tight truncate"
                  style={{
                    background: 'linear-gradient(180deg, #fff 20%, #ffd6e7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(230,0,38,0.5))',
                  }}
                >
                  {current.text}
                </p>
                {current.sub && (
                  <p className="text-[13px] text-white/70 mt-0.5 truncate"
                     style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                    {current.sub}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[16px] text-white/55" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {hasSong ? `♪ ${s.song!.name} — 暂无歌词` : '♪ RanNuan Music'}
              </p>
            )}
          </div>

          {/* 下一句 */}
          <div className="h-[22px] flex items-center">
            {next?.text ? (
              <p
                key={`next-${lyricIndex}`}
                className="text-[13px] text-white/38 truncate max-w-full"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {next.text}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── 左下角：mini 歌曲信息 ── */}
        {hasSong && (
          <div className="absolute bottom-3 left-4 flex items-center gap-2 z-10">
            {s.song!.picUrl && (
              <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                <img src={s.song!.picUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white/75 truncate max-w-[160px]"
                 style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                {s.song!.name}
              </p>
              <p className="text-[9px] text-white/45 truncate max-w-[160px]">
                {s.song!.artist}
              </p>
            </div>
          </div>
        )}

        {/* ── 右下角：播放状态指示点 ── */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 z-10">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="block rounded-full"
              style={{
                width: 3, height: s.isPlay ? [10, 16, 8][i] : 4,
                background: s.isPlay ? 'rgba(255,100,140,0.8)' : 'rgba(255,255,255,0.2)',
                transition: 'height 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

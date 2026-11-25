import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import '../src/index.css'
import { usePlaylistStore, usePlayerStore, setStorageAdapter } from '@shared'
import request from '@shared/api/request'
import ArtistPage from '../src/pages/ArtistPage'
import AlbumPage from '../src/pages/AlbumPage'
import SongDetailPage from '../src/pages/SongDetailPage'
import SongCommentPage from '../src/pages/SongCommentPage'
import SongRow from '../src/components/common/SongRow'
import AppRouter from '../src/components/layout/AppRouter'
import ContextMenu from '../src/components/common/ContextMenu'
import PlaylistDrawer from '../src/components/layout/PlaylistDrawer'
import PlayerBar from '../src/components/layout/PlayerBar'
import AddToPlaylistModal from '../src/components/common/AddToPlaylistModal'
import ToastContainer from '../src/components/common/Toast'
import { useContextMenu, hideContextMenu } from '../src/hooks/useContextMenu'
import { useAuthStore } from '../src/store/authStore'
const cover = '/logo.png'
const artists = [{ id: 6452, name: '许嵩' }, { id: 1001, name: '黄龄' }]
const album = { id: 12345, name: '安泊猜想', picUrl: cover, artist: artists[0], artists, description: '菜单回归验证专辑' }
const songs = [
 { id: 111, name: '心安之地', ar: [artists[0]], al: album, picUrl: cover, dt: 262000, count: 0, mv: 900 },
 { id: 222, name: '惊鸿一面', ar: artists, al: album, picUrl: cover, dt: 256000, count: 0 },
]
const memory = new Map()
setStorageAdapter({ getItem: async k => memory.get(k) || null, setItem: async (k,v) => { memory.set(k,v) }, removeItem: async k => { memory.delete(k) } })
request.defaults.adapter = async config => {
 const data = { code: 200 }
 const url = config.url || ''
 if (url === '/song/detail') data.songs = songs.filter(s => String(config.params.ids).split(',').includes(String(s.id)))
 else if (url === '/artist/detail') data.data = { artist: { ...artists[0], cover, avatar: cover, albumSize: 1, musicSize: 2, mvSize: 1, briefDesc: '歌手页面回归验证' } }
 else if (url === '/artist/top/song' || url === '/artist/songs' || url === '/artists') Object.assign(data, { songs, hotSongs: songs })
 else if (url === '/album') Object.assign(data, { album, songs })
 else if (url === '/artist/album') data.hotAlbums = [album]
 else if (url === '/simi/song') data.songs = songs.slice().reverse()
 else if (url === '/simi/artist') data.artists = []
 else if (url === '/artist/desc') Object.assign(data, { introduction: [], briefDesc: '测试简介' })
 else if (url === '/comment/new') data.data = { comments: [], totalCount: 0, hasMore: false }
 else if (url === '/cloudsearch') data.result = { artists, albums: [album], songs }
 else if (url === '/user/playlist') data.playlist = [{ id: 55, name: '测试歌单', creator: { userId: 1 }, trackCount: 1 }]
 else if (url === '/song/url/v1') data.data = [{ id: 111, url: null }]
 else if (url === '/lyric/new') data.lrc = { lyric: '[00:00.00]回归测试歌词' }
 else data.data = {}
 return { data, status: 200, statusText: 'OK', headers: {}, config }
}
usePlaylistStore.setState({ playList: songs, playListIndex: 0, playNextQueue: [], showPlaylistDrawer: false })
usePlayerStore.setState({ playMusic: songs[0], isPlay: false, currentProgress: 52000, duration: 262000, isLoading: false })
document.documentElement.classList.add('dog-theme')
document.documentElement.dataset.theme = 'dog-light'
function Shell() {
 const nav = useNavigate()
 const location = useLocation()
 const { menu } = useContextMenu()
 const currentSong = usePlayerStore(s => s.playMusic)
 const list = usePlaylistStore(s => s.playList)
 const next = usePlaylistStore(s => s.playNextQueue)
 useEffect(() => { hideContextMenu() }, [location.pathname, location.search])
 return <div className="h-screen overflow-y-auto p-6 pb-24">
  <nav className="flex gap-5 mb-5">
   <button onClick={() => nav('/artist/6452')}>测试歌手页</button>
   <button onClick={() => nav('/album/12345')}>测试专辑页</button>
   <button onClick={() => nav('/fixtures')}>测试缺失ID</button>
   <button onClick={() => usePlaylistStore.getState().setShowPlaylistDrawer(true)}>打开测试队列</button>
   <button onClick={() => useAuthStore.setState({ isLoggedIn: true, profile: { userId: 1 } })}>测试登录</button>
  </nav>
  <output aria-label="测试状态">路由 {location.pathname}{location.search}；当前歌曲 {currentSong?.id}；队列 {list.length}；下一首 {next.length}</output>
  <main className="mt-5"><Routes>
    <Route path="/artist/:id" element={<ArtistPage />} />
    <Route path="/album/:id" element={<AlbumPage />} />
    <Route path="/song/:id" element={<SongDetailPage />} />
    <Route path="/song/:id/comments" element={<SongCommentPage />} />
    <Route path="/fixtures" element={<>
      <SongRow song={{ ...songs[1], ar: [], artists, al: { id: 0, name: '' }, album }} index={0} />
      <SongRow song={{ ...songs[1], id: 333, name: '只有名称的歌曲', ar: [{ id: 0, name: '黄龄' }], al: { id: 0, name: '安泊猜想' } }} index={1} />
      <SongRow song={{ ...songs[1], id: 'local-fixture', name: '本地测试歌曲', ar: [], al: { id: 0, name: '' } }} index={2} />
    </>} />
    <Route path="*" element={<><h1>歌曲菜单验证</h1>{songs.map((s,i) => <SongRow key={s.id} song={s} index={i} />)}</>} />
  </Routes></main>
  <PlayerBar /><PlaylistDrawer /><ContextMenu menu={menu} /><ToastContainer /><AddToPlaylistModal />
 </div>
}
createRoot(document.getElementById('root')).render(<AppRouter><Shell /></AppRouter>)

import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import PlaylistPage from './pages/PlaylistPage'
import LibraryPage from './pages/LibraryPage'
import FavoritesPage from './pages/FavoritesPage'
import HistoryPage from './pages/HistoryPage'
import SongDetailPage from './pages/SongDetailPage'
import SettingsPage from './pages/SettingsPage'
import LocalMusicPage from './pages/LocalMusicPage'
import ArtistPage from './pages/ArtistPage'
import AlbumPage from './pages/AlbumPage'
import LoginPage from './pages/LoginPage'
import TopListPage from './pages/TopListPage'
import UserPage from './pages/UserPage'
import DailyRecommendPage from './pages/DailyRecommendPage'
import CommentHistoryPage from './pages/CommentHistoryPage'
import HeatmapPage from './pages/HeatmapPage'
import DownloadPage from './pages/DownloadPage'
import PlaylistImportPage from './pages/PlaylistImportPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/playlist/:id" element={<PlaylistPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/song/:id" element={<SongDetailPage />} />
      <Route path="/artist/:id" element={<ArtistPage />} />
      <Route path="/album/:id" element={<AlbumPage />} />
      <Route path="/local" element={<LocalMusicPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/toplist" element={<TopListPage />} />
      <Route path="/user/:id" element={<UserPage />} />
      <Route path="/daily-recommend" element={<DailyRecommendPage />} />
      <Route path="/comment-history" element={<CommentHistoryPage />} />
      <Route path="/heatmap" element={<HeatmapPage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/playlist-import" element={<PlaylistImportPage />} />
    </Routes>
  )
}

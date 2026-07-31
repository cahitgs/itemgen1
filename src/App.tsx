import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Player } from './pages/Player'
import { Editor } from './pages/Editor'
import { Generate } from './pages/Generate'
import { Library } from './pages/Library'
import { Mixer } from './pages/Mixer'
import { LangToggle } from './components/LangToggle'

/**
 * HashRouter is used so the app works when served as static files
 * (e.g. opening dist/index.html directly, or hosting on GitHub Pages
 * without server-side rewrites).
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Player />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/mixer" element={<Mixer />} />
        <Route path="/library" element={<Library />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
      <LangToggle />
    </HashRouter>
  )
}

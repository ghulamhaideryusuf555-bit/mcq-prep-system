import { Routes, Route } from 'react-router-dom'
import { AuthProvider, ThemeProvider } from './contexts'
import { Layout, ProtectedRoute } from './components'
import {
  Login, Signup, Dashboard, Upload, ReviewImport, SearchPage,
  Practice, PracticeSession, Results, Bookmarks, Mistakes, Notes, Settings,
} from './pages'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="review/:paperId" element={<ReviewImport />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="practice" element={<Practice />} />
            <Route path="practice/session" element={<PracticeSession />} />
            <Route path="practice/results/:attemptId" element={<Results />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="mistakes" element={<Mistakes />} />
            <Route path="notes" element={<Notes />} />
            <Route
              path="settings"
              element={
                <ProtectedRoute adminOnly>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

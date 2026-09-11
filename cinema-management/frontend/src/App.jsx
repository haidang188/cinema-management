import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from 'react-router-dom'

import { PromotionList } from './pages/admin/promotions/PromotionList'
import { PromotionCreate } from './pages/admin/promotions/PromotionCreate'
import { PromotionDetail } from './pages/admin/promotions/PromotionDetail'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div>
        <header
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #ddd'
          }}
        />

        <main>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/admin/promotions" replace />}
            />

            <Route
              path="/admin/promotions"
              element={<PromotionList />}
            />

            <Route
              path="/admin/promotions/create"
              element={<PromotionCreate />}
            />

            <Route
              path="/admin/promotions/:id"
              element={<PromotionDetail />}
            />

            <Route
              path="*"
              element={<Navigate to="/admin/promotions" replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

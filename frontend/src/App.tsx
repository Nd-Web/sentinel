import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './features/marketing/LandingPage'
import SignIn from './features/auth/SignIn'
import SignUp from './features/auth/SignUp'
import DashboardLayout from './features/dashboard/DashboardLayout'
import DashboardPage from './features/dashboard/pages/DashboardPage'
import ThreatsPage from './features/dashboard/pages/ThreatsPage'
import DeepfakePage from './features/dashboard/pages/DeepfakePage'
import ProfilePage from './features/dashboard/pages/ProfilePage'
import ApiKeysPage from './features/dashboard/pages/ApiKeysPage'
import UserManagementPage from './features/dashboard/pages/UserManagementPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="threats" element={<ThreatsPage />} />
          <Route path="deepfake" element={<DeepfakePage />} />
          <Route path="settings/profile" element={<ProfilePage />} />
          <Route path="settings/api-keys" element={<ApiKeysPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

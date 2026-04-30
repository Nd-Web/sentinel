import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import ProtectedRoute from './components/ProtectedRoute'
import OnboardingWizard from './features/onboarding/OnboardingWizard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />

        {/* Authed area */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="threats" element={<ThreatsPage />} />
            <Route path="deepfake" element={<DeepfakePage />} />
            <Route path="settings/profile" element={<ProfilePage />} />
            <Route path="settings/api-keys" element={<ApiKeysPage />} />
            {/* Admin-only sub-area */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="users" element={<UserManagementPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

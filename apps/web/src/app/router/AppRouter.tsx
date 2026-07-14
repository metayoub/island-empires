import { Route, Routes } from 'react-router-dom';
import { GameShell } from '../../components/layout/GameShell';
import { AccountSettingsPage } from '../../features/auth/AccountSettingsPage';
import { ForgotPasswordPage } from '../../features/auth/ForgotPasswordPage';
import { LoginPage } from '../../features/auth/LoginPage';
import { LogoutPage } from '../../features/auth/LogoutPage';
import { RegisterPage } from '../../features/auth/RegisterPage';
import { ResetPasswordPage } from '../../features/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../../features/auth/VerifyEmailPage';
import { AlliancesPage } from '../../features/alliances/AlliancesPage';
import { CityDashboard } from '../../features/city/CityDashboard';
import { CityViewPage } from '../../features/city-view/CityViewPage';
import { MessagesPage } from '../../features/communications/MessagesPage';
import { NotificationsPage } from '../../features/communications/NotificationsPage';
import { ReportsPage } from '../../features/communications/ReportsPage';
import { GuidePage } from '../../features/guide/GuidePage';
import { HealthPage } from '../../features/health/HealthPage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import {
  AccessDeniedPage,
  ConnectionLostPage,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
  SessionExpiredPage,
} from '../../features/status/StatusPages';
import { PrivacyPolicyPage } from '../../features/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '../../features/legal/TermsOfServicePage';
import { LiveEventsPage } from '../../features/live-events/LiveEventsPage';
import { DebugEconomyPage } from '../../features/debug/DebugEconomyPage';
import { IslandPage } from '../../features/map/IslandPage';
import { MarketplacePage } from '../../features/marketplace/MarketplacePage';
import { RankingsPage } from '../../features/rankings/RankingsPage';
import { WorldMapPage } from '../../features/map/WorldMapPage';
import { ResearchPage } from '../../features/research/ResearchPage';
import { ScoutingPage } from '../../features/scouting/ScoutingPage';
import { AdvancedSearchPage } from '../../features/search/AdvancedSearchPage';
import { SupportPage } from '../../features/support/SupportPage';
import { SupportCancelPage, SupportProjectPage, SupportSuccessPage } from '../../features/supporter/SupportProjectPage';
import { TransportPage } from '../../features/transport/TransportPage';

export function AppRouter() {
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
    return (
      <Routes>
        <Route path="/health" element={<HealthPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/status" element={<HealthPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/connection-lost" element={<ConnectionLostPage />} />
      <Route path="/session-expired" element={<SessionExpiredPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route element={<GameShell />}>
        <Route path="/" element={<CityViewPage />} />
        <Route path="/overview" element={<CityDashboard />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/map" element={<WorldMapPage />} />
        <Route path="/map/islands/:islandId" element={<IslandPage />} />
        <Route path="/transport" element={<TransportPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/search" element={<AdvancedSearchPage />} />
        <Route path="/events" element={<LiveEventsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/support-project" element={<SupportProjectPage />} />
        <Route path="/support-project/success" element={<SupportSuccessPage />} />
        <Route path="/support-project/cancel" element={<SupportCancelPage />} />
        <Route path="/scouting" element={<ScoutingPage />} />
        <Route path="/alliances" element={<AlliancesPage />} />
        {import.meta.env.DEV ? (
          <Route path="/debug/economy" element={<DebugEconomyPage />} />
        ) : null}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

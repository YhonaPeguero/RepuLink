import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateBadgePage } from "./pages/CreateBadgePage";
import { ApproveBadgePage } from "./pages/ApproveBadgePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/badge/create" element={<CreateBadgePage />} />
        <Route path="/approve/:freelancer/:badgeIndex" element={<ApproveBadgePage />} />
        <Route path="/:username" element={<PublicProfilePage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
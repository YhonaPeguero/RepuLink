import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { CreateJobPage } from "./pages/CreateJobPage";
import { JobPage } from "./pages/JobPage";
import { Companion } from "./components/companion/Companion";
import { CompanionProvider } from "./components/companion/CompanionContext";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/job/create" element={<CreateJobPage />} />
        <Route path="/job/:jobAddress" element={<JobPage />} />
        <Route path="/profile/:wallet" element={<PublicProfilePage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CompanionProvider>
        <AnimatedRoutes />
        <Companion />
      </CompanionProvider>
    </BrowserRouter>
  );
}

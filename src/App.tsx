import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import PerfilPage from "./pages/PerfilPage";
import MascotasPage from "./pages/MascotasPage";
import CombatePage from "./pages/CombatePage";
import HistorialPage from "./pages/HistorialPage";
import LogrosPage from "./pages/LogrosPage";

const navLinkBase =
  "px-5 py-3 rounded-xl text-base font-semibold transition border";

function App() {
  const location = useLocation();
  const hideNav = ["/", "/menu", "/combate"].includes(location.pathname);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070A12] text-white pointer-events-auto">
      <div className="vignette-full" />
      <div className="grain-overlay" />

      {!hideNav && (
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#070A12]/78 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
            <div className="text-base font-bold uppercase tracking-[0.35em] text-emerald-300">
              Legado
            </div>
            <nav className="flex items-center gap-4 pointer-events-auto">
              <NavLink
                to="/menu"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-slate-600"
                  }`
                }
              >
                Menu
              </NavLink>
              <NavLink
                to="/perfil"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-slate-600"
                  }`
                }
              >
                Perfil
              </NavLink>
              <NavLink
                to="/mascotas"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-slate-600"
                  }`
                }
              >
                Mascotas
              </NavLink>
              <NavLink
                to="/combate"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-slate-600"
                  }`
                }
              >
                Combate
              </NavLink>
              <NavLink
                to="/historial"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-slate-600"
                  }`
                }
              >
                Historial
              </NavLink>
              <NavLink
                to="/logros"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-slate-600"
                  }`
                }
              >
                Logros
              </NavLink>
            </nav>
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/mascotas" element={<MascotasPage />} />
            <Route path="/combate" element={<CombatePage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/logros" element={<LogrosPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
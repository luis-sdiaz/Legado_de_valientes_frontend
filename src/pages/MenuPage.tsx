import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainMenu from "../components/MainMenu";

export default function MenuPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex h-full w-full items-center justify-center p-4"
    >
      {/* AQUÍ PASAMOS LAS PROPS. Esto elimina el error "missing properties" */}
      <MainMenu
        onPlay={() => navigate("/combate")}
        onPets={() => navigate("/mascotas")}
        onProfile={() => navigate("/perfil")}
        onExit={() => navigate("/")}
      />
    </motion.div>
  );
}
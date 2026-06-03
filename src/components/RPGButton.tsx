import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

type RPGButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  centered?: boolean;
};

export default function RPGButton({
  children,
  variant = "primary",
  centered,
  className = "",
  ...rest
}: RPGButtonProps) {
  const base = [
    "btn-rpg",
    variant === "ghost" ? "btn-rpg--ghost" : "",
    centered ? "centered" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.99 }}
      className={base}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

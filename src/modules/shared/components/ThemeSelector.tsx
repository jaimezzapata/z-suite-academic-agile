"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const themeColors = [
  { name: "Indigo", value: "#6366f1", hover: "#4f46e5", bgClass: "bg-[#6366f1]" },
  { name: "Azul", value: "#3b82f6", hover: "#2563eb", bgClass: "bg-[#3b82f6]" },
  { name: "Esmeralda", value: "#10b981", hover: "#059669", bgClass: "bg-[#10b981]" },
  { name: "Ámbar", value: "#f59e0b", hover: "#d97706", bgClass: "bg-[#f59e0b]" },
  { name: "Rosa", value: "#f43f5e", hover: "#e11d48", bgClass: "bg-[#f43f5e]" },
];

export const ThemeSelector: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [selectedColor, setSelectedColor] = useState<string>("#6366f1");
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Initialize theme from DOM classes and localStorage
  useEffect(() => {
    // Read theme class from html element
    const isHtmlDark = document.documentElement.classList.contains("dark");
    setIsDark(isHtmlDark);

    // Read stored brand color
    const storedColor = localStorage.getItem("theme-color") || "#6366f1";
    const storedHoverColor = localStorage.getItem("theme-color-hover") || "#4f46e5";
    setSelectedColor(storedColor);

    // Guarantee that variables are applied on mount
    document.documentElement.style.setProperty("--brand-color", storedColor);
    document.documentElement.style.setProperty("--color-brand-purple", storedColor);
    document.documentElement.style.setProperty("--brand-color-hover", storedHoverColor);
    document.documentElement.style.setProperty("--color-brand-purple-hover", storedHoverColor);
  }, []);

  // Handle outside click to close palette
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleColorChange = (color: string, hoverColor: string) => {
    setSelectedColor(color);
    document.documentElement.style.setProperty("--brand-color", color);
    document.documentElement.style.setProperty("--color-brand-purple", color);
    document.documentElement.style.setProperty("--brand-color-hover", hoverColor);
    document.documentElement.style.setProperty("--color-brand-purple-hover", hoverColor);
    localStorage.setItem("theme-color", color);
    localStorage.setItem("theme-color-hover", hoverColor);
  };

  return (
    <div className="flex items-center gap-1.5 bg-zinc-900/40 border border-white/5 dark:bg-zinc-950/20 dark:border-white/5 rounded-xl p-1 relative z-50">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer focus:outline-none"
        title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 0 : 180, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </motion.div>
      </button>

      {/* Vertical Divider */}
      <div className="w-[1px] h-4 bg-white/5 dark:bg-white/10" />

      {/* Color Palette Toggle Button */}
      <div className="relative" ref={paletteRef}>
        <button
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          className="p-1.5 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer focus:outline-none flex items-center justify-center"
          title="Personalizar color de tema"
        >
          <Palette 
            className="w-4 h-4 transition-colors duration-300" 
            style={{ color: selectedColor }}
          />
        </button>

        {/* Color Palette Popover */}
        <AnimatePresence>
          {isPaletteOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 mt-2 p-3 bg-zinc-900 dark:bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2.5 min-w-[150px]"
            >
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Color de Acento
              </div>
              <div className="flex items-center gap-2">
                {themeColors.map((color) => {
                  const isSelected = selectedColor === color.value;
                  return (
                    <button
                      key={color.name}
                      onClick={() => handleColorChange(color.value, color.hover)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all ${color.bgClass} flex items-center justify-center focus:outline-none relative`}
                      title={color.name}
                    >
                      {/* Ring selector for active color */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            layoutId="activeColorRing"
                            className="absolute -inset-1 border-2 rounded-full pointer-events-none"
                            style={{ borderColor: color.value }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          />
                        )}
                      </AnimatePresence>
                      
                      {/* Small inner dot */}
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

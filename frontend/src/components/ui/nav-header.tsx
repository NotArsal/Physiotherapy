"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export interface NavItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface NavHeaderProps {
  items: NavItem[];
  activeValue?: string;
  onItemClick?: (value: string) => void;
}

function NavHeader({ items, activeValue, onItemClick }: NavHeaderProps) {
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);

  return (
    <ul
      className="relative flex w-fit rounded-full p-1 select-none"
      style={{
        background: "rgba(255,255,255,0.12)",
        border: "1.5px solid rgba(255,255,255,0.25)",
        backdropFilter: "blur(6px)",
      }}
      onMouseLeave={() => setHoveredValue(null)}
    >
      {items.map((item) => {
        const isHovered = hoveredValue === item.value;
        const isActive = activeValue === item.value;
        // Show pill if hovered, or if not hovering anything and this is active
        const showPill = hoveredValue !== null ? isHovered : isActive;
        const textColor = showPill ? "#1565c0" : "rgba(255,255,255,0.92)";

        return (
          <li
            key={item.value}
            onClick={() => onItemClick?.(item.value)}
            onMouseEnter={() => setHoveredValue(item.value)}
            className="relative z-10 flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide select-none transition-colors duration-200"
            style={{ color: textColor }}
          >
            {showPill && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0.5 rounded-full bg-white -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {item.icon && <span className="text-[0.8rem] flex items-center justify-center">{item.icon}</span>}
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default NavHeader;

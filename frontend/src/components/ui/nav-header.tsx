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
      className="relative flex w-fit rounded-full p-1 select-none items-center"
      style={{
        background: "#efe9de", // Surface Card background
        border: "1px solid #e6dfd8", // Hairline border
      }}
      onMouseLeave={() => setHoveredValue(null)}
    >
      {items.map((item) => {
        const isHovered = hoveredValue === item.value;
        const isActive = activeValue === item.value;
        const showPill = hoveredValue !== null ? isHovered : isActive;
        const textColor = showPill ? "#141413" : "#6c6a64"; // Ink active, Muted inactive

        return (
          <li
            key={item.value}
            onClick={() => onItemClick?.(item.value)}
            onMouseEnter={() => setHoveredValue(item.value)}
            className="relative flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-wider select-none transition-colors duration-200"
            style={{ color: textColor, zIndex: 10 }}
          >
            {showPill && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0.5 rounded-full bg-[#faf9f5] z-0 shadow-sm border border-[#e6dfd8]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {item.icon && (
              <span className="relative z-10 text-[0.8rem] flex items-center justify-center" style={{ color: 'inherit' }}>
                {item.icon}
              </span>
            )}
            <span className="relative z-10">{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default NavHeader;


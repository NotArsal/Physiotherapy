"use client";

import React, { useRef, useState } from "react";
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
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });

  return (
    <ul
      className="relative flex w-fit rounded-full p-1"
      style={{
        background: "rgba(255,255,255,0.12)",
        border: "1.5px solid rgba(255,255,255,0.30)",
        backdropFilter: "blur(6px)",
      }}
      onMouseLeave={() => setPosition((pv) => ({ ...pv, opacity: 0 }))}
    >
      {items.map((item) => (
        <NavTab
          key={item.value}
          item={item}
          isActive={activeValue === item.value}
          setPosition={setPosition}
          onClick={() => onItemClick?.(item.value)}
        />
      ))}
      <NavCursor position={position} />
    </ul>
  );
}

const NavTab = ({
  item,
  isActive,
  setPosition,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  setPosition: React.Dispatch<
    React.SetStateAction<{ left: number; width: number; opacity: number }>
  >;
  onClick: () => void;
}) => {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft });
      }}
      className="relative z-10 flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide select-none"
      style={{
        /* active item gets an opaque white pill; inactive items: white text */
        color: isActive ? "#1976d2" : "rgba(255,255,255,0.92)",
        transition: "color 0.2s",
      }}
    >
      {item.icon && <span className="text-[0.8rem]">{item.icon}</span>}
      {item.label}
      {/* active underline dot */}
      {isActive && (
        <span
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
          style={{ background: "#1976d2" }}
        />
      )}
    </li>
  );
};

const NavCursor = ({
  position,
}: {
  position: { left: number; width: number; opacity: number };
}) => (
  <motion.li
    animate={position}
    transition={{ type: "spring", stiffness: 400, damping: 32 }}
    className="absolute z-0 top-1 bottom-1 rounded-full"
    style={{ background: "rgba(255,255,255,0.95)", pointerEvents: "none" }}
  />
);

export default NavHeader;

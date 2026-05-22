// SuggestiveSearch.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { Search } from "lucide-react";

export interface EffectRendererProps {
  text: string;
  isActive: boolean;
  allowDelete?: boolean;
  typeDurationMs: number;
  deleteDurationMs: number;
  pauseAfterTypeMs: number;
  prefersReducedMotion?: boolean;
  onDeleteComplete?: () => void;
  containerRef?: RefObject<HTMLElement | null>;
  textColor?: string;
  cursorColor?: string;
}

export type BuiltinEffect = "typewriter" | "slide" | "fade" | "none";

export interface SuggestiveSearchProps {
  onChange?: (val: string) => void;
  suggestions?: string[];
  className?: string;
  Leading?: (props: { color?: string }) => JSX.Element;
  showLeading?: boolean;
  Trailing?: () => JSX.Element;
  showTrailing?: boolean;
  effect?: BuiltinEffect;
  EffectComponent?: React.ComponentType<EffectRendererProps>;
  typeDurationMs?: number;
  deleteDurationMs?: number;
  pauseAfterTypeMs?: number;
  animateMode?: "infinite" | "once";
  variant?: "dark" | "light";
}

/* ── TypewriterEffect ─────────────────────────────────────────────────────── */
export const TypewriterEffect: React.FC<EffectRendererProps> = ({
  text,
  isActive,
  allowDelete = true,
  typeDurationMs,
  deleteDurationMs,
  pauseAfterTypeMs,
  prefersReducedMotion,
  onDeleteComplete,
  containerRef,
  textColor = "rgba(0,0,0,0.5)",
  cursorColor = "rgba(0,0,0,0.5)",
}) => {
  const [phase, setPhase] = useState<"typing" | "paused" | "deleting">("typing");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setPhase("typing");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [text, isActive, allowDelete]);

  useEffect(() => {
    if (!isActive) {
      setPhase("typing");
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !prefersReducedMotion || !allowDelete) return;
    const t = window.setTimeout(() => onDeleteComplete?.(), Math.max(200, phase === "typing" ? typeDurationMs : pauseAfterTypeMs));
    timers.current.push(t);
    return () => timers.current.forEach(clearTimeout);
  }, [isActive, prefersReducedMotion, allowDelete, phase, pauseAfterTypeMs, typeDurationMs, onDeleteComplete]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement> | undefined}
      style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap", alignItems: "center" }}
    >
      {prefersReducedMotion ? (
        <span className="text-sm select-none" style={{ color: textColor }}>{text}</span>
      ) : (
        <motion.div
          key={text}
          initial={{ width: "0%" }}
          animate={phase === "typing" ? { width: "100%" } : phase === "deleting" ? { width: "0%" } : { width: "100%" }}
          transition={
            phase === "typing" ? { duration: typeDurationMs / 1000, ease: "linear" }
            : phase === "deleting" ? { duration: deleteDurationMs / 1000, ease: "linear" }
            : {}
          }
          onAnimationComplete={() => {
            if (phase === "typing") {
              setPhase("paused");
              if (allowDelete) {
                const t = window.setTimeout(() => setPhase("deleting"), pauseAfterTypeMs);
                timers.current.push(t);
              }
            } else if (phase === "deleting") {
              onDeleteComplete?.();
            }
          }}
          style={{ display: "inline-flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap" }}
        >
          <span className="text-sm select-none" style={{ color: textColor }}>{text}</span>
          <motion.span
            aria-hidden
            style={{ display: "inline-block", width: 1, marginLeft: 4, height: "1.1em", verticalAlign: "middle", background: cursorColor }}
            animate={phase === "typing" || phase === "paused" ? { opacity: [0, 1, 0] } : { opacity: 0 }}
            transition={phase === "typing" || phase === "paused" ? { repeat: Infinity, duration: 0.9, ease: "linear" } : { duration: 0.1 }}
          />
        </motion.div>
      )}
    </div>
  );
};

/* ── SlideEffect ──────────────────────────────────────────────────────────── */
export const SlideEffect: React.FC<EffectRendererProps> = ({
  text, isActive, allowDelete = true, typeDurationMs, deleteDurationMs,
  pauseAfterTypeMs, prefersReducedMotion, onDeleteComplete, containerRef,
  textColor = "rgba(0,0,0,0.5)",
}) => {
  const [phase, setPhase] = useState<"enter" | "pause" | "exit">("enter");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setPhase("enter");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [text, isActive, allowDelete]);

  useEffect(() => {
    if (!isActive) { setPhase("enter"); timers.current.forEach(clearTimeout); timers.current = []; }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div ref={containerRef as RefObject<HTMLDivElement> | undefined} style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap" }}>
      <motion.div
        key={text}
        initial={{ y: "-100%" }}
        animate={phase === "enter" ? { y: "0%" } : phase === "exit" ? { y: "100%" } : { y: "0%" }}
        transition={phase === "enter" ? { duration: typeDurationMs / 1000, ease: "easeOut" } : { duration: deleteDurationMs / 1000, ease: "easeIn" }}
        onAnimationComplete={() => {
          if (phase === "enter") {
            setPhase("pause");
            if (allowDelete) {
              const t = window.setTimeout(() => setPhase("exit"), pauseAfterTypeMs);
              timers.current.push(t);
            }
          } else if (phase === "exit") { onDeleteComplete?.(); }
        }}
        style={{ display: "inline-block" }}
      >
        <span className="text-sm select-none" style={{ color: textColor }}>{text}</span>
      </motion.div>
    </div>
  );
};

/* ── FadeEffect ───────────────────────────────────────────────────────────── */
export const FadeEffect: React.FC<EffectRendererProps> = ({
  text, isActive, allowDelete = true, typeDurationMs, deleteDurationMs,
  pauseAfterTypeMs, prefersReducedMotion, onDeleteComplete, containerRef,
  textColor = "rgba(0,0,0,0.5)",
}) => {
  const [phase, setPhase] = useState<"fadeIn" | "hold" | "fadeOut">("fadeIn");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setPhase("fadeIn");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [text, isActive, allowDelete]);

  useEffect(() => {
    if (!isActive) { setPhase("fadeIn"); timers.current.forEach(clearTimeout); timers.current = []; }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div ref={containerRef as RefObject<HTMLDivElement> | undefined} style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap" }}>
      <motion.div
        key={text}
        initial={{ opacity: 0 }}
        animate={phase === "fadeIn" ? { opacity: 1 } : phase === "fadeOut" ? { opacity: 0 } : { opacity: 1 }}
        transition={phase === "fadeIn" ? { duration: typeDurationMs / 1000 } : { duration: deleteDurationMs / 1000 }}
        onAnimationComplete={() => {
          if (phase === "fadeIn") {
            setPhase("hold");
            if (allowDelete) {
              const t = window.setTimeout(() => setPhase("fadeOut"), pauseAfterTypeMs);
              timers.current.push(t);
            }
          } else if (phase === "fadeOut") { onDeleteComplete?.(); }
        }}
        style={{ display: "inline-block" }}
      >
        <span className="text-sm select-none" style={{ color: textColor }}>{text}</span>
      </motion.div>
    </div>
  );
};

/* ── SuggestiveSearch Orchestrator ────────────────────────────────────────── */
export const SuggestiveSearch: React.FC<SuggestiveSearchProps> = ({
  onChange,
  suggestions = ["Search exercises...", "Try Bench Press", "Find workouts"],
  className,
  Leading = (props) => <Search className="size-4" style={{ color: props.color ?? "rgba(0,0,0,0.4)" }} />,
  showLeading = true,
  Trailing,
  showTrailing = false,
  effect = "typewriter",
  EffectComponent,
  typeDurationMs = 500,
  deleteDurationMs = 300,
  pauseAfterTypeMs = 1500,
  animateMode = "infinite",
  variant = "light",
}) => {
  const [search, setSearch] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const [index, setIndex] = useState<number>(0);
  const current = useMemo(() => suggestions[index] ?? "", [suggestions, index]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const leadingRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trailingRef = useRef<HTMLDivElement | null>(null);

  const [leftOffsetPx, setLeftOffsetPx] = useState<number | null>(null);
  const [rightOffsetPx, setRightOffsetPx] = useState<number | null>(null);
  const [measuredLongestTextPx, setMeasuredLongestTextPx] = useState<number | null>(null);
  const [availableTextAreaPx, setAvailableTextAreaPx] = useState<number | null>(null);

  const longestSuggestion = useMemo(
    () => suggestions.reduce((a, b) => (a.length > b.length ? a : b), ""),
    [suggestions]
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const lead = leadingRef.current;
    const trail = trailingRef.current;
    if (!wrapper) return;
    const update = () => {
      const cs = getComputedStyle(wrapper);
      const padLeft = parseFloat(cs.paddingLeft || "0");
      const padRight = parseFloat(cs.paddingRight || "0");
      const leadW = showLeading ? lead?.getBoundingClientRect().width ?? 0 : 0;
      const trailW = showTrailing ? trail?.getBoundingClientRect().width ?? 0 : 0;
      const left = padLeft + leadW + 8;
      setLeftOffsetPx(left);
      const right = padRight + trailW;
      setRightOffsetPx(right);
      const wrapperW = wrapper.getBoundingClientRect().width;
      setAvailableTextAreaPx(Math.max(0, wrapperW - left - right));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    if (lead) ro.observe(lead);
    if (trail) ro.observe(trail);
    return () => ro.disconnect();
  }, [showLeading, showTrailing]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || !longestSuggestion) { setMeasuredLongestTextPx(null); return; }
    const el = inputRef.current ?? wrapperRef.current;
    if (el) {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
    } else {
      ctx.font = "14px system-ui, sans-serif";
    }
    setMeasuredLongestTextPx(Math.ceil(ctx.measureText(longestSuggestion).width) + 8);
  }, [longestSuggestion]);

  const builtinMap: Record<BuiltinEffect, React.ComponentType<any>> = {
    typewriter: TypewriterEffect, slide: SlideEffect, fade: FadeEffect, none: () => null,
  };
  const ChosenEffect = EffectComponent ?? builtinMap[effect];

  const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const minWidthPx = measuredLongestTextPx != null && availableTextAreaPx != null
    ? Math.min(measuredLongestTextPx, availableTextAreaPx)
    : measuredLongestTextPx ?? undefined;

  const overlayActive = !search && !isFocused;
  const isLast = index === suggestions.length - 1;
  const allowDelete = animateMode === "infinite" ? true : !isLast;

  // Determine styling colors based on variant
  const isDark = variant === "dark";
  const bgColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.95)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.15)";
  const textColor = isDark ? "white" : "#2d3748";
  const placeholderColor = isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.45)";
  const shadowStyle = isDark ? "none" : "0 2px 10px rgba(0, 0, 0, 0.06)";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative flex items-center gap-x-2 py-2.5 px-4 rounded-full transition-all duration-300",
        className
      )}
      style={{
        maxWidth: "100%",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: shadowStyle,
        backdropFilter: "blur(6px)",
      }}
    >
      <div ref={leadingRef} className="flex-shrink-0 flex items-center justify-center">
        {showLeading && <Leading color={placeholderColor} />}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={search}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => { setSearch(e.target.value); onChange?.(e.target.value); }}
        className="bg-transparent outline-none text-sm w-full font-medium"
        placeholder=""
        aria-label="search exercises"
        style={{
          minWidth: minWidthPx != null ? `${minWidthPx}px` : undefined,
          color: textColor,
        }}
      />

      <div ref={trailingRef} className="flex-shrink-0">
        {showTrailing && Trailing && <Trailing />}
      </div>

      {overlayActive && (
        <div
          ref={overlayRef}
          aria-hidden
          style={{
            position: "absolute",
            left: leftOffsetPx != null ? `${leftOffsetPx}px` : "calc(0.75rem + 1rem + 8px)",
            right: rightOffsetPx != null ? `${rightOffsetPx}px` : "0.75rem",
            top: 0, bottom: 0,
            display: "flex", alignItems: "center",
            pointerEvents: "none", overflow: "hidden", whiteSpace: "nowrap",
          }}
        >
          <ChosenEffect
            text={current}
            isActive={overlayActive}
            allowDelete={allowDelete}
            typeDurationMs={typeDurationMs}
            deleteDurationMs={deleteDurationMs}
            pauseAfterTypeMs={pauseAfterTypeMs}
            prefersReducedMotion={prefersReduced}
            onDeleteComplete={() => setIndex((i) => (i + 1) % suggestions.length)}
            containerRef={overlayRef}
            textColor={placeholderColor}
            cursorColor={placeholderColor}
          />
        </div>
      )}
    </div>
  );
};

export default SuggestiveSearch;

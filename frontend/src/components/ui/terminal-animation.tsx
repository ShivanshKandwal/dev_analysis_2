import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Slot } from "@radix-ui/react-slot"
import { useControllableState } from "@radix-ui/react-use-controllable-state"

import { cn } from "@/lib/utils"

// Types
export interface TerminalLine {
  text: string
  color?: string
  delay?: number
}

export interface TabContent {
  label: string
  command: string
  lines: TerminalLine[]
}

export type TerminalAnimationRootProps = React.ComponentProps<"div"> & {
  tabs: TabContent[]
  defaultActiveTab?: number
  activeTab?: number
  onActiveTabChange?: (index: number) => void
  backgroundImage?: string
  alwaysDark?: boolean
  hideCursorOnComplete?: boolean
}

interface TerminalAnimationContextValue {
  activeTab: number
  setActiveTab: (index: number) => void
  commandTyped: string
  isTypingCommand: boolean
  showCursor: boolean
  visibleLines: number
  currentTab: TabContent
  tabs: TabContent[]
}

const TerminalAnimationContext = createContext<
  TerminalAnimationContextValue | undefined
>(undefined)

function useTerminalAnimationContext() {
  const ctx = useContext(TerminalAnimationContext)
  if (!ctx) {
    throw new Error(
      "TerminalAnimation components must be used within TerminalAnimationRoot"
    )
  }
  return ctx
}

export function TerminalAnimationRoot({
  tabs,
  defaultActiveTab = 0,
  activeTab: activeTabProp,
  onActiveTabChange,
  backgroundImage,
  alwaysDark = true,
  hideCursorOnComplete = true,
  className,
  children,
  ...props
}: TerminalAnimationRootProps) {
  const [activeTab, setActiveTab] = useControllableState({
    prop: activeTabProp,
    defaultProp: defaultActiveTab,
    onChange: onActiveTabChange,
  })

  const [visibleLines, setVisibleLines] = useState(0)
  const [commandTyped, setCommandTyped] = useState("")
  const [isTypingCommand, setIsTypingCommand] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout)
    timeoutRef.current = []
  }, [])

  const animateTab = useCallback(
    (tabIndex: number) => {
      clearTimeouts()
      setVisibleLines(0)
      setCommandTyped("")
      setIsTypingCommand(true)
      setShowCursor(true)

      const tab = tabs[tabIndex]
      if (!tab) {
        return
      }

      const command = tab.command
      let charIndex = 0

      const typeCommand = () => {
        if (charIndex <= command.length) {
          setCommandTyped(command.slice(0, charIndex))
          charIndex++
          const t = setTimeout(typeCommand, 25 + Math.random() * 35)
          timeoutRef.current.push(t)
        } else {
          const t = setTimeout(() => {
            setIsTypingCommand(false)
            showLines(0)
          }, 250)
          timeoutRef.current.push(t)
        }
      }

      const showLines = (lineIndex: number) => {
        if (lineIndex <= tab.lines.length) {
          setVisibleLines(lineIndex)
          if (lineIndex < tab.lines.length) {
            const delay = tab.lines[lineIndex].delay ?? 100
            const t = setTimeout(() => showLines(lineIndex + 1), delay)
            timeoutRef.current.push(t)
          } else if (hideCursorOnComplete) {
            const t = setTimeout(() => setShowCursor(false), 600)
            timeoutRef.current.push(t)
          }
        }
      }

      const t = setTimeout(typeCommand, 300)
      timeoutRef.current.push(t)
    },
    [clearTimeouts, hideCursorOnComplete, tabs]
  )

  useEffect(() => {
    animateTab(activeTab)
    return clearTimeouts
  }, [activeTab, animateTab, clearTimeouts])

  const currentTab = tabs[activeTab] ?? tabs[0]
  const safeActiveTab = Math.min(activeTab, tabs.length - 1)

  const value: TerminalAnimationContextValue = {
    activeTab: safeActiveTab,
    setActiveTab,
    commandTyped,
    isTypingCommand,
    showCursor,
    visibleLines,
    currentTab,
    tabs,
  }

  return (
    <TerminalAnimationContext.Provider value={value}>
      <div
        className={cn(alwaysDark && "dark", className)}
        data-slot="terminal-animation-root"
        {...props}
      >
        {children}
      </div>
    </TerminalAnimationContext.Provider>
  )
}

export function TerminalAnimationContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative w-full", className)}
      data-slot="terminal-animation-container"
      {...props}
    />
  )
}

export function TerminalAnimationWindow({
  className,
  backgroundColor,
  minHeight = "16rem",
  style,
  ...props
}: React.ComponentProps<"div"> & { minHeight?: string; backgroundColor?: string }) {
  return (
    <div
      className={cn("relative flex flex-col overflow-hidden rounded-t-xl bg-slate-900/90 border border-white/5", className)}
      data-slot="terminal-animation-window"
      style={
        backgroundColor
          ? { backgroundColor, minHeight, ...style }
          : { minHeight, ...style }
      }
      {...props}
    />
  )
}

export function TerminalAnimationContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex-1 px-4 py-4 font-mono text-xs text-left", className)}
      data-slot="terminal-animation-content"
      {...props}
    />
  )
}

export function TerminalAnimationCommandBar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { commandTyped, isTypingCommand, showCursor } =
    useTerminalAnimationContext()

  return (
    <div
      className={cn("text-emerald-400 font-semibold", className)}
      data-slot="terminal-animation-command"
      {...props}
    >
      <span className="text-slate-500 mr-2">$</span>
      {commandTyped}
      {isTypingCommand && showCursor && <span className="animate-pulse">▌</span>}
    </div>
  )
}

export function TerminalAnimationOutputLine({
  line,
  visible,
  className,
  ...props
}: React.ComponentProps<"div"> & { line: TerminalLine; visible: boolean }) {
  if (!visible) {
    return null
  }
  return (
    <div
      className={cn("text-slate-300 mt-1", className)}
      data-slot="terminal-animation-output-line"
      {...props}
    >
      <span className={line.color}>{line.text || "\u00A0"}</span>
    </div>
  )
}

export function TerminalAnimationOutput({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isTypingCommand, visibleLines, currentTab, activeTab } =
    useTerminalAnimationContext()

  if (isTypingCommand) {
    return null
  }

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className={className}
      data-slot="terminal-animation-output"
      role="log"
      {...props}
    >
      {currentTab.lines.map((line, i) => {
        const visible = i < visibleLines
        const key = `${activeTab}-${i}`
        return (
          <TerminalAnimationOutputLine
            key={key}
            line={line}
            visible={visible}
          />
        )
      })}
    </div>
  )
}

export function TerminalAnimationTabList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-label="Terminal commands"
      className={cn("flex border-b border-white/5 bg-slate-950/40 px-4 py-1", className)}
      data-slot="terminal-animation-tab-list"
      role="tablist"
      {...props}
    />
  )
}

export function TerminalAnimationTabTrigger({
  index,
  asChild = false,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { index: number; asChild?: boolean }) {
  const { activeTab, setActiveTab } = useTerminalAnimationContext()
  const isActive = activeTab === index

  const triggerProps = {
    role: "tab" as const,
    "aria-selected": isActive,
    "data-state": isActive ? "active" : "inactive",
    onClick: () => setActiveTab(index),
    children,
  }

  if (asChild) {
    return <Slot {...triggerProps} {...props} className={className} />
  }

  return (
    <button
      data-slot="terminal-animation-tab-trigger"
      type="button"
      className={cn(
        "px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer",
        isActive ? "text-white border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-350",
        className
      )}
      {...triggerProps}
      {...props}
    />
  )
}

export function useTerminalAnimation() {
  return useTerminalAnimationContext()
}

import type React from "react"
import { cn } from "@/lib/utils"

interface SidebarItem {
  icon?: React.ReactNode
  label: string
  active?: boolean
  badge?: string | number
}

interface WindowControlsProps {
  variant?: "macos" | "windows" | "chrome" | "safari"
  headerStyle?: "minimal" | "full"
}

interface AddressBarProps {
  url?: string
  secure?: boolean
  variant?: "chrome" | "safari"
  className?: string
}

interface SidebarContentProps {
  items?: SidebarItem[]
  variant?: "navigation" | "bookmarks" | "history" | "extensions"
  className?: string
}

interface BrowserWindowProps {
  children?: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showSidebar?: boolean
  sidebarPosition?: "left" | "right" | "top" | "bottom"
  headerStyle?: "minimal" | "full"
  variant?: "chrome" | "safari" | "generic"
  theme?: "light" | "dark" | "auto"
  url?: string
  sidebarItems?: Array<{
    icon?: React.ReactNode
    label: string
    active?: boolean
    badge?: string | number
  }>
}

function WindowControls({
  variant = "macos",
  headerStyle = "full",
}: WindowControlsProps) {
  const sizeClasses = "size-2"

  if (variant === "macos" || variant === "safari") {
    const dotColors =
      headerStyle === "minimal"
        ? {
            red: "bg-muted border border-foreground/20",
            yellow: "bg-muted border border-foreground/20",
            green: "bg-muted border border-foreground/20",
          }
        : {
            red: "bg-red-500 hover:bg-red-600 border border-foreground/20",
            yellow:
              "bg-yellow-500 hover:bg-yellow-600 border border-foreground/20",
            green:
              "bg-green-500 hover:bg-green-600 border border-foreground/20 ",
          }

    return (
      <div className="flex gap-2">
        <div
          className={cn(
            sizeClasses,
            "rounded-full",
            dotColors.red,
            "transition-colors cursor-pointer flex items-center justify-center group"
          )}
        >
          {headerStyle !== "minimal" && (
            <div className="w-1.5 h-0.5 bg-red-900/60 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          )}
        </div>
        <div
          className={cn(
            sizeClasses,
            "rounded-full",
            dotColors.yellow,
            "transition-colors cursor-pointer flex items-center justify-center group"
          )}
        >
          {headerStyle !== "minimal" && (
            <div className="w-1.5 h-0.5 bg-yellow-900/60 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          )}
        </div>
        <div
          className={cn(
            sizeClasses,
            "rounded-full",
            dotColors.green,
            "transition-colors cursor-pointer flex items-center justify-center group"
          )}
        >
          {headerStyle !== "minimal" && (
            <div className="w-1 h-1 border border-green-900/60 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          )}
        </div>
      </div>
    )
  }

  if (variant === "windows") {
    return (
      <div className="flex gap-1">
        <div className="w-6 h-4 bg-muted/50 hover:bg-muted transition-colors cursor-pointer flex items-center justify-center">
          <div className="w-2 h-0.5 bg-foreground/60"></div>
        </div>
        <div className="w-6 h-4 bg-muted/50 hover:bg-muted transition-colors cursor-pointer flex items-center justify-center">
          <div className="w-2 h-2 border border-foreground/60"></div>
        </div>
        <div className="w-6 h-4 bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer flex items-center justify-center relative">
          <div className="w-2 h-0.5 bg-white rotate-45"></div>
          <div className="w-2 h-0.5 bg-white -rotate-45 absolute"></div>
        </div>
      </div>
    )
  }

  if (variant === "chrome") {
    return (
      <div className="flex gap-1.5">
        <div
          className={cn(
            sizeClasses,
            "rounded-full bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
          )}
        ></div>
        <div
          className={cn(
            sizeClasses,
            "rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"
          )}
        ></div>
        <div
          className={cn(
            sizeClasses,
            "rounded-full bg-green-500 hover:bg-green-600 transition-colors cursor-pointer"
          )}
        ></div>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      <div
        className={`${sizeClasses} rounded-full border border-foreground/20 bg-foreground/10`}
      ></div>
      <div
        className={`${sizeClasses} rounded-full border border-foreground/20 bg-foreground/10`}
      ></div>
      <div
        className={`${sizeClasses} rounded-full border border-foreground/20 bg-foreground/10`}
      ></div>
    </div>
  )
}

function AddressBar({
  url = "https://example.com",
  secure = true,
  variant = "chrome",
  className = "",
}: AddressBarProps) {
  const variantStyles = {
    chrome:
      "bg-slate-900/40 rounded-full border border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-sm",
    safari:
      "bg-slate-900/30 rounded-lg border border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-sm",
  }

  return (
    <div className={`flex-1 flex justify-center ${className}`}>
      <div
        className={`${variantStyles[variant]} px-4 py-2 text-xs text-slate-400 min-w-[200px] max-w-md flex items-center gap-2 transition-colors`}
      >
        {secure && (
          <div className="w-3 h-3 text-slate-500">
            <svg viewBox="0 0 12 12" fill="currentColor">
              <title>Secure</title>
              <path d="M6 1a2.5 2.5 0 0 1 2.5 2.5V5h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h.5V3.5A2.5 2.5 0 0 1 6 1z" />
            </svg>
          </div>
        )}
        <span className="truncate">{url}</span>
      </div>
    </div>
  )
}

function SidebarContent({
  items = [
    { label: "Dashboard", active: true },
    { label: "Analytics", badge: "3" },
    { label: "Settings" },
    { label: "Profile" },
  ],
  className = "",
}: SidebarContentProps) {
  return (
    <div className={`p-3 space-y-1 ${className}`}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer
            ${
              item.active
                ? "bg-indigo-650/15 text-indigo-400 border border-indigo-500/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }
          `}
        >
          {item.icon && (
            <div className="w-4 h-4 flex-shrink-0">{item.icon}</div>
          )}
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <div className="bg-indigo-500/10 text-indigo-400 text-xs px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
              {item.badge}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function BrowserWindow({
  children,
  className = "",
  size = "md",
  showSidebar = false,
  sidebarPosition = "left",
  headerStyle = "minimal",
  variant = "generic",
  theme = "dark",
  url,
  sidebarItems,
}: BrowserWindowProps) {
  const sizeClasses = {
    sm: "h-64 max-w-sm",
    md: "h-80 max-w-2xl",
    lg: "h-96 max-w-4xl",
    xl: "h-[32rem] max-w-6xl",
  }

  const sidebarSizes = {
    sm: "w-32",
    md: "w-48",
    lg: "w-56",
    xl: "w-64",
  }

  const getHeaderStyles = () => {
    const baseStyles =
      "h-11 border-b border-white/5 flex items-center px-4"

    if (variant === "chrome") {
      return `${baseStyles} bg-slate-900/10 overflow-hidden`
    }

    if (variant === "safari") {
      return `${baseStyles} bg-slate-900/10 overflow-hidden border-b border-white/10`
    }

    return `${baseStyles} bg-slate-900/20`
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col",
        className
      )}
    >
      <div className={getHeaderStyles()}>
        <WindowControls
          variant={variant === "generic" ? "macos" : variant}
          headerStyle={headerStyle}
        />

        {headerStyle === "full" && (
          <AddressBar
            url={url}
            variant={variant === "generic" ? "chrome" : variant}
            className="ml-4"
          />
        )}
      </div>

      {showSidebar && sidebarPosition === "top" && (
        <div className="border-b border-white/5 bg-slate-900/20 h-16">
          <SidebarContent
            items={sidebarItems}
            variant="navigation"
            className="flex-row"
          />
        </div>
      )}

      <div className="flex flex-1 h-0">
        {/* Left Sidebar */}
        {showSidebar && sidebarPosition === "left" && (
          <div
            className={`border-r border-white/5 bg-slate-900/20 ${sidebarSizes[size]} flex-shrink-0 h-full`}
          >
            <SidebarContent items={sidebarItems} />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative min-w-0 h-full">
          {children}
        </div>

        {/* Right Sidebar */}
        {showSidebar && sidebarPosition === "right" && (
          <div
            className={`border-l border-white/5 bg-slate-900/20 ${sidebarSizes[size]} flex-shrink-0 h-full`}
          >
            <SidebarContent items={sidebarItems} />
          </div>
        )}
      </div>

      {/* Bottom Sidebar */}
      {showSidebar && sidebarPosition === "bottom" && (
        <div className="border-t border-white/5 bg-slate-900/20 h-16">
          <SidebarContent
            items={sidebarItems}
            variant="navigation"
            className="flex-row"
          />
        </div>
      )}
    </div>
  )
}
export default BrowserWindow;

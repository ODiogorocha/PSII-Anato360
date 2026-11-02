import { useState } from "react"

import type { Language, Theme, View, UserStats, AppUser } from "../lib/types"

import { tr } from "../lib/translations"

interface Props {
  lang: Language

  theme: Theme

  user: AppUser

  view: View

  stats: UserStats

  isAdmin: boolean

  onNavigate: (v: View) => void

  onToggleLang: () => void

  onToggleTheme: () => void

  onLogout: () => void
}

export default function Navbar({
  lang,
  theme,
  user,
  view,
  stats,
  isAdmin,

  onNavigate,
  onToggleLang,
  onToggleTheme,
  onLogout,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems: { id: View label: string adminOnly?: boolean }[] = [
    { id: "dashboard", label: tr(lang, "nav_dashboard") },

    { id: "quiz", label: tr(lang, "nav_quiz") },

    { id: "progress", label: tr(lang, "nav_progress") },

    { id: "images", label: tr(lang, "nav_images") },

    { id: "admin", label: tr(lang, "nav_admin"), adminOnly: true },
  ]

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  const renderNavItems = (mobile = false) =>
    visibleNavItems.map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onNavigate(item.id)

          setIsMenuOpen(false)
        }}
        aria-current={view === item.id ? "page" : undefined}
        className={`${
          mobile ? "w-full justify-start" : ""
        } min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]`}
        style={{
          background: view === item.id ? "var(--muted)" : "transparent",

          color: view === item.id ? "var(--primary)" : "var(--muted-fg)",
        }}
      >
        {item.adminOnly && <span className="text-xs">🎓</span>}
        {item.label}
      </button>
    ))

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex min-h-16 items-center px-3 sm:px-4 md:px-6"
      style={{
        background: "var(--card)",

        borderBottom: "1px solid var(--border)",

        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <button
        type="button"
        className="min-h-11 shrink-0 rounded-lg pr-3 font-display text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] md:mr-4"
        style={{ color: "var(--primary)" }}
        onClick={() => {
          onNavigate("dashboard")
          setIsMenuOpen(false)
        }}
      >
        Anato360
      </button>

      {/* Nav links */}
      <nav
        aria-label="Navegação principal"
        className="hidden flex-1 items-center gap-1 md:flex"
      >
        {renderNavItems()}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-label={tr(lang, isMenuOpen ? "nav_menu_close" : "nav_menu_open")}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xl transition hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] md:hidden"
          style={{ color: "var(--muted-fg)" }}
        >
          {isMenuOpen ? "×" : "☰"}
        </button>

        {/* Score badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold font-mono-data"
          style={{ background: "var(--muted)", color: "var(--primary)" }}
        >
          <span>★</span>
          <span>{stats.totalPoints.toLocaleString()}</span>
        </div>

        {/* Language toggle */}
        <button
          onClick={onToggleLang}
          className="min-h-11 min-w-11 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          style={{ borderColor: "var(--border)", color: "var(--muted-fg)" }}
        >
          {lang === "pt" ? "ES" : "PT"}
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="min-h-11 min-w-11 rounded-lg flex items-center justify-center text-base transition-all hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          style={{ color: "var(--muted-fg)" }}
          aria-label="Toggle theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div
            className="hidden h-8 w-8 rounded-full sm:flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {initials}
          </div>
          <button
            onClick={onLogout}
            className="hidden min-h-11 px-2 text-xs hover:underline transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] md:block"
            style={{ color: "var(--muted-fg)" }}
          >
            {tr(lang, "nav_logout")}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          aria-label="Navegação principal"
          className="absolute left-0 right-0 top-full flex flex-col gap-1 border-b p-3 shadow-lg md:hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          {renderNavItems(true)}
          <button
            type="button"
            onClick={() => {
              onLogout()

              setIsMenuOpen(false)
            }}
            className="min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            style={{ color: "var(--muted-fg)" }}
          >
            {tr(lang, "nav_logout")}
          </button>
        </nav>
      )}
    </header>
  )
}

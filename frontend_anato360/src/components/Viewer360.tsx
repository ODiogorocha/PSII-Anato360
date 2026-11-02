import { useRef, useState, useCallback } from "react"

import type { PointerEvent as ReactPointerEvent } from "react"

import type { Language } from "../lib/types"

import { tr } from "../lib/translations"

interface Props {
  imageUrl: string

  imageAlt: string

  marker: { x: number y: number }

  lang: Language
}

export default function Viewer360({ imageUrl, imageAlt, marker, lang }: Props) {
  const [rotY, setRotY] = useState(0)

  const [zoom, setZoom] = useState(1)

  const [isDragging, setIsDragging] = useState(false)

  const [hasInteracted, setHasInteracted] = useState(false)

  const startX = useRef(0)

  const startRotY = useRef(0)

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)

    setIsDragging(true)

    setHasInteracted(true)

    startX.current = event.clientX

    startRotY.current = rotY
  }

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return

      const delta = (event.clientX - startX.current) * 0.6

      setRotY((prev) => {
        const next = startRotY.current + delta

        return Math.max(-60, Math.min(60, next))
      })
    },

    [isDragging],
  )

  const endDrag = () => setIsDragging(false)

  const changeZoom = (amount: number) => {
    setZoom((current) =>
      Math.min(2.5, Math.max(1, Number((current + amount).toFixed(1)))),
    )

    setHasInteracted(true)
  }

  const resetView = () => {
    setRotY(0)

    setZoom(1)

    setHasInteracted(true)
  }

  // Normalize rotation to 0-360 for display

  const displayAngle = Math.round(((rotY + 60) / 120) * 180)

  // Parallax shift on the marker

  const markerShiftX = rotY * 0.15

  const markerShiftY = rotY * 0.04

  const markerX = Math.max(5, Math.min(90, marker.x + markerShiftX))

  const markerY = Math.max(5, Math.min(90, marker.y + markerShiftY))

  // Simulate depth compression at extreme angles

  const scaleX = 1 - Math.abs(rotY) * 0.003

  return (
    <div
      className="relative select-none rounded-2xl overflow-hidden"
      style={{
        cursor: isDragging ? "grabbing" : "grab",

        background: "var(--muted)",

        aspectRatio: "4/3",

        touchAction: "none",
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Image with 3D rotation */}
      <div
        className="absolute inset-0"
        style={{
          perspective: "900px",

          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) rotateY(${rotY}deg)`,

            transition: isDragging
              ? "none"
              : "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",

            transformOrigin: "center center",
          }}
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
            className="h-full w-full object-cover"
            style={{
              transform: `scaleX(${scaleX})`,
              transformOrigin: "center center",
            }}
          />

          {/* Structure marker */}
          <div
            className="absolute pointer-events-none transition-all duration-75"
            style={{ left: `${markerX}%`, top: `${markerY}%` }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  width: "28px",

                  height: "28px",

                  background: "var(--accent)",

                  opacity: 0.35,

                  transform: "translate(-25%, -25%)",
                }}
              />
              <div
                className="h-5 w-5 rounded-full border-2 border-white shadow-lg"
                style={{ background: "var(--accent)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gradient overlay for depth effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(${
            rotY > 0 ? "to right" : "to left"
          }, rgba(0,0,0,${Math.abs(rotY) * 0.004}) 0%, transparent 40%)`,
        }}
      />

      <div
        className="absolute right-2 top-2 z-10 flex items-center gap-1.5 sm:right-3 sm:top-3"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => changeZoom(0.25)}
          disabled={zoom >= 2.5}
          aria-label={tr(lang, "zoomIn")}
          title={tr(lang, "zoomIn")}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-black/70 text-xl font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => changeZoom(-0.25)}
          disabled={zoom <= 1}
          aria-label={tr(lang, "zoomOut")}
          title={tr(lang, "zoomOut")}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-black/70 text-xl font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label={tr(lang, "resetView")}
          title={tr(lang, "resetView")}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-black/70 text-sm font-semibold text-white hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          ↺
        </button>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
        {/* Rotation indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-data"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          <span>↔</span>
          <span>{displayAngle}°</span>
        </div>

        <div
          className="rounded-full px-2.5 py-1 text-xs font-mono-data"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          {tr(lang, "zoomLevel")} {Math.round(zoom * 100)}%
        </div>

        {/* Hint */}
        {!hasInteracted && (
          <div
            className="px-3 py-1 rounded-full text-xs"
            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
          >
            {lang === "pt" ? "Arraste para girar" : "Arrastre para girar"}
          </div>
        )}

        {/* 360° badge */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          360°
        </div>
      </div>
    </div>
  )
}

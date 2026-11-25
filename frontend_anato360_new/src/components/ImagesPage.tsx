import { useState } from "react"

import type { AnatomySystem, Language, Question } from "../lib/types"

import { tr, systemName } from "../lib/translations"

import { questions } from "../lib/quizData"

import Viewer360 from "./Viewer360"

interface Props {
  lang: Language
}

const SYSTEMS: AnatomySystem[] = [
  "all",

  "skeletal",

  "muscular",

  "digestive",

  "respiratory",

  "circulatory",
]

export default function ImagesPage({ lang }: Props) {
  const [system, setSystem] = useState<AnatomySystem>("all")

  const [selectedId, setSelectedId] = useState<string>(questions[0]?.id ?? "")

  const filteredQuestions = questions.filter(
    (question) => system === "all" || question.system === system,
  )

  const selectedQuestion: Question | undefined =
    filteredQuestions.find((question) => question.id === selectedId) ??
    filteredQuestions[0]

  const correctAnswer = selectedQuestion
    ? lang === "pt"
      ? selectedQuestion.correct_pt
      : selectedQuestion.correct_es
    : ""

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1
          className="font-display text-3xl sm:text-4xl"
          style={{ color: "var(--fg)" }}
        >
          {tr(lang, "imageGalleryTitle")}
        </h1>
        <p
          className="mt-2 text-sm sm:text-base"
          style={{ color: "var(--muted-fg)" }}
        >
          {tr(lang, "imageGallerySub")}
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-2 sm:max-w-sm">
        <label
          htmlFor="image-system-filter"
          className="text-sm font-medium"
          style={{ color: "var(--fg)" }}
        >
          {tr(lang, "filterSystem")}
        </label>
        <select
          id="image-system-filter"
          value={system}
          onChange={(event) => {
            setSystem(
              SYSTEMS.find((item) => item === event.target.value) ?? "all",
            )

            setSelectedId("")
          }}
          className="min-h-11 rounded-xl border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--fg)",
          }}
        >
          {SYSTEMS.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? tr(lang, "allSystems") : systemName(lang, item)}
            </option>
          ))}
        </select>
      </div>

      {filteredQuestions.length === 0 ? (
        <p
          className="rounded-xl p-6 text-center"
          style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
        >
          {tr(lang, "noData")}
        </p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredQuestions.map((question) => {
              const label =
                lang === "pt" ? question.imageAlt_pt : question.imageAlt_es

              const isSelected = selectedQuestion?.id === question.id

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setSelectedId(question.id)}
                  aria-pressed={isSelected}
                  aria-label={`${tr(lang, "selectImage")}: ${label}`}
                  className="min-h-36 overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2"
                  style={{
                    background: "var(--card)",

                    borderColor: isSelected
                      ? "var(--primary)"
                      : "var(--border)",

                    boxShadow: isSelected
                      ? "0 0 0 2px var(--primary)"
                      : undefined,
                  }}
                >
                  <img
                    src={question.imageUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <span className="block p-3">
                    <span
                      className="block text-sm font-semibold"
                      style={{ color: "var(--fg)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="mt-1 block text-xs"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {systemName(lang, question.system)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {selectedQuestion && (
            <section
              aria-labelledby="selected-image-title"
              className="grid items-start gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(15rem,0.7fr)]"
            >
              <Viewer360
                key={selectedQuestion.id}
                imageUrl={selectedQuestion.imageUrl}
                imageAlt={
                  lang === "pt"
                    ? selectedQuestion.imageAlt_pt
                    : selectedQuestion.imageAlt_es
                }
                marker={selectedQuestion.marker}
                lang={lang}
              />
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <h2
                  id="selected-image-title"
                  className="font-display text-xl"
                  style={{ color: "var(--fg)" }}
                >
                  {tr(lang, "selectedImage")}
                </h2>
                <p
                  className="mt-3 text-sm"
                  style={{ color: "var(--muted-fg)" }}
                >
                  {lang === "pt"
                    ? selectedQuestion.imageAlt_pt
                    : selectedQuestion.imageAlt_es}
                </p>
                <p
                  className="mt-4 text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--muted-fg)" }}
                >
                  {tr(lang, "targetStructure")}
                </p>
                <p
                  className="mt-1 text-lg font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {correctAnswer}
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

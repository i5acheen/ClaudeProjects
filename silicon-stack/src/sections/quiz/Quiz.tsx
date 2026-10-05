import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react'
import { quiz, quizVerdicts, sectionIntros } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'

export function Quiz() {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null))
  const [done, setDone] = useState(false)
  const nextRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const q = quiz[index]
  const chosen = answers[index]
  const answered = chosen !== null
  const score = answers.filter((a, i) => a === quiz[i].answer).length

  useEffect(() => {
    if (answered) nextRef.current?.focus()
  }, [answered])

  const choose = (i: number) => {
    if (answered) return
    setAnswers((prev) => prev.map((a, k) => (k === index ? i : a)))
  }

  const next = () => {
    if (index < quiz.length - 1) {
      setIndex(index + 1)
      requestAnimationFrame(() => headingRef.current?.focus())
    } else {
      setDone(true)
    }
  }

  const restart = () => {
    setAnswers(quiz.map(() => null))
    setIndex(0)
    setDone(false)
  }

  const verdict = quizVerdicts.find((v) => score >= v.min)!

  return (
    <Section id="quiz">
      <div className="container-x">
        <SectionHeading id="quiz-title" {...sectionIntros.quiz} />

        <div className="card mx-auto max-w-3xl p-6 md:p-10">
          {/* progress */}
          <div className="mb-8 flex gap-1.5" aria-hidden="true">
            {quiz.map((item, i) => {
              const a = answers[i]
              const bg = a === null ? (i === index && !done ? 'bg-white/30' : 'bg-white/10') : a === item.answer ? 'bg-teal' : 'bg-rose-400'
              return <span key={item.id} className={`h-1.5 flex-1 rounded-full transition-colors ${bg}`} />
            })}
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
                <p className="text-sm font-medium text-faint">
                  Question {index + 1} of {quiz.length}
                </p>
                <h3 ref={headingRef} tabIndex={-1} id="quiz-question" className="mt-2 text-2xl font-semibold leading-snug text-fg outline-none md:text-3xl">
                  {q.question}
                </h3>

                <ul className="mt-6 grid gap-3" role="list" aria-labelledby="quiz-question">
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.answer
                    const isChosen = i === chosen
                    let style = 'border-line hover:border-white/25 hover:bg-white/[0.03]'
                    if (answered && isCorrect) style = 'border-teal/70 bg-teal/10'
                    else if (answered && isChosen) style = 'border-rose-400/70 bg-rose-400/10'
                    else if (answered) style = 'border-line opacity-60'
                    return (
                      <li key={opt}>
                        <button
                          type="button"
                          onClick={() => choose(i)}
                          aria-disabled={answered}
                          className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left text-lg transition-colors ${style} ${answered ? 'cursor-default' : ''}`}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-sm font-semibold text-muted">
                            {answered && isCorrect ? <Check className="size-4 text-teal" aria-label="Correct answer" /> : answered && isChosen ? <X className="size-4 text-rose-400" aria-label="Your answer" /> : String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-fg">{opt}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>

                <div aria-live="polite">
                  {answered && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <p className="text-muted">
                        <span className={`font-semibold ${chosen === q.answer ? 'text-teal' : 'text-rose-300'}`}>{chosen === q.answer ? 'Correct. ' : 'Not quite. '}</span>
                        {q.explanation}
                      </p>
                      <button
                        ref={nextRef}
                        type="button"
                        onClick={next}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-cyan px-5 py-2.5 font-semibold text-ink hover:bg-cyan/90"
                      >
                        {index < quiz.length - 1 ? 'Next question' : 'See my score'}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center" aria-live="polite">
                <Trophy className="mx-auto size-10 text-amber" aria-hidden="true" />
                <p className="mt-4 text-6xl font-semibold tabular-nums text-fg">
                  {score}
                  <span className="text-3xl text-faint">/{quiz.length}</span>
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-fg">{verdict.title}</h3>
                <p className="mx-auto mt-2 max-w-md text-muted">{verdict.body}</p>

                <ul className="mx-auto mt-8 max-w-xl space-y-2 text-left">
                  {quiz.map((item, i) => {
                    const ok = answers[i] === item.answer
                    return (
                      <li key={item.id} className="flex gap-3 rounded-xl border border-line p-3 text-sm">
                        {ok ? <Check className="mt-0.5 size-4 shrink-0 text-teal" aria-label="Correct" /> : <X className="mt-0.5 size-4 shrink-0 text-rose-400" aria-label="Incorrect" />}
                        <span>
                          <span className="block text-fg">{item.question}</span>
                          <span className="block text-muted">Answer: {item.options[item.answer]}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <button type="button" onClick={restart} className="mt-8 inline-flex items-center gap-2 rounded-full border border-cyan/50 px-5 py-2.5 font-semibold text-cyan hover:bg-cyan/10">
                  <RotateCcw className="size-4" aria-hidden="true" /> Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { buildLevels, dailyPuzzle, type Puzzle } from './sudoku'
import './App.css'

type Theme = {
  id: string
  name: string
  primary: string
  secondary: string
  mode: 'light' | 'dark'
}

type Snapshot = {
  cells: string[]
  notes: string[][]
}

type GameState = Snapshot & {
  puzzleId: string
  selected: number | null
  history: Snapshot[]
  seconds: number
  mistakes: number
  completed: boolean
  noteMode: boolean
}

const TEXT = {
  appName: '\u6570\u72ec',
  eyebrow: 'Sudoku PWA',
  levels: '\u5173\u5361',
  daily: '\u6bcf\u65e5',
  restart: '\u91cd\u5f00',
  note: '\u7b14\u8bb0',
  undo: '\u64a4\u9500',
  erase: '\u6e05\u9664',
  hint: '\u63d0\u793a',
  mistakes: '\u9519',
  done: '\u5b8c\u6210',
  timeUsed: '\u7528\u65f6',
}

const THEMES: Theme[] = [
  { id: 'orange', name: '\u767d\u6a59', primary: '#f27524', secondary: '#fff4e8', mode: 'light' },
  { id: 'gold', name: '\u58a8\u91d1', primary: '#d5ab58', secondary: '#211f1a', mode: 'dark' },
  { id: 'teal', name: '\u6d77\u76d0', primary: '#179a91', secondary: '#e6fbf6', mode: 'light' },
  { id: 'berry', name: '\u8393\u7ea2', primary: '#c83f68', secondary: '#fff0f5', mode: 'light' },
  { id: 'cyan', name: '\u9752\u84dd', primary: '#38bddb', secondary: '#10272f', mode: 'dark' },
]

const STORAGE_KEY = 'sudoku-pwa-state-v1'
const LEVELS = buildLevels()

function readPreferences() {
  const fallback = { mode: 'levels' as const, levelIndex: 0, themeId: THEMES[0].id }
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return fallback
  try {
    const parsed = JSON.parse(saved) as { themeId?: string; mode?: 'levels' | 'daily'; levelIndex?: number }
    return {
      mode: parsed.mode ?? fallback.mode,
      levelIndex:
        typeof parsed.levelIndex === 'number' ? Math.min(29, Math.max(0, parsed.levelIndex)) : fallback.levelIndex,
      themeId: parsed.themeId ?? fallback.themeId,
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return fallback
  }
}

function readSavedGame(puzzle: Puzzle): GameState {
  const saved = localStorage.getItem(`${STORAGE_KEY}-${puzzle.id}-game`)
  if (!saved) return emptyGame(puzzle)
  try {
    const parsed = JSON.parse(saved) as GameState
    return parsed.puzzleId === puzzle.id ? parsed : emptyGame(puzzle)
  } catch {
    localStorage.removeItem(`${STORAGE_KEY}-${puzzle.id}-game`)
    return emptyGame(puzzle)
  }
}

function emptyGame(puzzle: Puzzle): GameState {
  return {
    puzzleId: puzzle.id,
    cells: puzzle.givens.split('').map((cell) => (cell === '0' ? '' : cell)),
    notes: Array.from({ length: 81 }, () => []),
    selected: null,
    history: [],
    seconds: 0,
    mistakes: 0,
    completed: false,
    noteMode: false,
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function isPeer(a: number, b: number) {
  const rowA = Math.floor(a / 9)
  const colA = a % 9
  const rowB = Math.floor(b / 9)
  const colB = b % 9
  const sameBox =
    Math.floor(rowA / 3) === Math.floor(rowB / 3) && Math.floor(colA / 3) === Math.floor(colB / 3)
  return rowA === rowB || colA === colB || sameBox
}

function App() {
  const [preferences] = useState(readPreferences)
  const [mode, setMode] = useState<'levels' | 'daily'>(preferences.mode)
  const [levelIndex, setLevelIndex] = useState(preferences.levelIndex)
  const [themeId, setThemeId] = useState(preferences.themeId)
  const puzzle = useMemo(() => (mode === 'daily' ? dailyPuzzle() : LEVELS[levelIndex]), [levelIndex, mode])
  const [game, setGame] = useState(() => readSavedGame(puzzle))
  const theme = THEMES.find((item) => item.id === themeId) ?? THEMES[0]
  const givens = puzzle.givens
  const progress = LEVELS.filter((level) => localStorage.getItem(`${STORAGE_KEY}-${level.id}`) === 'done').length

  useEffect(() => {
    let active = true
    window.setTimeout(() => {
      if (active) setGame(readSavedGame(puzzle))
    }, 0)
    return () => {
      active = false
    }
  }, [puzzle])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, mode, levelIndex }))
  }, [levelIndex, mode, themeId])

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-${puzzle.id}-game`, JSON.stringify(game))
  }, [game, puzzle.id])

  useEffect(() => {
    if (game.completed) return
    const timer = window.setInterval(() => {
      setGame((current) => ({ ...current, seconds: current.seconds + 1 }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [game.completed])

  function commit(next: Partial<GameState>) {
    setGame((current) => ({
      ...current,
      ...next,
      history: [...current.history, { cells: current.cells, notes: current.notes }].slice(-80),
    }))
  }

  function selectPuzzle(nextMode: 'levels' | 'daily', index = levelIndex) {
    setMode(nextMode)
    setLevelIndex(index)
  }

  function enterNumber(number: string) {
    if (game.selected === null || game.completed || givens[game.selected] !== '0') return
    const index = game.selected
    const cells = [...game.cells]
    const notes = game.notes.map((item) => [...item])

    if (game.noteMode) {
      notes[index] = notes[index].includes(number)
        ? notes[index].filter((item) => item !== number)
        : [...notes[index], number].sort()
      commit({ notes })
      return
    }

    cells[index] = cells[index] === number ? '' : number
    notes[index] = []
    const wrong = number !== puzzle.solution[index]
    const completed = cells.join('') === puzzle.solution
    if (completed) localStorage.setItem(`${STORAGE_KEY}-${puzzle.id}`, 'done')
    commit({ cells, notes, mistakes: game.mistakes + (wrong ? 1 : 0), completed })
  }

  function erase() {
    if (game.selected === null || givens[game.selected] !== '0') return
    const cells = [...game.cells]
    const notes = game.notes.map((item) => [...item])
    cells[game.selected] = ''
    notes[game.selected] = []
    commit({ cells, notes })
  }

  function undo() {
    setGame((current) => {
      const previous = current.history.at(-1)
      if (!previous) return current
      return {
        ...current,
        cells: previous.cells,
        notes: previous.notes,
        history: current.history.slice(0, -1),
        completed: false,
      }
    })
  }

  function hint() {
    const index = game.selected ?? game.cells.findIndex((cell, i) => cell === '' && givens[i] === '0')
    if (index < 0 || givens[index] !== '0') return
    const cells = [...game.cells]
    const notes = game.notes.map((item) => [...item])
    cells[index] = puzzle.solution[index]
    notes[index] = []
    const completed = cells.join('') === puzzle.solution
    if (completed) localStorage.setItem(`${STORAGE_KEY}-${puzzle.id}`, 'done')
    commit({ cells, notes, selected: index, completed })
  }

  function reset() {
    localStorage.removeItem(`${STORAGE_KEY}-${puzzle.id}-game`)
    setGame(emptyGame(puzzle))
  }

  return (
    <main
      className="app-shell"
      data-mode={theme.mode}
      style={
        {
          '--primary': theme.primary,
          '--secondary': theme.secondary,
        } as React.CSSProperties
      }
    >
      <section className="top-bar">
        <div>
          <p className="eyebrow">{TEXT.eyebrow}</p>
          <h1>{TEXT.appName}</h1>
        </div>
        <div className="stats-strip">
          <span>{formatTime(game.seconds)}</span>
          <span>{progress}/30</span>
          <span>
            {game.mistakes} {TEXT.mistakes}
          </span>
        </div>
      </section>

      <section className="game-layout">
        <div className="board-panel">
          <div className="board" aria-label="Sudoku board">
            {game.cells.map((cell, index) => {
              const selected = game.selected === index
              const related = game.selected !== null && isPeer(game.selected, index)
              const same = cell && game.selected !== null && cell === game.cells[game.selected]
              const fixed = givens[index] !== '0'
              const wrong = cell && cell !== puzzle.solution[index]

              return (
                <button
                  className="cell"
                  data-fixed={fixed}
                  data-related={related}
                  data-same={Boolean(same)}
                  data-selected={selected}
                  data-wrong={Boolean(wrong)}
                  key={index}
                  type="button"
                  onClick={() => setGame((current) => ({ ...current, selected: index }))}
                >
                  {cell || (
                    <span className="notes">
                      {'123456789'.split('').map((number) => (
                        <span key={number}>{game.notes[index].includes(number) ? number : ''}</span>
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="side-panel">
          <div className="segment">
            <button data-active={mode === 'levels'} type="button" onClick={() => selectPuzzle('levels')}>
              {TEXT.levels}
            </button>
            <button data-active={mode === 'daily'} type="button" onClick={() => selectPuzzle('daily')}>
              {TEXT.daily}
            </button>
          </div>

          <div className="level-card">
            <div>
              <p className="muted">{puzzle.difficulty}</p>
              <h2>{puzzle.title}</h2>
            </div>
            <button className="ghost-button" type="button" onClick={reset}>
              {TEXT.restart}
            </button>
          </div>

          {mode === 'levels' && (
            <div className="level-grid" aria-label="Level selector">
              {LEVELS.map((level, index) => (
                <button
                  data-active={index === levelIndex}
                  data-done={localStorage.getItem(`${STORAGE_KEY}-${level.id}`) === 'done'}
                  key={level.id}
                  type="button"
                  onClick={() => selectPuzzle('levels', index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="number-pad">
            {'123456789'.split('').map((number) => (
              <button key={number} type="button" onClick={() => enterNumber(number)}>
                {number}
              </button>
            ))}
          </div>

          <div className="tool-grid">
            <button
              data-active={game.noteMode}
              type="button"
              onClick={() => setGame((current) => ({ ...current, noteMode: !current.noteMode }))}
            >
              {TEXT.note}
            </button>
            <button type="button" onClick={undo}>
              {TEXT.undo}
            </button>
            <button type="button" onClick={erase}>
              {TEXT.erase}
            </button>
            <button type="button" onClick={hint}>
              {TEXT.hint}
            </button>
          </div>

          <div className="theme-row" aria-label="Theme selector">
            {THEMES.map((item) => (
              <button
                aria-label={item.name}
                className="theme-dot"
                data-active={item.id === themeId}
                key={item.id}
                style={{ '--swatch': item.primary, '--swatch-bg': item.secondary } as React.CSSProperties}
                type="button"
                onClick={() => setThemeId(item.id)}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {game.completed && (
            <div className="complete-banner">
              <strong>{TEXT.done}</strong>
              <span>
                {TEXT.timeUsed} {formatTime(game.seconds)}
              </span>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

export default App

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

export type Puzzle = {
  id: string
  title: string
  difficulty: Difficulty
  givens: string
  solution: string
}

export const SUDOKU_DATA_VERSION = 2

const DIGITS = '123456789'
const EMPTY = '0'
const FALLBACK_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
const FALLBACK_GIVENS = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

const BASE_SOLUTIONS = [
  FALLBACK_SOLUTION,
  '349687251257319684186254397573826149691475823824931765432198576915762438768543912',
  '837162594192534786456897231375649128248351679619728345983215467564973812721486953',
  '176523489284179635395864172531486297867291354429357861618745923953612748742938516',
]

const DIFFICULTY_TARGETS = [
  ...Array(14).fill({ difficulty: 'Easy' as const, clues: 42 }),
  ...Array(14).fill({ difficulty: 'Medium' as const, clues: 36 }),
  ...Array(12).fill({ difficulty: 'Hard' as const, clues: 31 }),
  ...Array(10).fill({ difficulty: 'Expert' as const, clues: 27 }),
]

function unitIndexes() {
  const units: number[][] = []

  for (let row = 0; row < 9; row += 1) {
    units.push(Array.from({ length: 9 }, (_, col) => row * 9 + col))
  }

  for (let col = 0; col < 9; col += 1) {
    units.push(Array.from({ length: 9 }, (_, row) => row * 9 + col))
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      units.push(
        Array.from({ length: 9 }, (_, offset) => {
          const row = boxRow * 3 + Math.floor(offset / 3)
          const col = boxCol * 3 + (offset % 3)
          return row * 9 + col
        }),
      )
    }
  }

  return units
}

const UNITS = unitIndexes()

function isPuzzleShape(board: string) {
  return /^[0-9]{81}$/.test(board)
}

export function findConflictIndexes(board: string): Set<number> {
  const conflicts = new Set<number>()
  if (!isPuzzleShape(board)) return conflicts

  for (const unit of UNITS) {
    const seen = new Map<string, number[]>()
    for (const index of unit) {
      const value = board[index]
      if (value === EMPTY) continue
      seen.set(value, [...(seen.get(value) ?? []), index])
    }
    for (const indexes of seen.values()) {
      if (indexes.length > 1) indexes.forEach((index) => conflicts.add(index))
    }
  }

  return conflicts
}

export function isValidCompleteSolution(solution: string): boolean {
  if (!new RegExp(`^[${DIGITS}]{81}$`).test(solution)) return false

  return UNITS.every((unit) => unit.map((index) => solution[index]).sort().join('') === DIGITS)
}

export function isValidPuzzleAgainstSolution(puzzle: string, solution: string): boolean {
  if (!isPuzzleShape(puzzle)) return false
  if (!isValidCompleteSolution(solution)) return false
  if (findConflictIndexes(puzzle).size > 0) return false

  return puzzle.split('').every((cell, index) => cell === EMPTY || cell === solution[index])
}

export function validateSudokuBundle(bundle: Pick<Puzzle, 'givens' | 'solution'>): boolean {
  return isValidPuzzleAgainstSolution(bundle.givens, bundle.solution) && countSolutions(bundle.givens, 2) === 1
}

function seededRandom(seed: number) {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function shuffledIndexes(seed: number) {
  const indexes = Array.from({ length: 81 }, (_, i) => i)
  const random = seededRandom(seed)
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[indexes[i], indexes[j]] = [indexes[j], indexes[i]]
  }
  return indexes
}

export function countSolutions(board: string, limit = 2) {
  if (!isPuzzleShape(board) || findConflictIndexes(board).size > 0) return 0

  const cells = board.split('')
  let count = 0

  const solve = () => {
    if (count >= limit) return
    let best = -1
    let candidates: string[] = []

    for (let i = 0; i < 81; i += 1) {
      if (cells[i] !== EMPTY) continue
      const options = getCandidates(cells, i)
      if (options.length === 0) return
      if (best === -1 || options.length < candidates.length) {
        best = i
        candidates = options
      }
    }

    if (best === -1) {
      count += 1
      return
    }

    for (const candidate of candidates) {
      if (count >= limit) return
      cells[best] = candidate
      solve()
      cells[best] = EMPTY
    }
  }

  solve()
  return count
}

function getCandidates(cells: string[], index: number) {
  const used = new Set<string>()
  const row = Math.floor(index / 9)
  const col = index % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3

  for (let i = 0; i < 9; i += 1) {
    used.add(cells[row * 9 + i])
    used.add(cells[i * 9 + col])
    used.add(cells[(boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3)])
  }

  return DIGITS.split('').filter((number) => !used.has(number))
}

export function makePuzzle(solution: string, clues: number, seed: number) {
  if (!isValidCompleteSolution(solution)) return FALLBACK_GIVENS

  const targetClues = Math.min(81, Math.max(17, clues))
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const puzzle = solution.split('')
    for (const index of shuffledIndexes(seed + attempt * 101)) {
      if (puzzle.filter((cell) => cell !== EMPTY).length <= targetClues) break
      const backup = puzzle[index]
      puzzle[index] = EMPTY
      if (countSolutions(puzzle.join(''), 2) !== 1) puzzle[index] = backup
    }

    const givens = puzzle.join('')
    if (validateSudokuBundle({ givens, solution })) return givens
  }

  return validateSudokuBundle({ givens: FALLBACK_GIVENS, solution: FALLBACK_SOLUTION }) ? FALLBACK_GIVENS : solution
}

function fallbackPuzzle(id: string, title: string, difficulty: Difficulty): Puzzle {
  return {
    id,
    title,
    difficulty,
    givens: FALLBACK_GIVENS,
    solution: FALLBACK_SOLUTION,
  }
}

export function buildLevels(): Puzzle[] {
  return DIFFICULTY_TARGETS.map((settings, index) => {
    const id = `level-${index + 1}`
    const title = `\u7b2c ${index + 1} \u5173`
    const solution = BASE_SOLUTIONS[index % BASE_SOLUTIONS.length]
    const puzzle = {
      id,
      title,
      difficulty: settings.difficulty,
      givens: makePuzzle(solution, settings.clues, 9000 + index * 37),
      solution,
    }

    return validateSudokuBundle(puzzle) ? puzzle : fallbackPuzzle(id, title, settings.difficulty)
  })
}

export function dailyPuzzle(date = new Date()): Puzzle {
  const key = Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}`,
  )
  const solution = BASE_SOLUTIONS[key % BASE_SOLUTIONS.length]
  const puzzle = {
    id: `daily-${key}`,
    title: '\u6bcf\u65e5\u9898',
    difficulty: 'Medium' as const,
    givens: makePuzzle(solution, 34, key),
    solution,
  }

  return validateSudokuBundle(puzzle) ? puzzle : fallbackPuzzle(puzzle.id, puzzle.title, puzzle.difficulty)
}

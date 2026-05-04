export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

export type Puzzle = {
  id: string
  title: string
  difficulty: Difficulty
  givens: string
  solution: string
}

const BASE_SOLUTIONS = [
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  '417369825632158947958724316158293764273641589964875132725936418381524697649187253',
  '945321786217856394386794521758143962621978453493562817862417935134285679579639248',
  '872643951513987426496125783759361842621478539348592167937856214284719365165234978',
]

const DIFFICULTY_TARGETS = [
  ...Array(8).fill({ difficulty: 'Easy' as const, clues: 42 }),
  ...Array(8).fill({ difficulty: 'Medium' as const, clues: 36 }),
  ...Array(8).fill({ difficulty: 'Hard' as const, clues: 31 }),
  ...Array(6).fill({ difficulty: 'Expert' as const, clues: 27 }),
]

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
  const cells = board.split('')
  let count = 0

  const solve = () => {
    if (count >= limit) return
    let best = -1
    let candidates: string[] = []

    for (let i = 0; i < 81; i += 1) {
      if (cells[i] !== '0') continue
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
      cells[best] = candidate
      solve()
      cells[best] = '0'
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

  return '123456789'.split('').filter((number) => !used.has(number))
}

export function makePuzzle(solution: string, clues: number, seed: number) {
  const puzzle = solution.split('')
  for (const index of shuffledIndexes(seed)) {
    if (puzzle.filter((cell) => cell !== '0').length <= clues) break
    const backup = puzzle[index]
    puzzle[index] = '0'
    if (countSolutions(puzzle.join(''), 2) !== 1) puzzle[index] = backup
  }
  return puzzle.join('')
}

export function buildLevels(): Puzzle[] {
  return DIFFICULTY_TARGETS.map((settings, index) => {
    const solution = BASE_SOLUTIONS[index % BASE_SOLUTIONS.length]
    return {
      id: `level-${index + 1}`,
      title: `\u7b2c ${index + 1} \u5173`,
      difficulty: settings.difficulty,
      givens: makePuzzle(solution, settings.clues, 9000 + index * 37),
      solution,
    }
  })
}

export function dailyPuzzle(date = new Date()): Puzzle {
  const key = Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}`,
  )
  const solution = BASE_SOLUTIONS[key % BASE_SOLUTIONS.length]
  return {
    id: `daily-${key}`,
    title: '\u6bcf\u65e5\u9898',
    difficulty: 'Medium',
    givens: makePuzzle(solution, 34, key),
    solution,
  }
}

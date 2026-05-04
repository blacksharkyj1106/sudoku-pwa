import { buildLevels, countSolutions, dailyPuzzle } from '../src/sudoku.ts'

const levels = buildLevels()

if (levels.length !== 50) {
  throw new Error(`Expected 50 levels, got ${levels.length}`)
}

let previousClues = 82
for (const level of levels) {
  const clues = level.givens.replaceAll('0', '').length
  const solutions = countSolutions(level.givens, 2)
  if (solutions !== 1) {
    throw new Error(`${level.id} should have exactly one solution, got ${solutions}`)
  }
  if (clues > previousClues + 6) {
    throw new Error(`${level.id} clue count jumps unexpectedly`)
  }
  previousClues = clues
}

const date = new Date('2026-05-04T00:00:00+08:00')
const firstDaily = dailyPuzzle(date)
const secondDaily = dailyPuzzle(date)

if (firstDaily.givens !== secondDaily.givens || firstDaily.solution !== secondDaily.solution) {
  throw new Error('Daily puzzle is not stable for the same date')
}

if (countSolutions(firstDaily.givens, 2) !== 1) {
  throw new Error('Daily puzzle should have exactly one solution')
}

console.log('Puzzle verification passed')

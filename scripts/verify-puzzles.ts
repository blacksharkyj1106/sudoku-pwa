import {
  buildLevels,
  countSolutions,
  dailyPuzzle,
  findConflictIndexes,
  isValidCompleteSolution,
  isValidPuzzleAgainstSolution,
  validateSudokuBundle,
} from '../src/sudoku.ts'

const levels = buildLevels()

if (levels.length !== 50) {
  throw new Error(`Expected 50 levels, got ${levels.length}`)
}

let previousClues = 82
for (const level of levels) {
  const clues = level.givens.replaceAll('0', '').length

  if (!isValidCompleteSolution(level.solution)) {
    throw new Error(`${level.id} solution is not a valid complete Sudoku`)
  }
  if (!isValidPuzzleAgainstSolution(level.givens, level.solution)) {
    throw new Error(`${level.id} givens do not match solution or contain conflicts`)
  }
  if (!validateSudokuBundle(level)) {
    throw new Error(`${level.id} bundle failed validation`)
  }
  if (countSolutions(level.givens, 2) !== 1) {
    throw new Error(`${level.id} should have exactly one solution`)
  }
  if (clues <= 0 || clues >= 81) {
    throw new Error(`${level.id} has an unreasonable clue count: ${clues}`)
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

if (!isValidCompleteSolution(firstDaily.solution)) {
  throw new Error('Daily puzzle solution is not a valid complete Sudoku')
}
if (!isValidPuzzleAgainstSolution(firstDaily.givens, firstDaily.solution)) {
  throw new Error('Daily puzzle givens do not match solution or contain conflicts')
}
if (!validateSudokuBundle(firstDaily)) {
  throw new Error('Daily puzzle bundle failed validation')
}
if (countSolutions(firstDaily.givens, 2) !== 1) {
  throw new Error('Daily puzzle should have exactly one solution')
}

const invalidCompleteBoard = `${firstDaily.solution[1]}${firstDaily.solution.slice(1)}`
if (countSolutions(invalidCompleteBoard, 2) !== 0) {
  throw new Error('Invalid complete board should have zero solutions')
}

const boxConflictPuzzle = `1${firstDaily.givens.slice(1, 9)}1${firstDaily.givens.slice(10)}`
const boxConflicts = findConflictIndexes(boxConflictPuzzle)
if (!boxConflicts.has(0) || !boxConflicts.has(9)) {
  throw new Error('Box conflict indexes were not detected')
}

const mismatchedGiven = `${firstDaily.solution[0] === '1' ? '2' : '1'}${firstDaily.givens.slice(1)}`
if (isValidPuzzleAgainstSolution(mismatchedGiven, firstDaily.solution)) {
  throw new Error('Puzzle with a given that mismatches the solution should be invalid')
}

console.log('Puzzle verification passed')

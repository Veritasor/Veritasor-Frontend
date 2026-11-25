import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BUDGET_KB = 450

function parseBudgetKb(argv, env) {
  const flag = argv.find((arg) => arg.startsWith('--budget='))
  const raw = flag ? flag.slice('--budget='.length) : env.BUNDLE_BUDGET_KB
  if (raw === undefined || raw === '') {
    return DEFAULT_BUDGET_KB
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`Invalid bundle budget: "${raw}". Expected a positive number in KB.`)
    process.exit(1)
  }
  return parsed
}

function main() {
  const budgetKb = parseBudgetKb(process.argv.slice(2), process.env)
  const assetsDir = path.resolve(process.cwd(), 'dist', 'assets')

  if (!fs.existsSync(assetsDir)) {
    console.error(`Build assets directory not found: ${assetsDir}. Run "npm run build" first.`)
    process.exit(1)
  }

  const jsFiles = fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const fullPath = path.join(assetsDir, file)
      const bytes = fs.statSync(fullPath).size
      return { file, bytes, kb: bytes / 1024 }
    })

  if (jsFiles.length === 0) {
    console.error(`No JavaScript chunks found in ${assetsDir}.`)
    process.exit(1)
  }

  const mainChunk =
    jsFiles.find((entry) => /^index-.*\.js$/.test(entry.file)) ??
    jsFiles.reduce((largest, entry) => (entry.bytes > largest.bytes ? entry : largest))

  const formattedSize = mainChunk.kb.toFixed(2)
  const formattedBudget = budgetKb.toFixed(2)

  if (mainChunk.kb > budgetKb) {
    console.error(
      `Bundle size check FAILED: ${mainChunk.file} is ${formattedSize} KB, exceeding the ${formattedBudget} KB budget.`,
    )
    process.exit(1)
  }

  console.log(
    `Bundle size check PASSED: ${mainChunk.file} is ${formattedSize} KB (budget: ${formattedBudget} KB, ${jsFiles.length} JS chunks emitted).`,
  )
}

main()

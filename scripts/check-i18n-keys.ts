import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const messagesDir = path.join(root, 'src', 'i18n', 'messages')
const referenceFile = path.join(messagesDir, 'en.json')

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, string>
}

const reference = readJson(referenceFile)
const localeFiles = fs.readdirSync(messagesDir)
  .filter((fileName) => fileName.endsWith('.json') && fileName !== 'en.json')
  .map((fileName) => path.join(messagesDir, fileName))

const missingByLocale: Array<[string, string[]]> = []

for (const localeFile of localeFiles) {
  const locale = path.basename(localeFile)
  const entries = readJson(localeFile)
  const missing = Object.keys(reference).filter((key) => !(key in entries))
  if (missing.length > 0) {
    missingByLocale.push([locale, missing])
  }
}

if (missingByLocale.length > 0) {
  console.error('Missing i18n keys detected:')
  for (const [locale, missing] of missingByLocale) {
    console.error(`- ${locale}: ${missing.join(', ')}`)
  }
  process.exit(1)
}

console.log('All locale files contain the required i18n keys.')

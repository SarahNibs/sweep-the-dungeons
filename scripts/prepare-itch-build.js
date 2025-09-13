import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read package.json version
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Create version file for Butler
const distPath = path.join(__dirname, '..', 'dist')
const versionPath = path.join(distPath, 'version.txt')

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true })
}

// Write version file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const version = `${packageJson.version}-${timestamp}`

fs.writeFileSync(versionPath, version)

console.log(`✅ Prepared itch.io build`)
console.log(`📦 Version: ${version}`)
console.log(`📁 Build directory: ${distPath}`)

// Create a simple deployment instructions file
const deployInstructions = `# Deployment Instructions

## First Time Setup
1. Run: npm run butler:login
2. Edit package.json and replace "username/game-name" with your actual itch.io username and game name

## Deploy to itch.io
1. Build: npm run build:itch
2. Deploy: npm run deploy:itch

## Manual Upload
If you prefer manual upload, the build is in the dist/ folder.
Upload the entire contents of dist/ to itch.io as an HTML game.

## Current Build
Version: ${version}
Built: ${new Date().toLocaleString()}
`

fs.writeFileSync(path.join(distPath, 'DEPLOYMENT.md'), deployInstructions)

console.log(`📝 Created deployment instructions at dist/DEPLOYMENT.md`)
# itch.io Deployment Setup

Butler has been installed and configured for easy deployment to itch.io.

## First Time Setup

### 1. Authenticate with itch.io
```bash
npm run butler:login
```
This opens your browser to authenticate Butler with your itch.io account.

### 2. Configure Your Game
Edit `package.json` and replace `username/game-name` in the `deploy:itch` script with your actual:
- itch.io username
- game project name (as it appears in your itch.io game URL)

Example: If your game is at `https://yourname.itch.io/sweep-dungeons`, use:
```json
"deploy:itch": "npm run build:itch && tools\\butler.exe push dist yourname/sweep-dungeons:html --userversion-file dist/version.txt"
```

## Deployment Commands

### Build for itch.io
```bash
npm run build:itch
```
- Builds optimized production bundle
- Creates version file for Butler
- Generates deployment instructions in `dist/DEPLOYMENT.md`

### Deploy to itch.io
```bash
npm run deploy:itch
```
- Builds the project
- Pushes to itch.io using Butler
- Uses automatic versioning

### Other Butler Commands
```bash
npm run butler:status    # Check Butler authentication status
tools/butler.exe --help  # Full Butler help
```

## Manual Upload Alternative

If you prefer manual upload:
1. Run `npm run build:itch`
2. Go to your itch.io game's edit page
3. Upload the entire contents of the `dist/` folder
4. Set the game type to "HTML" and main file to `index.html`

## Build Optimizations for itch.io

The build is configured with:
- ✅ Relative paths (`base: './'`)
- ✅ Terser minification for smaller files
- ✅ ES2015 target for broad browser compatibility
- ✅ Consistent asset naming for caching
- ✅ Automatic versioning with timestamps

## Troubleshooting

- **Authentication issues**: Run `npm run butler:login` again
- **Game not found**: Check your username/game-name in package.json
- **Upload fails**: Verify your itch.io game exists and you have upload permissions
- **Manual alternative**: Always available via dist/ folder upload
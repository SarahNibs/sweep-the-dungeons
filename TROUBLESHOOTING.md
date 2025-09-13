# itch.io Deployment Troubleshooting

## Current Issue: API 500 Error

You're encountering two issues:
1. **itch.io API error (500)**: Server-side error on itch.io
2. **"bad user" error**: Project setup or authentication issue

## Immediate Solutions

### Option 1: Manual Upload (Recommended)
Your build is ready for manual upload:

1. **Go to itch.io**: Visit https://itch.io/game/new or your existing game's edit page
2. **Upload files**: Upload ALL files from the `dist/` folder:
   - `index.html` (main file)
   - `assets/` folder (with all JS files)
   - `vite.svg` (favicon)
3. **Set game type**: Select "HTML" as game type
4. **Set main file**: Choose `index.html` as the main file
5. **Test**: Use itch.io's "View game" button to test

### Option 2: Wait and Retry Butler
The 500 error might be temporary. Try again in 10-30 minutes:
```bash
npm run deploy:itch
```

## Butler Authentication Issues

### Check if you need to re-authenticate:
```bash
npm run butler:login
```

### Verify your game exists:
1. Go to https://itch.io/dashboard
2. Make sure you have a game called "sweep-the-dungeons"
3. Check that your username is exactly "SarahNibs"

### If the game doesn't exist:
1. Create a new game on itch.io first
2. Use the exact name in the URL for the package.json script

## Common Butler Issues

### Issue: "bad user" error
**Cause**: Username doesn't match or game doesn't exist
**Fix**: 
- Verify username at https://itch.io/dashboard
- Make sure the game project exists
- Check the exact spelling in package.json

### Issue: API 500 errors
**Cause**: itch.io server problems
**Fix**: 
- Wait 10-30 minutes and retry
- Use manual upload as backup
- Check itch.io status: https://twitter.com/itchio

### Issue: Authentication expired
**Fix**: Run `npm run butler:login` again

## Verifying Your Build

Your current build is correctly structured:
```
dist/
├── index.html          ← Main HTML file
├── assets/
│   ├── index-*.js     ← Your game code
│   ├── vendor-*.js    ← React/dependencies  
│   └── zustand-*.js   ← State management
├── vite.svg           ← Favicon
└── version.txt        ← Butler version tracking
```

✅ **This build is ready for itch.io deployment!**

## Manual Upload Steps (Detailed)

1. **Compress for easier upload** (optional):
   ```bash
   cd dist && tar -czf ../sweep-dungeons-build.tar.gz *
   ```

2. **Upload to itch.io**:
   - Go to your game's edit page
   - Scroll to "Uploads" section
   - Click "Upload files"
   - Select all files from `dist/` OR upload the compressed file
   - Set "This file will be played in the browser" ✅
   - Kind of project: "HTML"
   - Main HTML file: `index.html`

3. **Test the upload**:
   - Save your game
   - Click "View game" to test it works

## Next Steps

1. **Try manual upload first** - it's the most reliable option
2. **If you want Butler working**: 
   - Verify your itch.io game exists
   - Check username spelling
   - Try re-authentication
   - Retry when itch.io servers are stable

Your game build is production-ready regardless of the Butler issue!
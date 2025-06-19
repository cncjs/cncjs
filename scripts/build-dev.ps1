# Sync package dependencies
yarn run package-sync

# Prepare output directory
if (Test-Path -Path "output") {
    Remove-Item -Recurse -Force "output"
}
New-Item -ItemType Directory -Path "output"

# Navigate to the src directory
Push-Location -Path "src"
New-Item -ItemType Directory -Force -Path "../output/cncjs"
Copy-Item -Path "package.json" -Destination "../output/cncjs/"

# Compile JavaScript files with Babel
cross-env NODE_ENV=development babel "*.js" `
    --config-file "../babel.config.js" `
    --out-dir "../output/cncjs"

cross-env NODE_ENV=development babel "electron-app/**/*.js" `
    --config-file "../babel.config.js" `
    --out-dir "../output/cncjs/electron-app"
Pop-Location

# Compile server code with Babel
babel -d "output/cncjs/server" "src/server"

# Scan i18n translations
i18next-scanner --config "i18next-scanner.server.config.js" `
    "src/server/**/*.{html,js,jsx}" "!src/server/i18n/**" "!**/node_modules/**"

cross-env NODE_ENV=development webpack-cli --config "webpack.config.development.js"

i18next-scanner --config "i18next-scanner.app.config.js" `
    "src/app/**/*.{html,js,jsx}" "!src/app/i18n/**" "!**/node_modules/**"

# Copy necessary files
New-Item -ItemType Directory -Force -Path "output/cncjs/app"
New-Item -ItemType Directory -Force -Path "output/cncjs/server"
Copy-Item -Path "src/app/favicon.ico" -Destination "output/cncjs/app"
Copy-Item -Path "src/app/i18n" -Destination "output/cncjs/app" -Recurse
Copy-Item -Path "src/app/images" -Destination "output/cncjs/app" -Recurse
Copy-Item -Path "src/app/assets" -Destination "output/cncjs/app" -Recurse
Copy-Item -Path "src/server/i18n" -Destination "output/cncjs/server" -Recurse
Copy-Item -Path "src/server/views" -Destination "output/cncjs/server" -Recurse

Write-Host "Build complete." -ForegroundColor Green

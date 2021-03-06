/* eslint no-console: 0 */

const fs = require('fs')
const { join } = require('path')
const { promisify } = require('util')
const withTypescript = require('@zeit/next-typescript')

const copyFile = promisify(fs.copyFile)

// TODO renames these: URLs need to be URLs, hosts need to be hosts... etc
let requiredConfigVariables = {
  unlockEnv: process.env.UNLOCK_ENV || 'dev',
  httpProvider: process.env.HTTP_PROVIDER || '127.0.0.1',
  paywallUrl: process.env.PAYWALL_URL,
  paywallScriptUrl: process.env.PAYWALL_SCRIPT_URL,
  readOnlyProvider: process.env.READ_ONLY_PROVIDER,
  locksmithHost: process.env.LOCKSMITH_URI || 'http://127.0.0.1:8080',
  unlockAddress:
    process.env.UNLOCK_ADDRESS || '0x885EF47c3439ADE0CB9b33a4D3c534C99964Db93', // default for CI
}

// If the URL is set in an env variable, use it - otherwise it'll be overridden in config.js
if (process.env.UNLOCK_URL)
  requiredConfigVariables.unlockUrl = process.env.UNLOCK_URL

Object.keys(requiredConfigVariables).forEach(configVariableName => {
  if (!requiredConfigVariables[configVariableName]) {
    if (requiredConfigVariables.unlockEnv === 'test') return
    if (requiredConfigVariables.unlockEnv === 'dev') {
      return console.error(
        `The configuration variable ${configVariableName} is falsy.`
      )
    }
    throw new Error(
      `The configuration variable ${configVariableName} is falsy.`
    )
  }
})

module.exports = withTypescript({
  publicRuntimeConfig: requiredConfigVariables,
  webpack(config) {
    return config
  },
  exportPathMap: async (defaultPathMap, { dev, dir, outDir }) => {
    // Export robots.txt and humans.txt in non-dev environments
    if (!dev && outDir) {
      await copyFile(
        join(dir, 'static', 'robots.txt'),
        join(outDir, 'robots.txt')
      )
      await copyFile(
        join(dir, 'static', 'humans.txt'),
        join(outDir, 'humans.txt')
      )

      // Export _redirects which is used by netlify for URL rewrites
      await copyFile(
        join(dir, 'static', '_redirects'),
        join(outDir, '_redirects')
      )
    }

    // Our statically-defined pages to export
    return {
      '/': { page: '/home' },
      '/about': { page: '/about' },
      '/jobs': { page: '/jobs' },
      '/dashboard': { page: '/dashboard' },
      '/keychain': { page: '/keyChain' },
      '/terms': { page: '/terms' },
      '/privacy': { page: '/privacy' },
      '/log': { page: '/log' },
    }
  },
})

/* eslint no-console: 0 */

let counter = 1
module.exports = {
  debugPage(page, debug = false) {
    if (debug) {
      page.on('console', async (msg) => {
        const locationInfo = msg.location()
        const fileInfo = `${locationInfo.url ? locationInfo.url : ''}${
          locationInfo.lineNumber !== undefined ? ` Line ${locationInfo.lineNumber}` : ''
        }`
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue()))
        console.log(`console.${msg.type()} ${fileInfo}`, args)
      })
    }
  },
  async screenshot(page, file = 'test') {
    await page.screenshot({ path: `/screenshots/${file}-${counter}.png`, fullPage: true })
    counter += 1
  },
  screenshotOnFail: page => (testDescription, code) => {
    const runTest = async () => {
      try {
        // await will do nothing for non-async code, and make async tests work
        module.exports.debugPage(page, true, true)
        await code()
        // if the code does not throw, we did not fail
      } catch (e) {
        // locally, we use the volume mounted at /screenshots
        // on CI, we use the /home/unlock/screenshots directory used to retrieve artifacts
        const screenshotPath = `/screenshots/${testDescription.replace(/[ ,/"'^$\\]+/g, '-')}.png`
        console.error(`writing screenshot to ${screenshotPath}`)
        try {
          await page.screenshot({ path: screenshotPath, fullPage: true })
        } catch (screenshotError) {
          console.error(screenshotError)
        }
        throw e
      }
    }
    it(testDescription, runTest)
  },}

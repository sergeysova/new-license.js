#!/usr/bin/env node
const { resolve } = require('path')
const fs = require('fs-extra')
const { default: chalk } = require('chalk')
const npm = require('npm')
const license = require('license.js')
const {
  greetings,
  createReadmeFile,
  findReadme,
  getMarks,
  queryConfirm,
  queryCreateReadme,
  queryLicense,
  queryOptions,
  queryTemplate,
  saveLicenseText,
} = require('../lib/main')


async function run() {
  console.log(greetings())
  npm.load()
  const currentDir = process.cwd()

  const { license: licenseName } = await queryLicense()
  const licenseDefinition = await license.getLicense(licenseName)
  const marks = getMarks(licenseDefinition)
  const marksReplacements = await queryTemplate(marks)
  const options = await queryOptions(licenseDefinition)

  let readmeFile = ''
  let needCreateReadme = false

  if (options.headerFile) {
    readmeFile = await findReadme(currentDir)

    if (!readmeFile && await queryCreateReadme()) {
      readmeFile = resolve(currentDir, 'README.md')
      needCreateReadme = true
    }
  }

  const resultLicense = await license.makeLicense(licenseName, marksReplacements)

  if (await queryConfirm()) {
    if (options.headerFile) {
      if (needCreateReadme) {
        await createReadmeFile(readmeFile, marksReplacements.project)
        console.log(`🤖  ${chalk.bgBlue('README.md')} created`)
      }

      await fs.appendFile(readmeFile, `\n## LICENSE\n${resultLicense.header}`, { encoding: 'utf8' })
    }

    await saveLicenseText(currentDir, 'LICENSE', resultLicense.text)

    if (options.warrantyFile && resultLicense.warranty) {
      await saveLicenseText(currentDir, 'WARRANTY', resultLicense.warranty)
    }

    console.log(`\n✅  🌝  ${chalk.bold.white('Success!')}`)
  }
  else {
    console.log(`\n🌚  ${chalk.bold.white('Cancelled')}`)
  }
}

run()

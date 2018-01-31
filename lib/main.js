const fs = require('fs-extra')
const npm = require('npm')
const inquirer = require('inquirer')
const license = require('license.js')
const { default: chalk } = require('chalk')

const Package = require('../package.json')


const greetings = () => {
  const greet = [
    chalk.cyan('let'),
    '✏️ ',
    chalk.green('='),
    chalk.bold.cyan('new'),
    [
      chalk.magenta.bold(`License`),
      chalk.green('('),
      chalk.yellow(`'${Package.version}'`),
      chalk.green(')'),
    ].join('')
  ].join(' ')

  console.log(greet, '\n')
}

/**
 * Ask user to select license from list
 * @return {Promise<{ license: string }>}
 */
function queryLicense() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'license',
      message: 'Select license:',
      default: 'MIT',
      prefix: '⚡️ ',
      choices: license.availableLicenses(),
    }
  ])
}

/**
 * Find property in npm in format foo-bar and foo.bar
 * And wrap it to `wrapFn`
 * @param {string} prop
 * @param {(result: string) => string} wrapFn
 * @return {string}
 */
const npmConfigGet = (prop, wrapFn = (a => a)) => wrapFn(npm.config.get(prop) || npm.config.get(prop.replace(/\-/g, '.')))

/**
 * Find author name, email and url in npm config and join it
 * @return {string}
 */
function resolveAuthor() {
  const name = npmConfigGet('init-author-name')
  const email = npmConfigGet('init-author-email', (value) => value ? `<${value}>` : '')
  const url = '' //npmConfigGet('init-author-url', (value) => value ? `(${value})` : '')

  return [name, email, url].filter(Boolean).join(' ')
}

function resolveProjectName() {

}

/**
 * Ask user to replace template marks in license files
 * @param {string[]} marks
 * @return {Promise<{ organization?: string, project?: string, year?: string }>}
 */
function queryTemplate(marks) {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'organization',
      message: 'Enter author or organization name:',
      default: resolveAuthor,
      prefix: '🏢 ',
      validate: (input) => input.trim().length > 1 ? true : 'Enter valid name',
      when: marks.includes('organization'),
      required: marks.includes('organization'),
    },
    {
      type: 'input',
      name: 'project',
      message: 'Enter project name:',
      // TODO: resolve project name from package.json:name and directory name
      prefix: '🔮 ',
      validate: (input) => input.trim().length > 1 ? true : 'Enter project name',
      when: marks.includes('project'),
      required: marks.includes('project'),
    },
    {
      type: 'input',
      name: 'year',
      message: 'Enter year (2007-2018):',
      default: String(new Date().getFullYear()),
      prefix: '🎁 ',
      validate: (input) => (/^\d{4}(\s?\-\s?\d{2,4})?$/).test(input.trim()) ? true : 'Enter valid year(s)',
      when: marks.includes('year'),
      required: marks.includes('year'),
    },
  ])
}

/**
 * Ask user to add HEADER to readme and create WARANTY file
 * @param {LicenseDefinition} licenseDefinition
 * @return {Promise<{ headerFile: boolean, warrantyFile: boolean }>}
 */
function queryOptions(licenseDefinition) {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'headerFile',
      message: 'Add header to README file?',
      // TODO: resolve readme file name
      default: true,
      prefix: '✨ ',
      when: Boolean(licenseDefinition.header),
    },
    {
      type: 'confirm',
      name: 'warrantyFile',
      message: 'Create WARRANTY file?',
      prefix: '❓ ',
      default: true,
      when: Boolean(licenseDefinition.warranty),
    },
  ])
}

/**
 * Ask user to confirm creating LICENSE
 * @return {Promise<boolean>}
 */
async function queryConfirm() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Let\'s add license to your project!',
      default: true,
      prefix: '🕺🏻 ',
    }
  ])

  return confirm
}

/**
 * @typedef {Object} LicenseDefinition
 * @prop {string} text
 * @prop {string} [header]
 * @prop {string} [warranty]
 */

 /**
  * Find {{ marks }} in license text (header and warranty too)
 * @param {LicenseDefinition} licenseDefinition
 * @return {string[]}
 */
function getMarks(licenseDefinition) {
  let marks = []

  const exec = (text) => (text.match(/\{\{\s?(\w+)\s?\}\}/gm) || [])
    .map((mark) => mark.replace('{{', '').replace('}}', '').trim())

  marks = marks.concat(exec(licenseDefinition.text))

  if (licenseDefinition.header) {
    marks = marks.concat(exec(licenseDefinition.header))
  }
  if (licenseDefinition.warranty) {
    marks = marks.concat(exec(licenseDefinition.warranty))
  }

  return Array.from(new Set(marks))
}

/**
 * @param {string} directory Directory to save license in
 * @param {string} fileName Filename
 * @param {string} textContent Content of license
 */
const saveLicenseText = (directory, fileName, textContent) => (
  fs.writeFile(`${directory}/${fileName}`, textContent, { encoding: 'utf8' })
)

async function run() {
  greetings()
  npm.load()
  const currentDir = process.cwd()

  const { license: licenseName } = await queryLicense()
  const licenseDefinition = await license.getLicense(licenseName)
  const marks = getMarks(licenseDefinition)
  const marksReplacements = await queryTemplate(marks)
  const options = await queryOptions(licenseDefinition)

  const resultLicense = await license.makeLicense(licenseName, marksReplacements)

  if (await queryConfirm()) {
    // console.log({ licenseName, licenseDefinition, marks, marksReplacements, options })
    // console.log(resultLicense.text)
    // console.log(resultLicense.header)
    // console.log(resultLicense.warranty)

    // TODO: write to readme.md
    // TODO: write warrancy



    await saveLicenseText(currentDir, 'LICENSE', resultLicense.text)
    console.log(`\n✅  🌝  ${chalk.bold.white('Success!')}`)
  }
}

run()
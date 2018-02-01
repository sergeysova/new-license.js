const { resolve } = require('path')
const fs = require('fs-extra')
const npm = require('npm')
const inquirer = require('inquirer')
const license = require('license.js')
const { default: chalk } = require('chalk')

const Package = require('../package.json')


/**
 * Create greetings message
 * @export
 * @return {string}
 */
const greetings = () => {
  const greet = [
    chalk.cyan('let'),
    '✏️ ',
    chalk.green('='),
    chalk.bold.cyan('new'),
    [
      chalk.magenta.bold('License'),
      chalk.green('('),
      chalk.yellow(`'${Package.version}'`),
      chalk.green(')'),
    ].join(''),
  ].join(' ')

  return `${greet}\n`
}

/**
 * Ask user to select license from list
 * @export
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
    },
  ])
}

/**
 * Find property in npm in format foo-bar and foo.bar
 * And wrap it to `wrapFn`
 * @param {string} prop
 * @param {(result: string) => string} wrapFn
 * @return {string}
 */
const npmConfigGet = (prop, wrapFn = ((a) => a)) => wrapFn(npm.config.get(prop) || npm.config.get(prop.replace(/-/g, '.')))

/**
 * Find author name, email and url in npm config and join it
 * @return {string}
 */
function resolveAuthor() {
  const name = npmConfigGet('init-author-name')
  const email = npmConfigGet('init-author-email', (value) => value ? `<${value}>` : '')
  const url = '' // npmConfigGet('init-author-url', (value) => value ? `(${value})` : '')

  return [name, email, url].filter(Boolean).join(' ')
}

function resolveProjectName() {

}

/**
 * Ask user to replace template marks in license files
 * @export
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
      validate: (input) => (/^\d{4}(\s?-\s?\d{2,4})?$/).test(input.trim()) ? true : 'Enter valid year(s)',
      when: marks.includes('year'),
      required: marks.includes('year'),
    },
  ])
}

/**
 * Ask user to add HEADER to readme and create WARANTY file
 * @export
 * @param {LicenseDefinition} licenseDefinition
 * @return {Promise<{ headerFile: boolean, warrantyFile: boolean }>}
 */
function queryOptions(licenseDefinition) {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'headerFile',
      message: 'Add header to README file?',
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
 * @export
 * @return {Promise<boolean>}
 */
function queryConfirm() {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Let\'s add license to your project!',
      default: true,
      prefix: '🕺🏻 ',
    },
  ]).then(({ confirm }) => confirm)
}

/**
 * Ask user to create README file
 * @export
 * @return {Promise<boolean>}
 */
function queryCreateReadme() {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Readme file not found. Create?',
      prefix: '👀 ',
      default: true,
    },
  ]).then(({ confirm }) => confirm)
}

/**
 * @typedef {Object} LicenseDefinition
 * @prop {string} text
 * @prop {string} [header]
 * @prop {string} [warranty]
 */

/**
 * Find {{ marks }} in license text (header and warranty too)
 * @export
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
 * Find in working dir any readme file
 * @export
 * @param {string} workingDir
 * @return {Promise<string|undefined>}
 */
async function findReadme(workingDir) {
  return (await fs.readdir(workingDir))
    .filter((name) => /readme/i.test(name))
    .map((item) => resolve(workingDir, item))[0]
}

/**
 * @export
 * @param {string} directory Directory to save license in
 * @param {string} fileName Filename
 * @param {string} textContent Content of license
 */
const saveLicenseText = (directory, fileName, textContent) => (
  fs.writeFile(resolve(directory, fileName), textContent, { encoding: 'utf8' })
)

/**
 * Create base readme file for project
 * @export
 * @param {string} path Path to new README.md file
 * @param {string} projectName Create first line with project name
 */
const createReadmeFile = (path, projectName) => (
  fs.writeFile(path, `# ${projectName}\n\n`, { encoding: 'utf8' })
)


module.exports = {
  createReadmeFile,
  findReadme,
  getMarks,
  greetings,
  queryConfirm,
  queryCreateReadme,
  queryLicense,
  queryOptions,
  queryTemplate,
  saveLicenseText,
}

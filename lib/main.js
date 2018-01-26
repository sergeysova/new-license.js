const fs = require('fs')
const inquirer = require('inquirer')
const license = require('license.js')


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
      choices: license.availableLicenses(),
    }
  ])
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
      validate: (input) => input.trim().length > 1 ? true : 'Enter valid name',
      when: marks.includes('organization'),
    },
    {
      type: 'input',
      name: 'project',
      message: 'Enter project name:',
      validate: (input) => input.trim().length > 1 ? true : 'Enter project name',
      when: marks.includes('project'),
    },
    {
      type: 'input',
      name: 'year',
      message: 'Enter year (2007-2018):',
      default: String(new Date().getFullYear()),
      validate: (input) => (/^\d{4}(\s?\-\s?\d{2,4})?$/).test(input.trim()) ? true : 'Enter valid year(s)',
      when: marks.includes('year'),
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
      default: true,
      when: Boolean(licenseDefinition.header),
    },
    {
      type: 'confirm',
      name: 'warrantyFile',
      message: 'Does save WARRANTY file?',
      default: true,
      when: Boolean(licenseDefinition.warranty),
    },
  ])
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

function saveLicenseText(cwd, name, text) {
  return new Promise((resolve, reject) => {
    fs.writeFile(`${cwd}/${name}`, text, { encoding: 'utf8' }, (err) => err ? reject(err) : resolve())
  })
}

async function run() {
  const currentDir = process.cwd()
  const { license: licenseName } = await queryLicense()
  const licenseDefinition = await license.getLicense(licenseName)
  const marks = getMarks(licenseDefinition)
  const marksReplacements = await queryTemplate(marks)
  const options = await queryOptions(licenseDefinition)

  const resultLicense = await license.makeLicense(licenseName, marksReplacements)

  console.log({ licenseName, licenseDefinition, marks, marksReplacements, options })
  console.log(resultLicense.text)
  console.log(resultLicense.header)
  console.log(resultLicense.warranty)



}

run()

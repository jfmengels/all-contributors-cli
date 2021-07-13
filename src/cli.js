#!/usr/bin/env node
/* eslint-disable no-console */

const path = require('path')
const yargs = require('yargs')
const chalk = require('chalk')
const inquirer = require('inquirer')

const init = require('./init')
const generate = require('./generate')
const util = require('./util')
const repo = require('./repo')
const updateContributors = require('./contributors')

const cwd = process.cwd()
const defaultRCFile = path.join(cwd, '.all-contributorsrc')

const yargv = yargs
  .scriptName('all-contributors')
  .help('help')
  .alias('h', 'help')
  .alias('v', 'version')
  .version()
  .recommendCommands()
  .command('generate', `Generate the list of contributors\n\nUSAGE: all-contributors generate`)
  .command('add', `Add a new contributor\n\nUSAGE: all-contributors add <username> <comma-separated contributions>`)
  .command('init', `Prepare the project to be used with this tool\n\nUSAGE: all-contributors init`)
  .command(
    'check',
    `Compare contributors from the repository with the ones credited in .all-contributorsrc'\n\nUSAGE: all-contributors check`)
  .boolean('commit')
  .default('files', ['README.md'])
  .default('contributorsPerLine', 7)
  .option('contributorsSortAlphabetically', {
    type: 'boolean',
    default: false,
    description:
      'Sort the list of contributors alphabetically in the generated list',
  })
  .default('contributors', [])
  .default('config', defaultRCFile)
  .config('config', configPath => {
    try {
      return util.configFile.readConfig(configPath)
    } catch (error) {
      if (error instanceof SyntaxError || configPath !== defaultRCFile) {
        onError(error)
      }
    }
  }).argv

function startGeneration(argv) {
  return Promise.all(
    argv.files.map(file => {
      const filePath = path.join(cwd, file)
      return util.markdown.read(filePath).then(fileContent => {
        const newFileContent = generate(argv, argv.contributors, fileContent)
        return util.markdown.write(filePath, newFileContent)
      })
    }),
  )
}

function addContribution(argv) {
  util.configFile.readConfig(argv.config) // ensure the config file exists
  const username = argv._[1] === undefined ? undefined : String(argv._[1])
  const contributions = argv._[2]
  // Add or update contributor in the config file
  return updateContributors(argv, username, contributions).then(data => {
    argv.contributors = data.contributors
    return startGeneration(argv).then(() => {
      if (argv.commit) {
        return util.git.commit(argv, data)
      }
    })
  })
}

function checkContributors(argv) {
  const configData = util.configFile.readConfig(argv.config)

  return repo
    .getContributors(
      configData.projectOwner,
      configData.projectName,
      configData.repoType,
      configData.repoHost,
    )
    .then(repoContributors => {
      const checkKey = repo.getCheckKey(configData.repoType)
      const knownContributions = configData.contributors.reduce((obj, item) => {
        obj[item[checkKey]] = item.contributions
        return obj
      }, {})
      const knownContributors = configData.contributors.map(
        contributor => contributor[checkKey],
      )

      const missingInConfig = repoContributors.filter(
        key => !knownContributors.includes(key),
      )
      const missingFromRepo = knownContributors.filter(key => {
        return (
          !repoContributors.includes(key) &&
          (knownContributions[key].includes('code') ||
            knownContributions[key].includes('test'))
        )
      })

      if (missingInConfig.length) {
        process.stdout.write(
          chalk.bold('Missing contributors in .all-contributorsrc:\n'),
        )
        process.stdout.write(`    ${missingInConfig.join(', ')}\n`)
      }

      if (missingFromRepo.length) {
        process.stdout.write(
          chalk.bold('Unknown contributors found in .all-contributorsrc:\n'),
        )
        process.stdout.write(`${missingFromRepo.join(', ')}\n`)
      }
    })
}

function onError(error) {
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  process.exit(0)
}

function promptForCommand(argv) {
  const questions = [
    {
      type: 'list',
      name: 'command',
      message: 'What do you want to do?',
      choices: [
        {
          name: 'Add new contributor or edit contribution type',
          value: 'add',
        },
        {
          name: 'Re-generate the contributors list',
          value: 'generate',
        },
        {
          name:
            'Compare contributors from the repository with the credited ones',
          value: 'check',
        },
      ],
      when: !argv._[0],
      default: 0,
    },
  ]

  return inquirer.prompt(questions).then(answers => {
    return answers.command || argv._[0]
  })
}

promptForCommand(yargv)
  .then(command => {
    switch (command) {
      case 'init':
        return init()
      case 'generate':
        return startGeneration(yargv)
      case 'add':
        return addContribution(yargv)
      case 'check':
        return checkContributors(yargv)
      default:
        throw new Error(`Unknown command ${command}`)
    }
  })
  .catch(onError)

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
const {getContributors} = require('./discover')
const {getLearner} = require('./discover/learner')

const cwd = process.cwd()
const defaultRCFile = path.join(cwd, '.all-contributorsrc')

const yargv = yargs
  .help('help')
  .alias('h', 'help')
  .alias('v', 'version')
  .version()
  .recommendCommands()
  .command('generate', 'Generate the list of contributors')
  .usage('Usage: $0 generate')
  .command('add', 'add a new contributor')
  .usage('Usage: $0 add <username> <contribution>')
  .command('init', 'Prepare the project to be used with this tool')
  .usage('Usage: $0 init')
  .command(
    'check',
    'Compares contributors from the repository with the ones credited in .all-contributorsrc',
  )
  .usage('Usage: $0 check')
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

function onError(error) {
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  process.exit(0)
}

function suggestCommands(cmd) {
  const availableCommands = ['generate', 'add', 'init', 'check']
  const suggestion = didYouMean(cmd, availableCommands)

  if (suggestion) console.log(chalk.bold(`Did you mean ${suggestion}`))
}

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

async function addContribution(argv) {
  /* Example: (for clarity & debugging purposes)
  {
    _: [ 'add' ],
    projectName: 'cz-cli',
    projectOwner: 'commitizen',
    repoType: 'github',
    repoHost: 'https://github.com',
    files: [ 'AC.md' ],
    imageSize: 100,
    commit: false,
    commitConvention: 'angular',
    contributors: [],
    contributorsPerLine: 7,
    'contributors-per-line': 7,
    config: '/mnt/c/Users/max/Projects/cz-cli/.all-contributorsrc',
    '$0': '../all-contributors-cli/src/cli.js'
  }
  */
  util.configFile.readConfig(argv.config) // ensure the config file exists

  const username = argv._[1] === undefined ? undefined : String(argv._[1])
  const contributions = argv._[2]

  // Add or update contributor in the config file
  let data

  try {
    data = await updateContributors(argv, username, contributions)
  } catch (error) {
    return console.error('Contributor Update fail:', error)
  }

  argv.contributors = data.contributors

  /* Example
   [ { login: 'Berkmann18',
   name: 'Maximilian Berkmann',
   avatar_url: 'https://avatars0.githubusercontent.com/u/8260834?v=4',
   profile: 'http://maxcubing.wordpress.com',
   contributions: [ 'code', 'ideas' ] },
   { already in argv.contributors } ]
  */

  try {
    await startGeneration(argv)

    return argv.commit ? util.git.commit(argv, data) : null
  } catch (error) {
    console.error('Generation fail:', error)
  }
}

async function checkContributors(argv) {
  const configData = util.configFile.readConfig(argv.config)

  const repoContributors = await repo.getContributors(
    configData.projectOwner,
    configData.projectName,
    configData.repoType,
    configData.repoHost,
  )

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
}

async function fetchContributors(argv) {
  const {reviewers, commitAuthors, issueCreators} = await getContributors(
    argv.projectOwner,
    argv.projectName,
  )
  const args = {...argv, _: []}
  const contributorsToAdd = []
  const learner = await getLearner()

  reviewers.forEach(usr => {
    contributorsToAdd.push({login: usr.login, contributions: ['review']})

    console.log(
      `Adding ${chalk.underline('Reviewer')} ${chalk.blue(usr.login)}`,
    )
  })

  issueCreators.forEach(usr => {
    const contributor = {
      login: usr.login,
      contributions: [],
    }

    usr.labels.forEach(lbl => {
      const guessedCategory = learner
        .classify(lbl)
        .find(ctr => ctr && ctr !== 'null')

      if (!guessedCategory) {
        console.warn(
          `Oops, I couldn't find any category for the "${lbl}" label`,
        )

        return
      }

      if (!contributor.contributions.includes(guessedCategory)) {
        contributor.contributions.push(guessedCategory)

        console.log(
          `Adding ${chalk.blue(usr.login)} for ${chalk.underline(
            guessedCategory,
          )}`,
        )
      }
    })

    const existingContributor = contributorsToAdd.find(
      ctr => ctr.login === usr.login,
    )

    if (existingContributor) {
      existingContributor.contributions.push(...contributor.contributions)
    } else {
      contributorsToAdd.push(contributor)
    }
  })

  commitAuthors.forEach(usr => {
    const existingContributor = contributorsToAdd.find(
      ctr => ctr.login === usr.login,
    )

    if (existingContributor) {
      // There's no label or commit message info so use only code for now
      if (!existingContributor.contributions.includes('code')) {
        existingContributor.contributions.push('code')
      }
    } else {
      contributorsToAdd.push({login: usr.login, contributions: ['code']})
    }
  })

  // TODO: Roll onto other contribution categories following https://www.draw.io/#G1uL9saIuZl3rj8sOo9xsLOPByAe28qhwa

  for (const contributor of contributorsToAdd) {
    if (!contributor.contributions.length) {
      console.log('Skipping', contributor.login)

      continue
    }

    // Format contributor contributions
    const contributions = contributor.contributions.join('/')

    console.log(
      `Adding ${chalk.blue(contributor.login)} for ${chalk.underline(
        contributions,
      )}`,
    )

    args._ = ['', contributor.login, contributor.contributions.join(',')]

    try {
      /* eslint-disable no-await-in-loop */
      await addContribution(args)
    } catch (error) {
      console.error(
        `Adding ${chalk.blue(contributor.login)} for ${chalk.underline(
          contributions,
        )} Failed: ${JSON.stringify(error)}`,
      )
    }
  }
}

async function promptForCommand(argv) {
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
        {
          name: 'Fetch contributors from the repository',
          value: 'fetch',
        },
      ],
      when: !argv._[0],
      default: 0,
    },
  ]

  const answers = await inquirer.prompt(questions)

  return answers.command || argv._[0]
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
      case 'fetch':
        return fetchContributors(yargv)
      default:
        throw new Error(`Unknown command ${command}`)
    }
  })
  .catch(onError)

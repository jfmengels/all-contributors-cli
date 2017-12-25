const _ = require('lodash/fp')
const inquirer = require('inquirer')
const util = require('../util')

const contributionChoices = _.flow(
  util.contributionTypes,
  _.toPairs,
  _.sortBy(pair => {
    return pair[1].description
  }),
  _.map(pair => {
    return {
      name: `${pair[1].symbol}  ${pair[1].description}`,
      value: pair[0],
    }
  }),
)

function getQuestions(options, username, contributions) {
  return [
    {
      type: 'input',
      name: 'username',
      message: "What is the contributor's GitHub username?",
      when: !username,
    },
    {
      type: 'checkbox',
      name: 'contributions',
      message: 'What are the contribution types?',
      when: !contributions,
      default: function(answers) {
        // default values for contributions when updating existing users
        answers.username = answers.username || username
        return options.contributors
          .filter(
            entry =>
              entry.login &&
              entry.login.toLowerCase() === answers.username.toLowerCase(),
          )
          .reduce(
            (allEntries, entry) => allEntries.concat(entry.contributions),
            [],
          )
      },
      choices: contributionChoices(options),
      validate: function(input, answers) {
        answers.username = answers.username || username
        const previousContributions = options.contributors
          .filter(
            entry =>
              entry.login &&
              entry.login.toLowerCase() === answers.username.toLowerCase(),
          )
          .reduce(
            (allEntries, entry) => allEntries.concat(entry.contributions),
            [],
          )

        if (!input.length) {
          return 'Use space to select at least one contribution type.'
        } else if (_.isEqual(input, previousContributions)) {
          return 'Nothing changed, use space to select contribution types.'
        }
        return true
      },
    },
  ]
}

function getValidUserContributions(options, contributions) {
  const validContributionTypes = util.contributionTypes(options)
  const userContributions = contributions && contributions.split(',')

  if (_.isEmpty(userContributions)) {
    throw new Error(
      `No contribution type found in the input. Did you forget to include them in the add command?`,
    )
  }

  const validUserContributions = _.filter(
    userContribution => validContributionTypes[userContribution] !== undefined,
  )(userContributions)

  if (_.isEmpty(validUserContributions)) {
    throw new Error(`Invalid contribution type/s entered`)
  }

  return validUserContributions
}

module.exports = function prompt(options, username, contributions) {
  const defaults = {
    username,
    contributions: getValidUserContributions(options, contributions),
  }
  const questions = getQuestions(options, username, contributions)
  return inquirer.prompt(questions).then(_.assign(defaults))
}

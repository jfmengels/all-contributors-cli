const _ = require('lodash/fp')
const inquirer = require('inquirer')
const git = require('../util').git
const conventions = require('./commit-conventions')

const questions = [
  {
    type: 'input',
    name: 'projectName',
    message: "What's the name of the repository?",
  },
  {
    type: 'input',
    name: 'projectOwner',
    message: 'Who is the owner of the repository?',
  },
  {
    type: 'list',
    name: 'repoType',
    message: 'What is the repository type?',
    choices: [
      {
        value: 'github',
        name: 'GitHub',
      },
      {
        value: 'gitlab',
        name: 'GitLab',
      },
    ],
    default: 'github',
  },
  {
    type: 'input',
    name: 'repoHost',
    message:
      "Where is the repository hosted? Hit Enter if it's on GitHub or GitLab",
    default: function(answers) {
      if (answers.repoType === 'github') {
        return 'https://github.com'
      } else if (answers.repoType === 'gitlab') {
        return 'https://gitlab.com'
      }
    },
  },
  {
    type: 'input',
    name: 'contributorFile',
    message: 'In which file should contributors be listed?',
    default: 'README.md',
  },
  {
    type: 'confirm',
    name: 'needBadge',
    message: 'Do you want a badge tallying the number of contributors?',
  },
  {
    type: 'input',
    name: 'badgeFile',
    message: 'In which file should the badge be shown?',
    when: function(answers) {
      return answers.needBadge
    },
    default: function(answers) {
      return answers.contributorFile
    },
  },
  {
    type: 'input',
    name: 'imageSize',
    message: 'How big should the avatars be? (in px)',
    filter: parseInt,
    default: 100,
  },
  {
    type: 'confirm',
    name: 'commit',
    message:
      'Do you want this badge to auto-commit when contributors are added?',
    default: true,
  },
  {
    type: 'list',
    name: 'commitConvention',
    message: 'What commit convention would you want it to use?',
    choices: Object.values(conventions),
    default: 'none',
  },
]

const uniqueFiles = _.flow(
  _.compact,
  _.uniq,
)

module.exports = function prompt() {
  return git
    .getRepoInfo()
    .then(repoInfo => {
      if (repoInfo) {
        questions[0].default = repoInfo.projectName
        questions[1].default = repoInfo.projectOwner
      }
      return inquirer.prompt(questions)
    })
    .then(answers => {
      return {
        config: {
          projectName: answers.projectName,
          projectOwner: answers.projectOwner,
          repoType: answers.repoType,
          repoHost: answers.repoHost,
          files: uniqueFiles([answers.contributorFile, answers.badgeFile]),
          imageSize: answers.imageSize,
          commit: answers.commit,
          commitConvention: answers.commitConvention,
          contributors: [],
          contributorsPerLine: 7,
          linkToUsage: true,
        },
        contributorFile: answers.contributorFile,
        badgeFile: answers.badgeFile,
      }
    })
}

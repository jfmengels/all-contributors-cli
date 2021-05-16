const _ = require('lodash/fp')
const util = require('../util')
const repo = require('../repo')
const add = require('./add')
const prompt = require('./prompt')

function isNewContributor(contributorList, username) {
  return !_.find({login: username}, contributorList)
}

module.exports = function addContributor(options, username, contributions) {
  const answersP = prompt(options, username, contributions)
  const contributorsP = answersP
    .then(answers =>
      add(options, answers.username, answers.contributions, repo.getUserInfo),
    )
    //eslint-disable-next-line no-console
    .catch(err => console.error('contributorsP error:', err))

  const writeContributorsP = contributorsP
    .then(contributors => {
      // console.log('opts.config=', options.config, 'contributors=', contributors)
      return util.configFile.writeContributors(options.config, contributors)
    })
    //eslint-disable-next-line no-console
    .catch(err => console.error('writeContributorsP error:', err))

  return Promise.all([answersP, contributorsP, writeContributorsP]).then(
    res => {
      const answers = res[0]
      const contributors = res[1]
      return {
        username: answers.username,
        contributions: answers.contributions,
        contributors,
        newContributor: isNewContributor(
          options.contributors,
          answers.username,
        ),
      }
    },
    //eslint-disable-next-line no-console
    err => console.error('contributors fail: ', err),
  )
}

const _ = require('lodash/fp')
const formatBadge = require('./format-badge')
const formatContributor = require('./format-contributor')

const badgeRegex = /\[!\[All Contributors\]\([a-zA-Z0-9\-./_:?=]+\)\]\(#\w+\)/

function injectListBetweenTags(newContent) {
  return function(previousContent) {
    const tagToLookFor = '<!-- ALL-CONTRIBUTORS-LIST:'
    const closingTag = '-->'
    const startOfOpeningTagIndex = previousContent.indexOf(
      `${tagToLookFor}START`,
    )
    const endOfOpeningTagIndex = previousContent.indexOf(
      closingTag,
      startOfOpeningTagIndex,
    )
    const startOfClosingTagIndex = previousContent.indexOf(
      `${tagToLookFor}END`,
      endOfOpeningTagIndex,
    )
    if (
      startOfOpeningTagIndex === -1 ||
      endOfOpeningTagIndex === -1 ||
      startOfClosingTagIndex === -1
    ) {
      return previousContent
    }
    return [
      previousContent.slice(0, endOfOpeningTagIndex + closingTag.length),
      '\n<!-- prettier-ignore -->',
      newContent,
      previousContent.slice(startOfClosingTagIndex),
    ].join('')
  }
}

function formatLine(contributors) {
   return `<td align="center">${contributors.join('</td><td align="center">')}</td>`
}


function formatFooter(options) {
  if (!options.linkToUsage) {
    return ''
  }
  const smallLogoURL = 'https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg'
  const linkToAllContributors = 'https://all-contributors.js.org'
  const linkToBotAdd = 'https://all-contributors.js.org/docs/en/bot/usage'

    return `<tr>
        <td size="13px" colspan="${options.contributorsPerLine}"><img src="${smallLogoURL}" > <a href="${linkToBotAdd}">Add your contribution</a></td>
    </tr>`
}

function generateContributorsList(options, contributors) {
  const tableFooter = formatFooter(options)

  return _.flow(
    _.map(function formatEveryContributor(contributor) {
      return formatContributor(options, contributor)
    }),
    _.chunk(options.contributorsPerLine),
    _.map(formatLine),
    _.join('</tr><tr>'),
    newContent => {
      return `\n<table><tbody><tr>${newContent}</tr>\n${tableFooter}\n</tbody></table>\n`
    },
  )(contributors)
}

function replaceBadge(newContent) {
  return function(previousContent) {
    const regexResult = badgeRegex.exec(previousContent)
    if (!regexResult) {
      return previousContent
    }
    return (
      previousContent.slice(0, regexResult.index) +
      newContent +
      previousContent.slice(regexResult.index + regexResult[0].length)
    )
  }
}

module.exports = function generate(options, contributors, fileContent) {
  const contributorsList =
    contributors.length === 0
      ? '\n'
      : generateContributorsList(options, contributors)
  const badge = formatBadge(options, contributors)
  return _.flow(
    injectListBetweenTags(contributorsList),
    replaceBadge(badge),
  )(fileContent)
}

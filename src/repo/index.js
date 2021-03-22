const githubAPI = require('./github')
const gitlabAPI = require('./gitlab')

const privateToken = (process.env && (process.env.ALL_CONTRIBUTORS_PRIVATE_TOKEN || process.env.PRIVATE_TOKEN)) || ''
const SUPPORTED_REPO_TYPES = {
  github: {
    value: 'github',
    name: 'GitHub',
    checkKey: 'login',
    defaultHost: 'https://github.com',
    linkToCommits:
      '<%= options.repoHost || "https://github.com" %>/<%= options.projectOwner %>/<%= options.projectName %>/commits?author=<%= contributor.login %>',
    linkToIssues:
      '<%= options.repoHost || "https://github.com" %>/<%= options.projectOwner %>/<%= options.projectName %>/issues?q=author%3A<%= contributor.login %>',
    linkToReviews:
      '<%= options.repoHost || "https://github.com" %>/<%= options.projectOwner %>/<%= options.projectName %>/pulls?q=is%3Apr+reviewed-by%3A<%= contributor.login %>',
    getUserInfo: githubAPI.getUserInfo,
    getContributors: githubAPI.getContributors,
  },
  gitlab: {
    value: 'gitlab',
    name: 'GitLab',
    checkKey: 'name',
    defaultHost: 'https://gitlab.com',
    linkToCommits:
      '<%= options.repoHost || "https://gitlab.com" %>/<%= options.projectOwner %>/<%= options.projectName %>/commits/master',
    linkToIssues:
      '<%= options.repoHost || "https://gitlab.com" %>/<%= options.projectOwner %>/<%= options.projectName %>/issues?author_username=<%= contributor.login %>',
    linkToReviews:
      '<%= options.repoHost || "https://gitlab.com" %>/<%= options.projectOwner %>/<%= options.projectName %>/merge_requests?scope=all&state=all&approver_usernames[]=<%= contributor.login %>',
    getUserInfo: gitlabAPI.getUserInfo,
    getContributors: gitlabAPI.getContributors,
  },
}

const getChoices = function() {
  return Object.keys(SUPPORTED_REPO_TYPES)
    .map(key => SUPPORTED_REPO_TYPES[key])
    .map(item => {
      return {
        value: item.value,
        name: item.name,
      }
    })
}

const getHostname = function(repoType, repoHost) {
  if (repoHost) {
    return repoHost
  } else if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].defaultHost
  }
  return null
}

const getCheckKey = function(repoType) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].checkKey
  }
  return null
}

const getTypeName = function(repoType) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].name
  }
  return null
}

const getLinkToCommits = function(repoType) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].linkToCommits
  }
  return null
}

const getLinkToIssues = function(repoType) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].linkToIssues
  }
  return null
}

const getLinkToReviews = function(repoType) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].linkToReviews
  }
  return null
}

const getUserInfo = function(username, repoType, repoHost) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].getUserInfo(
      username,
      getHostname(repoType, repoHost),
      privateToken,
    )
  }
  return null
}

const getContributors = function(owner, name, repoType, repoHost) {
  if (repoType in SUPPORTED_REPO_TYPES) {
    return SUPPORTED_REPO_TYPES[repoType].getContributors(
      owner,
      name,
      getHostname(repoType, repoHost),
      privateToken,
    )
  }
  return null
}

module.exports = {
  getChoices,
  getHostname,
  getCheckKey,
  getTypeName,
  getLinkToCommits,
  getLinkToIssues,
  getLinkToReviews,
  getUserInfo,
  getContributors,
}

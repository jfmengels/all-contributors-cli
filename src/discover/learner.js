const {existsSync} = require('fs')
const Learner = require('ac-learn')

const JSON_PATH = `${__dirname}/learner.json`

async function getLearner() {
  const learner = new Learner()

  try {
    if (existsSync(JSON_PATH)) {
      learner.classifier = await learner.loadAndDeserializeClassifier(JSON_PATH)
    } else {
      learner.crossValidate(6)
      learner.eval()

      await learner.serializeAndSaveClassifier(JSON_PATH)
    }
  } catch (e) {
    /* eslint-disable no-console */
    console.error(e)
  }

  return learner
}

module.exports = {
  getLearner,
}

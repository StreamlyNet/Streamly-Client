var TagCloudController = require('../controllers/tagCloud')

var compareTags = (previousTags, currentTags) => {
  var matches = []
  var tagsToBeUpdated = []

  if(currentTags.length === 0) {
    previousTags.forEach((tag, index) => {
        tagsToBeUpdated.push(decrementWeight(tag))
    })
    return tagsToBeUpdated;
  }

  currentTags.forEach((tag) => {
    var tempIndex = previousTags.indexOf(tag)
    if(tempIndex !== -1) {
      matches.push(tempIndex)
    }
    if(tempIndex === -1){
      tagsToBeUpdated.push(incrementWeight(tag))
    }
  })
  previousTags.forEach((tag, index) => {
    if(matches.indexOf(index) === -1){
      tagsToBeUpdated.push(decrementWeight(tag))
    }
  })

  return tagsToBeUpdated
}

var createOrUpdateTags = (tagsArr) => {
  tagsArr.forEach((data) => {
    TagCloudController.createOrUpdateTags(data, (err, result) => {
      if(err) {
        console.log('Error occured when creating/updating tag')
      }
      else {
        console.log('Created/Updated tag')
      }
    })
  })
}

var incrementArr = (tagArr) => {
  var tempArr = []

  tagArr.forEach((tag) => {
    tempArr.push(incrementWeight(tag))
  })

  return tempArr
}

var decrementArr = (tagArr) => {
  var tempArr = []

  tagArr.forEach((tag) => {
    tempArr.push(decrementWeight(tag))
  })

  return tempArr
}

var incrementWeight = (tag) => {
  return {
    text: tag,
    weight: 1
  }
}

var decrementWeight = (tag) => {
  return {
    text: tag,
    weight: -1
  }
}


module.exports = {
  compareTags: compareTags,
  createOrUpdateTags: createOrUpdateTags,
  incrementArr: incrementArr,
  decrementArr: decrementArr
}

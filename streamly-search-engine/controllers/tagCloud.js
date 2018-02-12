var TagCloud= require('../models/tagCloud')

//WIll be initiated on server restart
TagCloud.removeUnusedTags()

var createOrUpdateTags = (data, callback) => {
  TagCloud.findOneAndUpdate({text: data.text},{$inc: { weight: data.weight}}, {upsert: true}, (err, result) => {
    if(err) {
      return callback(err)
    }
    return callback(null, result)
  })
}

var getTags = (tag, callback) => {
  TagCloud.find({weight: {$gt: 0}}, {_id: 0, text: 1, weight: 1})
          .sort({weight:'desc'})
          .limit(20)
          .exec((err,result) => {
            if(err) {
              return callback(err)
            }

            return callback(null, result)
          })
}

module.exports = {
  createOrUpdateTags: createOrUpdateTags,
  getTags: getTags
}

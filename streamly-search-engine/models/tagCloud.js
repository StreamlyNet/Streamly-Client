var mongoose = require('mongoose')

var TagCloudSchema = new mongoose.Schema({
    text: String,
    weight: Number
})

//This static method will be used to delete tags which have weight of 0 
TagCloudSchema.statics.removeUnusedTags = function() {
  return this.deleteMany({weight: {$lte: 0}}).
             exec((err, commandResult) => {
               if(err) {
                 console.log(err)
               }
               else{
                 if(commandResult.result.n !== 0) {
                   console.log('Deleted unused tags')
                 }
               }
             })
}

module.exports = mongoose.model('TagCloud', TagCloudSchema)

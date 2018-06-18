var mongoose = require('mongoose')
var globalMaxRep = 0;
var globalMaxPrice = 0;

var ListingSchema = new mongoose.Schema({
  termsAndConditions: String,
  refundPolicy: String,
  availability: Number,
  item: {
    title: String,
    description: String,
    tags: Array,
    categories: Array,
    nsfw: Boolean,
    images: [
      {
        _clientID: String,
        filename: String,
        original: String,
        large: String,
        medium: String,
        small: String,
        tiny: String
      }
    ],
    options: Array,
    skus: Array,
    price: Number,
    quantity: Number,
  },
  metadata: {
    contractType: String,
    format: String,
    expiry: String,
    pricingCurrency: String,
  },
  coupons: Array,
  reputation: Number,
  slug: String,
  peerID: String,
  searchContext: {
    tags:[String],
    words:[String],
  },
  profile: {
    peerID: String,
    avatarHashes: {
      large: String,
      medium: String,
      original: String,
      small: String,
      tiny: String
    },
    name: String
  },
  censored: Boolean
})

ListingSchema.statics.changeGlobalVariables = function(reputation, price, isEmpty) {
  if(!isEmpty) {
    if(globalMaxRep < reputation) {
      globalMaxRep = reputation
    }
    if(globalMaxPrice < price) {
      globalMaxPrice = price
    }
  }
  else{
    globalMaxRep = reputation;
    globalMaxPrice = price;
  }
}

ListingSchema.statics.changeGlobalVariablesOnDelete = function(reputation, price) {
  if(reputation === globalMaxRep) {
    globalMaxRep = 0;
  }
  if(price === globalMaxPrice) {
    globalMaxPrice = 0;
  }
  //Call getMaxReptationAndPrice to get update of the global globalVariables
  //if there are listings left
  return this.getMaxReputationAndPrice()
}


ListingSchema.statics.getGlobalVariables = function() {
  return {
    reputationMax: globalMaxRep,
    priceMax: globalMaxPrice
  }
}

ListingSchema.statics.getMaxReputationAndPrice = function(callback) {
  var that = this
  return this.aggregate([
      {
        $group: {
          _id: 0,
          reputation: {
            $max: '$reputation'
          },
          price: {
            $max: '$item.price'
          }
        }
      },
      //Exclude _id from group
      {
        $project: {
         _id: 0
        }
      }
  ]).exec((err, result) => {
    if(err) {
      return console.log(err)
    }
    if(result[0]) {
      that.changeGlobalVariables(result[0].reputation, result[0].price, false)
    }
    else{
      that.changeGlobalVariables(0, 0, true)
    }
  })
}

ListingSchema.query.byTag = function(tagArr) {
    return this.find({'searchContext.tags': {'$all': tagArr}})
}

ListingSchema.query.byWord = function(wordArr) {
    return this.find({'searchContext.words': {'$all': wordArr}})
}

ListingSchema.query.byTagAndWord = function(tagArr, wordArr) {
    return this.find({$and:[
                        {'searchContext.tags': {$all: tagArr}},
                        {'searchContext.words': {$all: wordArr}}
                      ]})
}

ListingSchema.query.inAll = function(data) {
  return this.find({censored: {$ne: true}})
}

ListingSchema.query.filtersAndPagination = function(data, callback) {
  return this.find().gte('reputation', data.reputationMin).lte('reputation', data.reputationMax)
             .gte('item.price', data.priceMin).lte('item.price', data.priceMax)
             .skip(data.pageNumber > 0 ? (data.pageNumber * data.pageSize) : 0)
             .limit(data.pageSize)
 }

 ListingSchema.query.ourSort = function(data) {
   if(data.sort === 'reputation') {
     return this.find().sort({
         'availability': 'desc',
         'reputation': data.order,
         'item.price': 'desc',
    })
   }
   else {
     return this.find().sort({
         'availability': 'desc',
         'item.price': data.order,
         'reputation': 'desc',
    })
   }
 }
module.exports = mongoose.model('Listing', ListingSchema)

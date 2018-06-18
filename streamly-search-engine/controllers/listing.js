var Listing = require('../models/listing')
var validateListingQuery = require('../utils/validate').validateListingQuery
var compareTags = require('../utils/tagHelper').compareTags
var createOrUpdateTags = require('../utils/tagHelper').createOrUpdateTags
var decrementArr = require('../utils/tagHelper').decrementArr

//Will be initiated on starting server, so globalListingsCount is updated
Listing.getMaxReputationAndPrice()

/*Query arguments:
REQUIRED:
  pageSize -> will be parsed to int
  pageNumber -> will be parsed to int
OPTIONAL:
  searchTerm -> expects strings(tags or words, tags are differentiated from words by the '#' in the beginning)
  reputationMax -> will be parsed to int, default is currentGlobalReputation
  reputationMin -> will be parsed to int, default is 0
  priceMax -> will be parsed to int, default is currentGlobalMaxPrice
  priceMin -> will be parsed to int, default is 0
  sort -> expects string('reputation' or 'price'), default is 'reputation'
  order -> expects string('asc' or 'desc'), default is 'desc'
*/
var getAll = (req, callback) => {

  req.query.isValidated = true;
  validateListingQuery(req.query, callback)
  var data = req.query

  if(!data.isValidated) {
    return
  }

  if(data.searchTerm.tags.length === 0 && data.searchTerm.words.length === 0) {
    Listing.find().inAll().ourSort(data).filtersAndPagination(data)
           .exec((err, result) => {
             if(err) {
               return callback(err)
             }

             return callback(null, result)
           })
  }
  else if(data.searchTerm.tags.length !== 0 && data.searchTerm.words.length === 0) {
    Listing.find().byTag(data.searchTerm.tags).ourSort(data).filtersAndPagination(data)
           .exec((err, result) => {
             if(err) {
               return callback(err)
             }

             return callback(null, result)
           })
  }
  else if(data.searchTerm.tags.length === 0 && data.searchTerm.words.length !== 0){
    Listing.find().byWord(data.searchTerm.words).ourSort(data).filtersAndPagination(data)
           .exec((err, result) => {
             if(err) {
               return callback(err)
             }

             return callback(null, result)
           })
  }
  else{
    Listing.find().byTagAndWord(data.searchTerm.tags, data.searchTerm.words).ourSort(data).filtersAndPagination(data)
           .exec((err, result) => {
             if(err) {
               return callback(err)
             }

             return callback(null, result)
           })
  }
}

var createOrUpdateListing = (body, callback) => {

  //Create search context field speed up search queries
  body.searchContext = {
    tags: [],
    words: []
  }
  if(body.item.tags) {
    body.item.tags.forEach((element) => {
      body.searchContext.tags.push(element.toLowerCase())
    })
  }
  if(body.item.description) {
    body.item.description.split(/\s/).forEach((element) => {
      body.searchContext.words.push(element.toLowerCase())
    })
  }
  if(body.item.title) {
    body.item.title.split(' ').forEach((element) => {
      body.searchContext.words.push(element.toLowerCase())
    })
  }

  // If listing doesn't exist, a new one will be created when upsert argument is set to true
  Listing.findOneAndUpdate({slug: body.slug}, body, {upsert: true}, (err, result) => {
    if(err) {
      return callback(err)
    }
    //Update tags collection, if there is tags array in the current data
    if(body.item.tags) {
      //If listing is updated, the query will return 'result' object,
      //which contains data before the update => compare tags before
      //the update and updated tags
      if(result) {
        var tagInfo = compareTags(result.item.tags, body.item.tags)
        createOrUpdateTags(tagInfo)
      }
      else {
        var tagInfo = compareTags([], body.item.tags)
        createOrUpdateTags(tagInfo)
      }
    }
    else{
      // If result is to be update with empty tags array => decrement every
      // previous tag with 1
      if(result) {
        var tagInfo = compareTags(result.item.tags, []);
        createOrUpdateTags(tagInfo);
      }
    }
    Listing.changeGlobalVariables(parseFloat(body.reputation), parseFloat(body.item.price), false)

    callback(null, result)
  })
}

var deleteListing = (body, callback) => {
  Listing.findOneAndRemove({slug: body.slug}, (err, result) => {
    if(err) {
      return callback(err)
    }
    if(result && result.item && result.item.tags && result.reputation){
      //Changes maxRep and maxPrice if the deleted listing was with one of them
      Listing.changeGlobalVariablesOnDelete(result.reputation, result.item.price)
      //Decrement tags count, which are related to the deleted listing
      var tagInfo = decrementArr(result.item.tags)
      createOrUpdateTags(tagInfo)
    }

    callback(null, result)
  })
}

var updateAvailabilityStatus = (body, callback) => {
  Listing.updateMany({"profile.peerID": body.peerID}, {availability: body.availability}, (err, result) => {
    if(err) {
      return callback(err)
    }

    callback(null, result)
  })
}

var getMaxReputationAndPrice = (callback) => {
    callback(null, Listing.getGlobalVariables())
}

//Update all lisitngs when peer has chaned his name, avatar or both
var updateProfile = (body, callback) => {
  Listing.updateMany({"profile.peerID": body.id}, {"profile.avatarHashes": body.avatarHashes, "profile.name": body.name}, (err, result) => {
    if(err) {
      return callback(err);
    }

    callback(null, result);
  })
}

var updateCensorship = (body, callback) => {
  var isString = false;

  if (body.censored !== 'true' && body.censored !== 'false') {
    return callback('Censored parameter must be boolean');
  }
  else {
    isString = true;
  }
  if (typeof body.censored !== 'boolean' && !isString) {
    return callback('Censored parameter must be boolean');
  }
  if (typeof body.slug !== 'string') {
    return callback('Slug parameter must be string');
  }
  if (body.censored === 'true') {
    body.censored = true;
  }
  else {
    body.censored = false;
  }
  Listing.findOneAndUpdate({slug: body.slug}, {$set : {censored: body.censored}}, (err, result) => {
    if (err) {
      return callback(err)
    }

    if (result === null) {
      return callback('Listing not found');
    }

    callback(null, result);
  })
}

module.exports = {
  //fucntions
  getAll: getAll,
  createOrUpdateListing: createOrUpdateListing,
  deleteListing: deleteListing,
  updateAvailabilityStatus: updateAvailabilityStatus,
  getMaxReputationAndPrice: getMaxReputationAndPrice,
  updateProfile: updateProfile,
  updateCensorship: updateCensorship,
}

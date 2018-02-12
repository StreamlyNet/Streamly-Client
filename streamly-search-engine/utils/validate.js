var Listing = require('../models/listing')
var separateSearchTerm = require('./searchHelper').separateSearchTerm

var validateListingQuery = (parameters, callback, isValidated) => {
  var globalVariables = Listing.getGlobalVariables()

  if(!parameters.searchTerm) {
    parameters.searchTerm = {
      tags: [],
      words: []
    }
  }
  else {
    parameters.searchTerm = separateSearchTerm(parameters.searchTerm)
  }
  if(!parameters.priceMin || isNaN(parameters.priceMin)) {
    parameters.priceMin = 0;
  }
  else {
    parameters.priceMin = parseFloat(parameters.priceMin)
  }
  if(!parameters.reputationMin || isNaN(parameters.reputationMin)) {
    parameters.reputationMin = 0;
  }
  else {
    parameters.reputationMin = parseInt(parameters.reputationMin)
  }
  if(!parameters.reputationMax || isNaN(parameters.reputationMax)) {
    parameters.reputationMax = globalVariables.reputationMax
  }
  else {
    parameters.reputationMax = parseInt(parameters.reputationMax)
  }
  if(!parameters.priceMax || isNaN(parameters.priceMax)) {
    parameters.priceMax = globalVariables.priceMax
  }
  else {
    parameters.priceMax = parseFloat(parameters.priceMax)
  }
  if(!parameters.pageSize || isNaN(parameters.pageSize)) {
    parameters.isValidated = false;
    return callback('400', 'Something went wrong, please refresh!');
  }
  else{
    parameters.pageSize = parseInt(parameters.pageSize)
  }
  if(!parameters.pageNumber || isNaN(parameters.pageNumber)) {
    parameters.isValidated = false;
    return callback('400', 'Something went wrong, please refresh!');
  }
  else {
    parameters.pageNumber = parseInt(parameters.pageNumber)
  }
  if(!parameters.sort || parameters.sort !== 'price'){
    parameters.sort = 'reputation'
  }
  if(!parameters.order || parameters.order !== 'asc') {
    parameters.order = 'desc'
  }
}

module.exports = {
  validateListingQuery: validateListingQuery,
}

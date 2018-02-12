
var separateSearchTerm = (searchTerm) => {
    var newSearchTerm = {}
    newSearchTerm.tags = []
    newSearchTerm.words = []
    searchTerm = searchTerm.trim().split(' ')
    
    searchTerm.forEach((element) => {
      if(element.indexOf('#') !== -1) {
        //remove # from element
        newSearchTerm.tags = newSearchTerm.tags.concat(element.substring(1).toLowerCase())
      }
      else{
        newSearchTerm.words = newSearchTerm.words.concat(element.toLowerCase())
      }
    })
    return newSearchTerm

}

module.exports = {
  separateSearchTerm: separateSearchTerm
}

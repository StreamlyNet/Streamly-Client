import $ from 'jquery';

const host = '45.76.95.99';
const port = 5002;

const endpoints = {
  postListing: `http://${host}:${port}/listing`,
  deleteListing: `http://${host}:${port}/listing`,
  getAllListings: `http://${host}:${port}/listing/all`,
  getMaxReputationAndPrice: `http://${host}:${port}/listing/maxRepAndPrice`,
  getTagCloud: `http://${host}:${port}/tagcloud/all`,
  updateProfile: `http://${host}:${port}/listing/profile`,
  updateCensorship: `http://${host}:${port}/listing/censorship`,
};

export function sendData(data) {
  $.ajax({
    url: endpoints.postListing,
    data: data,
    type: 'POST',
  });
}

export function deleteListing(slug) {
  $.ajax({
    url: endpoints.deleteListing,
    data: {slug: slug},
    type: 'DELETE',
  });
}

export function getListings(data) {
    var url = endpoints.getAllListings + '?pageSize=' + data.pageSize + '&pageNumber=' + data.pageNumber;
    if(data.searchTerm){
        url += '&searchTerm=' + encodeURIComponent(data.searchTerm);
    }
    if(data.reputationMax){
        url += '&reputationMax=' + data.reputationMax;
    }
    if(data.reputationMin){
        url += '&reputationMin=' + data.reputationMin;
    }
    if(data.priceMax){
        url += '&priceMax=' + data.priceMax;
    }
    if(data.priceMin){
        url += '&priceMin=' + data.priceMin;
    }
    if(data.sort){
        url += '&sort=' + data.sort;
    }
    if(data.order){
        url += '&order=' + data.order;
    }
  return $.ajax({
    url: url,
    type: 'GET',
});
}

export function getMaxReputationAndPrice() {
  return $.ajax({
    url: endpoints.getMaxReputationAndPrice,
    type: 'GET'
  });
}

export function getTagCloud() {
  return $.ajax({
    url: endpoints.getTagCloud,
    type: 'GET',
  });
}

export function updateProfile(data) {
  return $.ajax({
    url: endpoints.updateProfile,
    data: data,
    type: 'PUT',
  });
}

export function updateCensorship(data) {
  return $.ajax({
    url: endpoints.updateCensorship,
    type: 'PUT',
    data: data,
  })
}

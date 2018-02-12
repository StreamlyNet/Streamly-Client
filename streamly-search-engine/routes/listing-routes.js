var express = require('express')
var ListingController = require('../controllers/listing')
var router = express.Router()

router.get('/all', (req, res) => {
  ListingController.getAll(req, (err, result) => {
    if(err) {
      return res.status('400').json({error: result})
    }
    else {
      return res.json(result)
    }
  })
})

router.get('/maxRepAndPrice', (req, res) => {
  ListingController.getMaxReputationAndPrice((err, result) => {
    if(err) {
      return res.status('400').json({error: err})
    }
    else {
      return res.json(result)
    }
  })
})

router.post('/', (req, res) => {
  ListingController.createOrUpdateListing(req.body, (err, result) => {
    if(err) {
      return res.status('400').json({error: err})
    }

    return res.status('200').send('Listing created/updated')
  })
})

router.put('/availabilityStatus', (req, res) => {
  ListingController.updateAvailabilityStatus(req.body, (err, result) => {
    if(err) {
    }

    return res.status('200').send('Availability updated')
  })
})

router.delete('/', (req, res) => {
  ListingController.deleteListing(req.body, (err, result) => {
    if(err) {
      return res.status('400').json({error: err})
    }
    if(!result) {
      return res.status('404').send('Listing not found')
    }
    return res.status('200').send('Listing deleted')
  })
})

router.put('/profile', (req, res) => {
  ListingController.updateProfile(req.body, (err, result) => {
    if(err) {
      return res.status('400'.json({error: err}))
    }

    return res.status('200').send('Listings updated')
  })
})

module.exports = router

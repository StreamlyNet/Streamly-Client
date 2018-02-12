var router = require('express').Router()
var listingRoutes = require('./listing-routes')
var tagcloudRoutes = require('./tagcloud-routes')

router.use('/listing', listingRoutes)
router.use('/tagcloud', tagcloudRoutes)

module.exports = router

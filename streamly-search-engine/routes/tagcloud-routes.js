var express = require('express')
var TagCloudController = require('../controllers/tagCloud')
var router = express.Router()

router.get('/all', (req, res) => {
  TagCloudController.getTags(req, (err, result) => {
    if(err) {
      return res.status('400').json({error: err})
    }

    else {
      return res.json(result)
    }
  })
})

module.exports = router

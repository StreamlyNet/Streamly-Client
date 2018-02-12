const express = require('express')
const routes = require('../routes/index-route')
const db = require('./db')
const config = require('./config')
const bodyParser = require('body-parser')

const app = express()

var httpPort = config.app.port

app.set('port', httpPort)

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/', routes)

module.exports = app

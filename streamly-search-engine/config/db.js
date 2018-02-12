const mongoose = require('mongoose')
const config = require('./config')

var connect = () => {
  var instance = `mongodb://${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.dbName}`

  mongoose.connect(instance, {useMongoClient: true})

  mongoose.connection.on('connected', () => {
    console.log('Mongoose connection established on:' + instance)
  })

  mongoose.connection.on('error', function(err) {
    log.error('Mongoose connection error: ' + err);
  });

  mongoose.connection.on('disconnected', function() {
    log.info('Mongoose connection disconnected');
  });
}

var disconnect = () => {
  mongoose.disconnect()
}

module.exports = {
  connect: connect,
  disconnect: disconnect
}

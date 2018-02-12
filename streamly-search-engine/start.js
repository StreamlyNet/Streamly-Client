const db = require('./config/db')
const app = require('./config/app')

db.connect()

var server = app.listen(app.get('port'), () => {
  console.log('Express server listening on ' + server.address().port)
})

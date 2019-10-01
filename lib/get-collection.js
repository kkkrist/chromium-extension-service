const MongoClient = require('mongodb').MongoClient
const url = require('url')

let _col = null

module.exports = async uri => {
  if (_col) return _col

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  const db = await client.db(url.parse(uri).pathname.substr(1))

  return (_col = await db.collection('extensions'))
}

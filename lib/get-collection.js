const MongoClient = require('mongodb').MongoClient
const url = require('url')

const cache = []

module.exports = async (uri, collection = 'extensions') => {
  if (cache[collection]) return cache[collection]

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  const db = await client.db(url.parse(uri).pathname.substr(1))

  return (cache[collection] = await db.collection(collection))
}

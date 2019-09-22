const _get = require('lodash.get')
const MongoClient = require('mongodb').MongoClient
const fetch = require('node-fetch')
const url = require('url')
const xmltwojs = require('xmltwojs')

const cache = []
let col = null

const connectToDatabase = async uri => {
  if (col) return col

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  const db = await client.db(url.parse(uri).pathname.substr(1))

  return (col = await db.collection('extensions'))
}

const getFreshEntry = async (url, extensionId, prodversion) => {
  const x = encodeURIComponent(`id=${extensionId}&uc`)
  const xml = await fetch(`${url}?x=${x}&prodversion=${prodversion}`).then(
    req => req.text()
  )

  return {
    extensionId,
    prodversion,
    timestamp: new Date().getTime(),
    url,
    ..._get(xmltwojs.parse(xml), 'gupdate.app.updatecheck', {})
  }
}

const updateCache = (extensionId, prodversion, newEntry) => {
  const index = cache.findIndex(
    entry =>
      entry.extensionId === extensionId && entry.prodversion === prodversion
  )

  return index > -1
    ? (cache[index] = newEntry)
    : cache.push(newEntry) && newEntry
}

module.exports = async (req, res) => {
  const { extensionId, prodversion, url } = req.query

  if (!extensionId || !prodversion || !url)
    return res.status(400).json({ error: 'Missing args!' })

  const cachedEntry = cache.find(
    entry =>
      entry.extensionId === extensionId && entry.prodversion === prodversion
  )

  try {
    const extensions = await connectToDatabase(process.env.MONGODB_URI)
    const entry =
      cachedEntry || (await extensions.findOne({ extensionId, prodversion }))

    if (entry && entry.timestamp + 10000 > new Date().getTime()) {
      return res.status(200).json(entry)
    } else {
      const freshEntry = await getFreshEntry(url, extensionId, prodversion)
      const { value } = await extensions.findOneAndUpdate(
        { extensionId, prodversion },
        { $set: freshEntry },
        { returnOriginal: false, upsert: true }
      )

      return res.status(200).json(updateCache(extensionId, prodversion, value))
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

// http://localhost:3000/api/?extensionId=chlffgpmiacpedhhbkiomidkjlcfhogd&prodversion=77.0.3865.90&url=https://clients2.google.com/service/update2/crx
// https://chrome-extension-service.info29.now.sh/api?extensionId=chlffgpmiacpedhhbkiomidkjlcfhogd&prodversion=77.0.3865.90&url=https://clients2.google.com/service/update2/crx

const _get = require('lodash.get')
const MongoClient = require('mongodb').MongoClient
const fetch = require('node-fetch')
const url = require('url')
const xmltwojs = require('xmltwojs')

let _cache = null
let _col = null

const addIfNew = (arr = [], item) =>
  item === undefined ? arr : [...new Set([...arr]).add(item)]

const getCollection = async uri => {
  if (_col) return _col

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  const db = await client.db(url.parse(uri).pathname.substr(1))

  return (_col = await db.collection('extensions'))
}

const getFreshEntries = async (updateUrl, ids, prodversion) => {
  const x = ids.map(id => `x=${encodeURIComponent(`id=${id}&uc`)}`)
  const xml = await fetch(
    `${updateUrl}?${x.join('&')}&prodversion=${prodversion}`
  ).then(req => req.text())
  const app = _get(xmltwojs.parse(xml), 'gupdate.app', [])

  return app.map(a => ({
    id: a.appid,
    prodversion,
    timestamp: new Date().getTime(),
    updateUrl,
    ...a.updatecheck
  }))
}

const updateCache = async (fresh, prodversion) => {
  const col = await getCollection(process.env.MONGODB_URI)

  const freshDb = (await Promise.all(
    fresh.map(item =>
      col.findOneAndUpdate(
        { id: item.id, prodversion },
        { $set: item },
        { returnOriginal: false, upsert: true }
      )
    )
  ))
    .map(({ value }) => value)
    .flat()

  freshDb.forEach(item => {
    const index = _cache.findIndex(({ id }) => id === item.id)
    if (index > -1) {
      _cache[index] = item
    } else {
      _cache.push(item)
    }
  })

  return freshDb
}

module.exports = async (req, res) => {
  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { extensions, prodversion } = body || {}

    if (!Array.isArray(extensions) || !prodversion) {
      return res.status(400).json({ error: 'Missing args!' })
    }

    if (!_cache) {
      const col = await getCollection(process.env.MONGODB_URI)
      _cache = (await col.find().toArray()) || []
    }

    const cached = _cache.filter(
      c =>
        extensions.find(ext => ext.id === c.id) &&
        c.prodversion === prodversion &&
        c.timestamp + 10000 > new Date().getTime()
    )

    const jobs = extensions
      .filter(ext => !cached.find(ce => ce.id === ext.id))
      .reduce((acc, { id, updateUrl }) => {
        if (updateUrl) {
          acc[updateUrl] = addIfNew(acc[updateUrl], id)
        }
        return acc
      }, {})

    const fresh = (await Promise.all(
      Object.keys(jobs).map(
        updateUrl =>
          updateUrl && getFreshEntries(updateUrl, jobs[updateUrl], prodversion)
      )
    )).flat()

    return res
      .status(200)
      .json([...cached, ...(await updateCache(fresh, prodversion))])
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

const _flatten = require('lodash.flatten')
const _get = require('lodash.get')
const fetch = require('node-fetch')
const xmltwojs = require('xmltwojs')
const getCollection = require('../lib/get-collection')

let _cache = null

const addIfNew = (arr = [], item) =>
  item === undefined ? arr : [...new Set([...arr]).add(item)]

const getFreshEntries = async (updateUrl, ids, prodversion) => {
  if (updateUrl.match(/^github:/)) {
    const repo = updateUrl.replace(/^github:/, '')
    const manifest = await fetch(
      `https://raw.githubusercontent.com/${repo}/master/manifest.json`
    ).then(res => res.json())

    return [
      {
        codebase: `https://github.com/${repo}/archive/v${manifest.version}.zip`,
        id: ids[0],
        prodversion,
        timestamp: new Date().getTime(),
        updateUrl,
        version: manifest.version
      }
    ]
  }

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

  const freshDb = _flatten(
    (await Promise.all(
      fresh.map(item =>
        col.findOneAndUpdate(
          { id: item.id, prodversion },
          { $set: item },
          { returnOriginal: false, upsert: true }
        )
      )
    )).map(({ value }) => value)
  )

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
    const { extensions, prodversion } = req.body || {}

    if (req.method === 'OPTIONS') {
      return res.status(200).json({})
    }

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
        c.timestamp + 30 * 60 * 1000 > new Date().getTime()
    )

    const jobs = extensions
      .filter(ext => !cached.find(ce => ce.id === ext.id))
      .reduce((acc, { id, updateUrl }) => {
        if (updateUrl) {
          acc[updateUrl] = addIfNew(acc[updateUrl], id)
        }
        return acc
      }, {})

    const fresh = _flatten(
      await Promise.all(
        Object.keys(jobs).map(
          updateUrl =>
            updateUrl &&
            getFreshEntries(updateUrl, jobs[updateUrl], prodversion)
        )
      )
    )

    return res
      .status(200)
      .json([...cached, ...(await updateCache(fresh, prodversion))])
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

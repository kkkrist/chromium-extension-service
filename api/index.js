const _flatten = require('lodash.flatten')
const _get = require('lodash.get')
const fetch = require('node-fetch')
const xmltwojs = require('xmltwojs')
const getCollection = require('../lib/get-collection')

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

  const x = ids.map(id => `x=${encodeURIComponent(`id=${id}&uc`)}`).join('&')
  const xml = await fetch(
    `${updateUrl}?acceptformat=crx2,crx3&prodversion=${prodversion}&${x}`
  ).then(req => req.text())

  try {
    const app = _get(
      xmltwojs.parse(xml),
      'gupdate.app',
      ids.map(id => ({ id }))
    )

    return (Array.isArray(app) ? app : [app])
      .filter(({ updatecheck }) => updatecheck && updatecheck.version)
      .map(({ appid, updatecheck, ...rest }) => ({
        ...updatecheck,
        ...rest,
        id: appid,
        prodversion,
        timestamp: new Date().getTime(),
        updateUrl
      }))
  } catch (error) {
    console.error(error.message, ids, xml.substring(0, 150))
    throw error
  }
}

const updateDb = async (fresh, prodversion) => {
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

  return freshDb
}

module.exports = async (req, res) => {
  try {
    const { extensions, prodversion } = req.body || {}

    if (req.method === 'OPTIONS') {
      return res.status(204).json()
    }

    if (!Array.isArray(extensions) || !prodversion) {
      return res.status(400).json({ error: 'Missing args!' })
    }

    const jobs = extensions
      .reduce((acc, { id, updateUrl }) => {
        if (updateUrl) {
          acc[updateUrl] = addIfNew(acc[updateUrl], id)
        }
        return acc
      }, {})

    const fresh = _flatten(
      await Promise.allSettled(
        Object.keys(jobs).map(
          updateUrl =>
            updateUrl &&
            getFreshEntries(updateUrl, jobs[updateUrl], prodversion)
        )
      )
    )

    return res.status(200).json([
      ...(await updateDb(
        fresh
          .filter(({ status }) => status === 'fulfilled')
          .map(({ value }) => value)
          .flat(),
        prodversion
      ))
    ])
  } catch (error) {
    console.error(error, req.body)
    return res.status(500).json({ error: error.message })
  }
}

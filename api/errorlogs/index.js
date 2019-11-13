const hashSum = require('hash-sum')
const tokenthrottle = require('tokenthrottle')
const getCollection = require('../../lib/get-collection')

const throttle = tokenthrottle({
  rate: 2,
  window: 5 * 60 * 1000
})

module.exports = (req, res) => {
  try {
    if (req.method === 'OPTIONS') return res.end()

    const hashedIp = hashSum(
      req.headers['x-real-ip'] || req.connection.remoteAddress
    )

    return throttle.rateLimit(hashedIp, async (throttleError, throttled) => {
      if (throttleError) throw throttleError

      if (throttled)
        return res
          .status(429)
          .json({ error: 'Rate limit exceeded, please slow down.' })

      if (!req.body.error)
        return res.status(400).json({ error: 'Missing args!' })

      const col = await getCollection(process.env.MONGODB_URI, 'errorlogs')

      const report = {
        createdAt: new Date(),
        error: JSON.parse(req.body.error),
        hashedIp,
        userAgent: req.headers['user-agent']
      }

      await col.findOneAndUpdate(
        {
          error: report.error,
          hashedIp: report.hashedIp,
          userAgent: report.userAgent
        },
        { $set: report },
        { upsert: true }
      )

      return res.end()
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

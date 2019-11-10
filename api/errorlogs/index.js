const hashSum = require('hash-sum')
const tokenthrottle = require('tokenthrottle')
const getCollection = require('../../lib/get-collection')

const throttle = tokenthrottle({
  rate: 2,
  window: 5 * 60 * 1000
})

module.exports = (req, res) =>
  throttle.rateLimit(
    req.headers['x-real-ip'] || req.connection.remoteAddress,
    async (throttleError, limited) => {
      try {
        if (throttleError)
          return res.status(500).json({ error: throttleError.message })

        if (limited)
          return res
            .status(429)
            .json({ error: 'Rate limit exceeded, please slow down.' })

        if (req.method === 'OPTIONS') return res.end()

        const { message, stack } = req.body || {}

        if (!message || !stack)
          return res.status(400).json({ error: 'Missing args!' })

        const col = await getCollection(process.env.MONGODB_URI, 'errorlogs')

        const report = {
          createdAt: new Date(),
          message,
          ip: hashSum(req.headers['x-real-ip'] || req.connection.remoteAddress),
          stack,
          userAgent: req.headers['user-agent']
        }

        await col.insertOne(report)

        return res.end()
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: error.message })
      }
    }
  )

const getCollection = require('../../lib/get-collection')

const getPipeline = key => [
  {
    $group: {
      _id: `$${key}`,
      total: {
        $sum: 1
      },
      timestamp: {
        $max: '$timestamp'
      }
    }
  },
  {
    $sort: {
      total: -1,
      timestamp: -1
    }
  }
]

module.exports = async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return res.status(200).json({})
    }

    const col = await getCollection(process.env.MONGODB_URI)
    const [ids, prodversions] = await Promise.all([
      col.aggregate(getPipeline('id')).toArray(),
      col.aggregate(getPipeline('prodversion')).toArray()
    ])

    return res.status(200).json({ ids, prodversions })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

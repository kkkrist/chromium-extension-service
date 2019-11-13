const getCollection = require('../../lib/get-collection')

const pipeline = [
  {
    $group: {
      _id: '$id',
      prodversions: {
        $addToSet: '$prodversion'
      },
      timestamp: {
        $max: '$timestamp'
      },
      updateUrl: {
        $last: '$updateUrl'
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
      return res.status(200).json()
    }

    const col = await getCollection(process.env.MONGODB_URI)
    const data = await col.aggregate(pipeline).toArray()

    return res.status(200).json(data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}

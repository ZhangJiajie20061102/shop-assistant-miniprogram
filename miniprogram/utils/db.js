// utils/db.js
// 小程序端 get() 默认只返回 20 条（单次上限也是 20），
// 这里循环取到取完为止，避免列表和统计只算到前 20 条。

const PAGE_SIZE = 20

/**
 * 取全量数据
 * @param {string} collectionName 集合名
 * @param {object} options { where, orderBy: [field, 'desc'|'asc'] }
 * @returns {Promise<Array>}
 */
async function fetchAll(collectionName, options = {}) {
  const db = wx.cloud.database()
  const result = []

  while (true) {
    let query = db.collection(collectionName)

    if (options.where) {
      query = query.where(options.where)
    }
    if (options.orderBy) {
      query = query.orderBy(options.orderBy[0], options.orderBy[1] || 'desc')
    }

    const res = await query.skip(result.length).limit(PAGE_SIZE).get()
    result.push(...res.data)

    if (res.data.length < PAGE_SIZE) {
      break
    }
  }

  return result
}

/**
 * 按日期范围过滤（用记录的 createTime 字段）
 * @param {Array} list
 * @param {number} days 0 表示不限
 */
function filterByDays(list, days) {
  if (!days) {
    return list
  }
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  from.setDate(from.getDate() - (days - 1))

  return list.filter(item => {
    if (!item.createTime) {
      return false
    }
    return new Date(item.createTime) >= from
  })
}

/** 金额保留两位（数字） */
function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

module.exports = {
  fetchAll,
  filterByDays,
  money
}

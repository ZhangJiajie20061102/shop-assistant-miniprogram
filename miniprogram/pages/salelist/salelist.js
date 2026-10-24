// pages/salelist/salelist.js
const { fetchAll, filterByDays, money } = require('../../utils/db')

const RANGES = [
  { label: '今天', days: 1 },
  { label: '近 7 天', days: 7 },
  { label: '近 30 天', days: 30 },
  { label: '全部', days: 0 }
]

Page({
  data: {
    ranges: RANGES,
    rangeLabels: RANGES.map(item => item.label),
    rangeIndex: 1,
    allSales: [],     // 全量销售记录
    sales: [],        // 当前筛选范围
    totalAmount: '0.00',
    totalQuantity: 0,
    totalProfit: '0.00',
    loading: true
  },

  onShow() {
    this.loadSales()
  },

  onPullDownRefresh() {
    this.loadSales().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 取全量（原来只取到 20 条，汇总数字会偏小）
  loadSales() {
    this.setData({ loading: true })

    return fetchAll('sale', { orderBy: ['createTime', 'desc'] })
      .then(list => {
        this.setData({
          allSales: list,
          loading: false
        })
        this.applyRange()
      })
      .catch(err => {
        console.error('加载销售记录失败', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败，请下拉重试', icon: 'none' })
      })
  },

  onRangeChange(e) {
    this.setData({
      rangeIndex: Number(e.detail.value)
    }, () => {
      this.applyRange()
    })
  },

  applyRange() {
    const days = this.data.ranges[this.data.rangeIndex].days
    const filtered = filterByDays(this.data.allSales, days)

    let totalAmount = 0
    let totalQuantity = 0
    let totalProfit = 0

    const sales = filtered.map(item => {
      totalAmount += Number(item.total) || 0
      totalQuantity += Number(item.quantity) || 0
      totalProfit += (Number(item.total) || 0) - (Number(item.buyPrice) || 0) * (Number(item.quantity) || 0)

      let timeText = ''
      if (item.createTime) {
        const date = new Date(item.createTime)
        timeText = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
      }

      return Object.assign({}, item, { timeText })
    })

    this.setData({
      sales,
      totalAmount: money(totalAmount).toFixed(2),
      totalQuantity,
      totalProfit: money(totalProfit).toFixed(2)
    })
  }
})

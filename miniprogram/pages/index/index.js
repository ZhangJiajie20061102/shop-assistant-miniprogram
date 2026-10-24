const { fetchAll, filterByDays, money } = require('../../utils/db')

const LOW_STOCK = 5

Page({
  data: {
    todayAmount: '0.00',
    todayOrders: 0,
    lowStockCount: 0,
    loading: true
  },

  onShow() {
    this.loadOverview()
  },

  async loadOverview() {
    try {
      const [sales, products] = await Promise.all([
        fetchAll('sale', { orderBy: ['createTime', 'desc'] }),
        fetchAll('product')
      ])

      const todaySales = filterByDays(sales, 1)
      let amount = 0
      todaySales.forEach(item => {
        amount += Number(item.total) || 0
      })

      const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= LOW_STOCK).length

      this.setData({
        todayAmount: money(amount).toFixed(2),
        todayOrders: todaySales.length,
        lowStockCount: lowStockCount,
        loading: false
      })
    } catch (err) {
      console.error('加载概览失败', err)
      this.setData({ loading: false })
    }
  },

  goProduct() {
    wx.navigateTo({ url: '/pages/product/product' })
  },

  goPurchase() {
    wx.navigateTo({ url: '/pages/purchase/purchase' })
  },

  goSaleList() {
    wx.navigateTo({
      url: '/pages/salelist/salelist'
    })
  },

  goStatistics() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    })
  }
})

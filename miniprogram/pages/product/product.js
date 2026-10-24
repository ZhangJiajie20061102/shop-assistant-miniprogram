const { fetchAll } = require('../../utils/db')

const db = wx.cloud.database()
const LOW_STOCK = 5

Page({

  data: {
    products: [],       // 全量商品
    filtered: [],       // 按关键词过滤后的列表
    keyword: '',
    loading: true,
    lowStock: LOW_STOCK
  },

  onShow() {
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.loadProducts().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 取全量（修掉原来只取 20 条的问题）
  loadProducts() {
    this.setData({ loading: true })

    return fetchAll('product', { orderBy: ['createTime', 'desc'] })
      .then(list => {
        this.setData({
          products: list,
          loading: false
        })
        this.applyFilter()
      })
      .catch(err => {
        console.error('读取商品失败', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '读取失败，请下拉重试',
          icon: 'none'
        })
      })
  },

  // 关键词本地过滤（名称 / 类别），不用再请求云数据库
  applyFilter() {
    const keyword = (this.data.keyword || '').trim().toLowerCase()

    if (!keyword) {
      this.setData({ filtered: this.data.products })
      return
    }

    const filtered = this.data.products.filter(item => {
      const name = (item.name || '').toLowerCase()
      const category = (item.category || '').toLowerCase()
      return name.indexOf(keyword) > -1 || category.indexOf(keyword) > -1
    })

    this.setData({ filtered })
  },

  onKeywordInput(e) {
    this.setData({
      keyword: e.detail.value
    }, () => {
      this.applyFilter()
    })
  },

  clearKeyword() {
    this.setData({ keyword: '' }, () => {
      this.applyFilter()
    })
  },

  goToAdd() {
    wx.navigateTo({
      url: '/pages/addProduct/addProduct'
    })
  },

  // 编辑商品
  goEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/addProduct/addProduct?id=${id}`
    })
  },

  // 跳转到销售页
  goSale(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/sale/sale?id=${id}`
    })
  },

  deleteProduct(e) {

    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name

    wx.showModal({
      title: '确认删除',
      content: `确定删除「${name}」吗？历史销售和进货记录会保留在统计里。`,

      success: res => {

        if (!res.confirm) {
          return
        }

        wx.showLoading({ title: '删除中...' })

        db.collection('product')
          .doc(id)
          .remove()
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除成功' })
            this.loadProducts()
          })
          .catch(err => {
            wx.hideLoading()
            console.error('删除商品失败', err)
            wx.showToast({
              title: '删除失败，请检查数据库权限',
              icon: 'none'
            })
          })

      }

    })

  }

})

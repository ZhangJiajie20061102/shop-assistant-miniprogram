const db = wx.cloud.database()
const _ = db.command

// 搜索防抖，避免每敲一个字就查一次库
const SEARCH_DELAY = 300

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

Page({
  data: {
    searchKey: '',
    results: [],
    searching: false,
    selectedProduct: null,
    quantity: '',
    price: '',
    submitting: false
  },

  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
  },

  searchInput(e) {
    const key = e.detail.value
    this.setData({ searchKey: key })

    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }

    if (!key.trim()) {
      this.setData({ results: [], searching: false })
      return
    }

    this.setData({ searching: true })

    this.searchTimer = setTimeout(() => {
      this.doSearch(key.trim())
    }, SEARCH_DELAY)
  },

  // 模糊匹配名称，最多返回 10 条
  doSearch(keyword) {
    db.collection('product')
      .where({
        name: db.RegExp({
          regexp: escapeRegExp(keyword),
          options: 'i'
        })
      })
      .limit(10)
      .get()
      .then(res => {
        this.setData({
          results: res.data,
          searching: false
        })

        if (res.data.length === 0) {
          wx.showToast({ title: '没有匹配的商品', icon: 'none' })
        }
      })
      .catch(err => {
        console.error('搜索商品失败', err)
        this.setData({ searching: false })
        wx.showToast({ title: '搜索失败', icon: 'none' })
      })
  },

  // 从搜索结果里选一个商品
  selectProduct(e) {
    const index = e.currentTarget.dataset.index
    const product = this.data.results[index]

    this.setData({
      selectedProduct: product,
      results: [],
      searchKey: product.name,
      price: product.buyPrice ? String(product.buyPrice) : ''
    })
  },

  clearSelected() {
    this.setData({
      selectedProduct: null,
      searchKey: '',
      results: [],
      price: ''
    })
  },

  quantityInput(e) { this.setData({ quantity: e.detail.value }) },
  priceInput(e) { this.setData({ price: e.detail.value }) },

  async submitPurchase() {
    const { selectedProduct, quantity, price, submitting } = this.data

    if (submitting) {
      return
    }
    if (!selectedProduct) {
      return wx.showToast({ title: '请先选择商品', icon: 'none' })
    }

    const qty = parseFloat(quantity)
    const unitPrice = parseFloat(price)

    if (!quantity || !(qty > 0)) {
      return wx.showToast({ title: '请输入有效数量', icon: 'none' })
    }
    if (!price || !(unitPrice > 0)) {
      return wx.showToast({ title: '请输入有效单价', icon: 'none' })
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '处理中...', mask: true })

    const productId = selectedProduct._id

    try {
      // 1. 增加商品库存
      await db.collection('product').doc(productId).update({
        data: { stock: _.inc(qty) }
      })

      // 2. 记录进货流水；失败就把库存退回去，保证账实一致
      try {
        await db.collection('purchase').add({
          data: {
            productId,
            productName: selectedProduct.name,
            quantity: qty,
            price: unitPrice,
            total: Math.round(qty * unitPrice * 100) / 100,
            createTime: new Date()
          }
        })
      } catch (addErr) {
        await db.collection('product').doc(productId).update({
          data: { stock: _.inc(-qty) }
        }).catch(() => {})
        throw addErr
      }

      wx.hideLoading()
      wx.showToast({ title: '进货成功 ✅' })

      // 更新页面上的库存数字，避免立刻再进货时看到旧值
      const product = Object.assign({}, selectedProduct, {
        stock: (selectedProduct.stock || 0) + qty
      })

      this.setData({
        selectedProduct: product,
        quantity: '',
        submitting: false
      })
    } catch (err) {
      wx.hideLoading()
      console.error('进货失败', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  }
})

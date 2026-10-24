// pages/sale/sale.js
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    productId: '',
    productName: '',
    currentStock: 0,
    quantity: 1,
    salePrice: '',
    total: '0.00',
    maxStock: 0,
    buyPrice: 0,       // 用于记录成本
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadProduct(options.id)
    } else {
      wx.showToast({ title: '请从商品列表进入', icon: 'none' })
    }
  },

  loadProduct(id) {
    wx.showLoading({ title: '加载中...' })
    db.collection('product').doc(id).get()
      .then(res => {
        const p = res.data
        const stock = p.stock || 0
        // 早期新增的商品没有 stock 字段，条件扣减会匹配不到，这里记下来
        this.stockMissing = (p.stock === undefined)
        this.setData({
          productId: p._id,
          productName: p.name,
          currentStock: stock,
          maxStock: stock,
          // 库存为 0 时步进器的 max 不能是 0，给个下限避免组件报错
          quantity: stock > 0 ? 1 : 0,
          salePrice: p.salePrice ? p.salePrice.toString() : '',
          buyPrice: p.buyPrice || 0
        }, () => {
          this.calcTotal()
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error('加载商品失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 数量变化
  onQuantityChange(e) {
    this.setData({ quantity: e.detail }, () => {
      this.calcTotal()
    })
  },

  // 单价变化
  onPriceChange(e) {
    const val = (e.detail || '').trim()
    this.setData({ salePrice: val }, () => {
      this.calcTotal()
    })
  },

  // 计算合计
  calcTotal() {
    const qty = Number(this.data.quantity) || 0
    const price = parseFloat(this.data.salePrice) || 0
    const total = Math.round(qty * price * 100) / 100
    this.setData({ total: total.toFixed(2) })
  },

  // 提交销售
  submitSale() {
    const { productId, submitting } = this.data

    if (submitting) {
      return
    }
    if (!productId) {
      wx.showToast({ title: '商品数据异常', icon: 'none' })
      return
    }

    const qty = parseInt(this.data.quantity, 10) || 0
    const price = parseFloat(this.data.salePrice) || 0

    if (qty <= 0) {
      wx.showToast({ title: '数量必须大于0', icon: 'none' })
      return
    }
    if (qty > this.data.currentStock) {
      wx.showToast({ title: `库存不足，当前库存 ${this.data.currentStock}`, icon: 'none' })
      return
    }
    if (price <= 0) {
      wx.showToast({ title: '请输入有效的销售单价', icon: 'none' })
      return
    }

    // 亏本销售提醒一次
    if (this.data.buyPrice > 0 && price < this.data.buyPrice) {
      wx.showModal({
        title: '低于进价销售',
        content: `售价 ¥${price} 低于进价 ¥${this.data.buyPrice}，确认成交吗？`,
        success: res => {
          if (res.confirm) {
            this.doSale()
          }
        }
      })
      return
    }

    this.doSale()
  },

  async doSale() {
    const { productId, productName, buyPrice } = this.data
    const qty = parseInt(this.data.quantity, 10) || 0
    const price = parseFloat(this.data.salePrice) || 0

    this.setData({ submitting: true })
    wx.showLoading({ title: '销售中...', mask: true })

    try {
      // 老数据没有 stock 字段时，先用 inc(0) 把它补成 0，避免条件更新匹配不到
      if (this.stockMissing) {
        await db.collection('product').doc(productId).update({ data: { stock: _.inc(0) } })
        this.stockMissing = false
      }

      // 1. 条件扣减库存：库存不足时 updated 为 0，从根本上避免并发超卖
      const updateRes = await db.collection('product')
        .where({ _id: productId, stock: _.gte(qty) })
        .update({ data: { stock: _.inc(-qty) } })

      if (!updateRes.stats || updateRes.stats.updated === 0) {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showToast({ title: '库存不足，请刷新后重试', icon: 'none' })
        return
      }

      // 2. 记录销售流水；失败就把库存加回去，保证账实一致
      try {
        await db.collection('sale').add({
          data: {
            productId: productId,
            productName: productName,
            quantity: qty,
            price: price,
            total: Math.round(qty * price * 100) / 100,
            buyPrice: buyPrice,
            createTime: new Date()
          }
        })
      } catch (addErr) {
        await db.collection('product').doc(productId).update({
          data: { stock: _.inc(qty) }
        }).catch(() => {})
        throw addErr
      }

      wx.hideLoading()
      wx.showToast({ title: '销售成功 ✅' })

      this.setData({
        currentStock: this.data.currentStock - qty,
        maxStock: this.data.currentStock - qty,
        quantity: 0,
        submitting: false
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1200)
    } catch (err) {
      wx.hideLoading()
      console.error('销售失败', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  }
})

const db = wx.cloud.database()

Page({

  data: {
    productId: '',     // 有值表示编辑模式
    name: "",
    category: "",
    buyPrice: "",
    salePrice: "",
    stock: 0,
    saving: false
  },

  onLoad(options) {
    if (options && options.id) {
      this.loadProduct(options.id)
    }
  },

  loadProduct(id) {
    wx.showLoading({ title: '加载中...' })

    db.collection('product').doc(id).get()
      .then(res => {
        const p = res.data
        this.setData({
          productId: p._id,
          name: p.name || '',
          category: p.category || '',
          buyPrice: p.buyPrice === undefined ? '' : String(p.buyPrice),
          salePrice: p.salePrice === undefined ? '' : String(p.salePrice),
          stock: p.stock || 0
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error('读取商品失败', err)
        wx.showToast({ title: '读取失败', icon: 'none' })
      })
  },

  nameInput(e) {
    this.setData({
      name: e.detail.value
    })
  },

  categoryInput(e) {
    this.setData({
      category: e.detail.value
    })
  },

  buyInput(e) {
    this.setData({
      buyPrice: e.detail.value
    })
  },

  saleInput(e) {
    this.setData({
      salePrice: e.detail.value
    })
  },

  // 校验通过返回 null，否则返回错误提示
  validate() {
    const name = (this.data.name || '').trim()
    const category = (this.data.category || '').trim()
    const buyPrice = Number(this.data.buyPrice)
    const salePrice = Number(this.data.salePrice)

    if (!name) {
      return '请输入商品名称'
    }
    if (!category) {
      return '请输入商品类别'
    }
    if (!this.data.buyPrice || !(buyPrice > 0)) {
      return '进货价需大于 0'
    }
    if (!this.data.salePrice || !(salePrice > 0)) {
      return '销售价需大于 0'
    }
    return null
  },

  saveProduct() {

    if (this.data.saving) {
      return
    }

    const error = this.validate()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    const buyPrice = Number(this.data.buyPrice)
    const salePrice = Number(this.data.salePrice)

    // 售价低于进价时提醒一次，确认后仍然保存
    if (salePrice < buyPrice) {
      wx.showModal({
        title: '售价低于进价',
        content: `销售价 ¥${salePrice} 低于进货价 ¥${buyPrice}，确认保存吗？`,
        success: res => {
          if (res.confirm) {
            this.doSave()
          }
        }
      })
      return
    }

    this.doSave()
  },

  doSave() {

    this.setData({ saving: true })

    const isEdit = !!this.data.productId

    const data = {
      name: (this.data.name || '').trim(),
      category: (this.data.category || '').trim(),
      buyPrice: Number(this.data.buyPrice),
      salePrice: Number(this.data.salePrice)
    }

    // 新增时初始化库存，否则商品没有 stock 字段，进货自增会出问题
    if (!isEdit) {
      data.stock = 0
      data.createTime = new Date()
    }

    const task = isEdit
      ? db.collection('product').doc(this.data.productId).update({ data })
      : db.collection('product').add({ data })

    return task
      .then(() => {
        this.setData({ saving: false })
        wx.showToast({ title: isEdit ? '已保存' : '保存成功' })
        setTimeout(() => {
          wx.navigateBack()
        }, 800)
      })
      .catch(err => {
        this.setData({ saving: false })
        console.error('保存商品失败', err)
        wx.showToast({
          title: '保存失败，请检查数据库权限',
          icon: 'none'
        })
      })

  }

})

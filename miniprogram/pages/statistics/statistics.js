// pages/statistics/statistics.js
const { fetchAll, money } = require('../../utils/db')

Page({
  data: {
    totalRevenue: '0.00',
    totalCost: '0.00',
    totalProfit: '0.00',
    grossMargin: '0.0',
    totalOrders: 0,
    rankings: [],
    loading: true,
    ec: {
      lazyLoad: true
    }
  },

  onShow() {
    this.loadData()
  },

  onUnload() {
    this.chart = null
  },

  async loadData() {
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      // 取全量：原来只取到 20 条，统计数字会严重偏小
      const sales = await fetchAll('sale', { orderBy: ['createTime', 'desc'] })

      let totalRevenue = 0
      let totalCost = 0

      sales.forEach(item => {
        totalRevenue += Number(item.total) || 0
        totalCost += (Number(item.buyPrice) || 0) * (Number(item.quantity) || 0)
      })

      const totalProfit = totalRevenue - totalCost
      const grossMargin = totalRevenue > 0
        ? ((totalProfit / totalRevenue) * 100).toFixed(1)
        : '0.0'

      const chartData = this.getLast7DaysData(sales)
      const rankings = this.getRankings(sales)

      this.setData({
        totalRevenue: money(totalRevenue).toFixed(2),
        totalCost: money(totalCost).toFixed(2),
        totalProfit: money(totalProfit).toFixed(2),
        grossMargin: grossMargin,
        totalOrders: sales.length,
        rankings: rankings,
        loading: false
      })

      this.initChart(chartData)

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      console.error('加载数据失败', err)
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
    }
  },

  // 获取近 7 天日期和销售数据
  getLast7DaysData(sales) {
    const days = []
    const dateMap = {}
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push(key)
      dateMap[key] = 0
    }

    sales.forEach(item => {
      if (item.createTime) {
        const d = new Date(item.createTime)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (dateMap[key] !== undefined) {
          dateMap[key] += Number(item.total) || 0
        }
      }
    })

    return days.map(d => ({
      date: d,
      value: money(dateMap[d])
    }))
  },

  // 计算热销排行（按销量）
  getRankings(sales) {
    const map = {}

    sales.forEach(item => {
      const key = item.productId || item.productName
      if (!map[key]) {
        map[key] = {
          productId: key,
          productName: item.productName,
          totalQuantity: 0,
          totalAmount: 0
        }
      }
      map[key].totalQuantity += Number(item.quantity) || 0
      map[key].totalAmount += Number(item.total) || 0
    })

    return Object.values(map)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5)
      .map(item => Object.assign({}, item, {
        totalAmount: money(item.totalAmount).toFixed(2)
      }))
  },

  // 初始化 ECharts：只在第一次 init，之后只 update 数据
  initChart(data) {
    const option = this.buildOption(data)

    if (this.chart) {
      this.chart.setOption(option)
      return
    }

    const component = this.selectComponent('#chart')
    if (!component) {
      return
    }

    component.init((canvas, width, height) => {
      // echarts 的实现在本地组件目录，原来指向 miniprogram_npm 的路径是不存在的
      const echarts = require('../../components/ec-canvas/echarts')
      const chart = echarts.init(canvas, null, { width, height })
      canvas.setChart(chart)
      chart.setOption(option)
      this.chart = chart
      return chart
    })
  },

  buildOption(data) {
    return {
      grid: { left: 45, right: 20, top: 30, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        formatter: params => `${params[0].axisValue}<br/>销售额：¥${params[0].value}`
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date.slice(5)),
        axisLabel: { fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: '元',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 }
      },
      series: [{
        data: data.map(d => d.value),
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { color: '#2b6cff', borderRadius: [4, 4, 0, 0] }
      }]
    }
  }
})

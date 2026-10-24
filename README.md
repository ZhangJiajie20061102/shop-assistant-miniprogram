# 店铺经营助手 · 微信小程序（云开发）

一个小店用的进销存小程序：商品建档、进货入库、销售出库、销售记录、经营分析。
基于微信云开发（云数据库），前端使用 Vant Weapp 组件库，图表使用 ECharts（ec-canvas）。

## 功能

| 页面 | 功能 |
|---|---|
| 首页 | 今日销售额 / 今日订单数 / 库存预警数；四个功能入口 |
| 商品管理 | 商品列表（全量）、按名称或类别搜索、编辑、删除、低库存红色标记、下拉刷新 |
| 商品信息 | 新增 / 编辑商品（名称、类别、进货价、销售价）；价格校验；售价低于进价二次确认 |
| 进货入库 | 商品模糊搜索（防抖）、选中后带出进价、录入数量与单价、库存自动增加 |
| 销售 | 数量步进器、单价可改、合计实时计算、库存不足拦截、低于进价提醒 |
| 销售记录 | 时间筛选（今天 / 近 7 天 / 近 30 天 / 全部）、销售额 / 销量 / 毛利汇总 |
| 经营分析 | 总营业额、总成本、总利润、毛利率、近 7 天销售趋势图、热销商品排行 |

## 技术栈

- 微信小程序原生框架（`app.json` / `Page` / WXML / WXSS）
- 微信云开发：云数据库集合 `product`、`purchase`、`sale`
- [@vant/weapp](https://vant-contrib.gitee.io/vant-weapp/) 1.11.x（按钮、卡片、表单、标签、步进器等）
- [echarts-for-weixin](https://github.com/ecomfe/echarts-for-weixin)`（本地 `components/ec-canvas`）

## 目录结构

```
.
├── miniprogram
│   ├── app.js / app.json / app.wxss
│   ├── pages
│   │   ├── index         首页（今日概览 + 入口）
│   │   ├── product       商品管理
│   │   ├── addProduct    商品新增 / 编辑
│   │   ├── purchase      进货入库
│   │   ├── sale          销售
│   │   ├── salelist      销售记录
│   │   └── statistics    经营分析
│   ├── components/ec-canvas   ECharts 画布组件
│   └── utils/db.js       公共取数（分页取全量 / 日期过滤 / 金额处理）
├── cloudfunctions/quickstartFunctions   云开发初始化函数（当前业务未使用）
├── project.config.json
└── package.json
```

## 本地运行

1. 用微信开发者工具「导入项目」，目录选本仓库根目录，AppID 用自己的
2. 云开发控制台创建三个集合：`product`、`purchase`、`sale`
3. 把 `miniprogram/app.js` 里的 `env` 填成自己的云环境 ID
4. 安装依赖并构建 npm 组件：
   ```bash
   npm install
   ```
   然后在开发者工具菜单：**工具 → 构建 npm**
5. 编译运行

> 仓库里没有提交 `node_modules` 和 `miniprogram_npm`（构建产物），首次运行必须执行第 4 步，否则 Vant 组件会找不到。

## 数据模型

```js
// product
{ name, category, buyPrice, salePrice, stock, createTime }

// purchase
{ productId, productName, quantity, price, total, createTime }

// sale
{ productId, productName, quantity, price, total, buyPrice, createTime }
```

`buyPrice` 在销售记录里是成交当时的进价快照，用于计算毛利。

## 已知限制

- 所有读写都在小程序端直连云数据库，**集合权限**需要按使用场景配置：单人使用可设「仅创建者可读写」；多人/多设备共用应把写操作移到云函数，用 `OPENID` 鉴权。
- 进货与销售是「先更新库存、再写流水」两步，已做失败回滚，但不是数据库事务；要求强一致时需改为云函数 + `db.runTransaction`。
- 销售记录暂不支持删除或退货。

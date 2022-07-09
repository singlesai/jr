import axios from 'axios'
import qs from 'qs'

axios.defaults.withCredentials = true

const Sten = class {
  constructor () {
    this._domain = 'erp.51sten.com'
  }

  format (val, format) {
    var o = {
      'M+': val.getMonth() + 1, // month
      'd+': val.getDate(), // day
      'h+': val.getHours(), // hour
      'm+': val.getMinutes(), // minute
      's+': val.getSeconds(), // second
      'q+': Math.floor((val.getMonth() + 3) / 3), // quarter
      'S': val.getMilliseconds() // millisecond
    }
    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (val.getFullYear() + '').substr(4 - RegExp.$1.length))
    }
    for (var k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
      }
    }
    return format
  }

  async init () {
    var rst = await axios.get('/sheet/careSheetIn')
    var htmlText = rst.data
    // console.log('htmlText', htmlText)
    var csrf = htmlText.substring(htmlText.indexOf('_csrf" content="') + 16)
    csrf = csrf.substring(0, csrf.indexOf('"/>'))
    this.csrf = csrf
    var user = htmlText.substring(htmlText.indexOf("USERNAME: '") + 11)
    user = user.substring(0, user.indexOf("'"))
    this.user = user
    this.depts = await this.deptList()
    console.log('this', this.user, this.csrf)
  }

  async UserInfo () {
    return this.user
  }
  // 工单查询
  async WorkQuery (begDate, endDate, deptId, billNo) { // FSJRJL
    if (!endDate) {
      endDate = this.format(new Date(), 'yyyy-MM-dd')
    } else {
      endDate = this.format(new Date(endDate), 'yyyy-MM-dd')
    }
    if (!begDate) {
      begDate = endDate
    } else {
      begDate = this.format(new Date(begDate), 'yyyy-MM-dd')
    }
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['shortName'] = ''
    filter['interest-2'] = 0
    filter['startDate1'] = begDate
    filter['plateNo'] = ''
    filter['careNo'] = ''
    filter['careStatus'] = ''
    filter['receiverId'] = ''
    filter['sourceId'] = ''
    filter['selectDeptId'] = deptId || ''
    filter['careStatus1'] = 6
    filter['endDate1'] = endDate + ' 23:59:59'

    var rst = await axios({
      url: '/sheet/pageCareSheet',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},

      data: qs.stringify({
        page: 1,
        limit: 1000,
        // treeValue:{"_csrf":this.csrf,"salesNo":"","plateNo":"","sellerId":"","partName":"","partNo":"","firmNo":"","barCode":"","tdstartDate":"","outputStatus":"","salesCategory":"","salesStatus":"","customer":"","selectDeptId":""},
        treeValue: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: 1000
      })
    })
    // console.log('work', rst.data)
    return rst.data.rows
  }
  // 部门列表
  async deptList () {
    if (!this._deptList) {
      var rst = await axios({
        url: '/deptInfo/getDeptInfo',
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        data: qs.stringify({
          upId: 'dda6cb61c9604a69b16d26e0dd3db6b8',
          _csrf: this.csrf
        })
      })
      // console.log('deptList', rst.data)
      this._deptList = rst.data
    }
    return this._deptList
  }
  // 发料
  async SalePosteQuery (begDate, endDate, deptId, billNo) { // FSJRJL
    if (!endDate) {
      endDate = this.format(new Date(), 'yyyy-MM-dd')
    } else {
      endDate = this.format(new Date(endDate), 'yyyy-MM-dd')
    }
    if (!begDate) {
      begDate = endDate
    } else {
      begDate = this.format(new Date(begDate), 'yyyy-MM-dd')
    }
    var filter = {_csrf: this.csrf}
    filter['autoId'] = ''
    filter['customerId'] = ''
    filter['interest'] = 0
    filter['partName1'] = ''
    filter['interest-2'] = 1
    filter['firstBalanceTime'] = begDate
    filter['modelName'] = ''
    filter['firmNo'] = ''
    filter['groupName'] = ''
    filter['partNo'] = ''
    filter['sheetSource'] = ''
    filter['customerName'] = ''
    filter['plateNo'] = ''
    filter['careNo'] = ''
    filter['attribute'] = ''
    filter['spec'] = ''
    filter['isPackPart'] = ''
    filter['receiverId'] = ''
    filter['selectDeptId'] = deptId
    filter['firstBalanceTime1'] = endDate + ' 23:59:59'
    var rst = await axios({
      url: '/dispatch/findDispatchCarePart',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: 1,
        limit: 10000,
        _csrf: this.csrf,
        treeValue: JSON.stringify(filter),
        index: 1,
        size: 10000
      })
    })
    // console.log('sale post', rst.data)
    return rst.data.rows
  }
  // 出库记录
  async SaleIssueQuery (begDate, endDate, deptId, billNo) {
    if (!endDate) {
      endDate = this.format(new Date(), 'yyyy-MM-dd')
    } else {
      endDate = this.format(new Date(endDate), 'yyyy-MM-dd')
    }
    if (!begDate) {
      begDate = endDate
    } else {
      begDate = this.format(new Date(begDate), 'yyyy-MM-dd')
    }
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['categoryId'] = ''
    filter['startDate'] = begDate
    filter['takerId'] = ''
    filter['selectDeptId'] = deptId
    filter['endDate'] = endDate + ' 23:59:59'
    var rst = await axios({
      url: '/store/findOutSheetInfo',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        param: JSON.stringify(filter),
        page: 1,
        rows: 10000,
        _csrf: this.csrf
      })
    })
    // console.log('issue', rst.data)
    return rst.data.rows
  }
  // 出库明细
  async SaleIssueEntryQuery (begDate, endDate, deptId, billNo) {
    if (!endDate) {
      endDate = this.format(new Date(), 'yyyy-MM-dd')
    } else {
      endDate = this.format(new Date(endDate), 'yyyy-MM-dd')
    }
    if (!begDate) {
      begDate = endDate
    } else {
      begDate = this.format(new Date(begDate), 'yyyy-MM-dd')
    }
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['startViDate'] = ''
    filter['categoryId'] = ''
    filter['handler'] = ''
    filter['takerId'] = ''
    filter['outPutStatus'] = 1
    filter['selectDeptId'] = deptId
    filter['startDate'] = begDate
    filter['endDate'] = endDate + ' 23:59:59'
    var rst = await axios({
      url: '/outputsheet/findOutputDetail',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        treeValue: JSON.stringify(filter),
        page: 1,
        rows: 10000,
        _csrf: this.csrf
      })
    })
    // console.log('issue', rst.data)
    return rst.data.rows
  }
  // 费用记录
  async FeeInvoiceQuery (begDate, endDate, deptId, billNo) {
    if (!endDate) {
      endDate = this.format(new Date(), 'yyyy-MM-dd')
    } else {
      endDate = this.format(new Date(endDate), 'yyyy-MM-dd')
    }
    if (!begDate) {
      begDate = endDate
    } else {
      begDate = this.format(new Date(begDate), 'yyyy-MM-dd')
    }
    var filter = {_csrf: this.csrf}
    filter['interest'] = 1
    filter['targetName'] = ''
    filter['interest-2'] = 0
    filter['startDate'] = begDate
    filter['careNo'] = ''
    filter['itemStatus'] = 2
    filter['plateNo'] = ''
    filter['careStatus'] = ''
    filter['receiverId'] = ''
    filter['itemName'] = ''
    filter['vinNo'] = ''
    filter['attribute'] = ''
    filter['isSurface'] = ''
    filter['selectDeptId'] = deptId
    filter['isHead'] = 0
    filter['upId'] = ''
    filter['endDate'] = endDate + ' 23:59:59'
    var rst = await axios({
      url: '/dispatch/findDispatchCareItem',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: 1,
        limit: 10,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: 10000
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }

  async auth (user, psw) {
    var htmlText = await axios.get('https://erp.51sten.com')
    this._cookies = htmlText.headers['set-cookie']
    htmlText = htmlText.data
    htmlText = htmlText.substring(htmlText.indexOf('_csrf') + 16)
    htmlText = htmlText.substring(0, htmlText.indexOf('"/>'))
    this._csrf = htmlText

    var jsonSessionId = this._cookies[0].split(';')[0]
    var severId = this._cookies[1].split(';')[0]
    var url = 'http://erp.51sten.com/j_spring_security_check;' + jsonSessionId
    htmlText = await axios({
      url: url,
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Cookie': jsonSessionId + ';' + severId,
        'Host': this._domain,
        'Origin': 'http://' + this._domain + '/'
      },
      data: qs.stringify({
        _csrf: this._csrf,
        username: user,
        response: '',
        password: psw
      })
    })
    this._cookies = htmlText.headers['set-cookie']
    htmlText = htmlText.data
    return htmlText
  }

  initParams (params) {
    params = params || {}
    params.begDate = params.begDate || ''
    params.endDate = params.endDate || ''
    params.pageSize = params.pageSize || 50
    params.page = params.page || 1
    return params
  }

  // 工单
  async Work (params) { // FSJRJL
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['shortName'] = ''
    filter['interest-2'] = 0
    filter['startDate1'] = params.begDate
    filter['plateNo'] = ''
    filter['careNo'] = ''
    filter['careStatus'] = ''
    filter['receiverId'] = ''
    filter['sourceId'] = ''
    filter['selectDeptId'] = params.deptId || ''
    filter['careStatus1'] = 6
    filter['endDate1'] = params.endDate + ' 23:59:59'

    var rst = await axios({
      url: '/sheet/pageCareSheet',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},

      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        // treeValue:{"_csrf":this.csrf,"salesNo":"","plateNo":"","sellerId":"","partName":"","partNo":"","firmNo":"","barCode":"","tdstartDate":"","outputStatus":"","salesCategory":"","salesStatus":"","customer":"","selectDeptId":""},
        treeValue: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('work', rst.data)
    return rst.data.rows
  }

  // 发料
  async SalePost (params) { // FSJRJL
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['autoId'] = ''
    filter['customerId'] = ''
    filter['interest'] = 0
    filter['partName1'] = ''
    filter['interest-2'] = 1
    filter['firstBalanceTime'] = params.begDate
    filter['modelName'] = ''
    filter['firmNo'] = ''
    filter['groupName'] = ''
    filter['partNo'] = ''
    filter['sheetSource'] = ''
    filter['customerName'] = ''
    filter['plateNo'] = ''
    filter['careNo'] = ''
    filter['attribute'] = ''
    filter['spec'] = ''
    filter['isPackPart'] = ''
    filter['receiverId'] = ''
    filter['selectDeptId'] = params.deptId || ''
    filter['firstBalanceTime1'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/dispatch/findDispatchCarePart',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        _csrf: this.csrf,
        treeValue: JSON.stringify(filter),
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('sale post', rst.data)
    return rst.data.rows
  }

  // 出库记录
  async SaleIssue (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['categoryId'] = ''
    filter['startDate'] = params.begDate
    filter['takerId'] = ''
    filter['selectDeptId'] = params.deptId || ''
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/store/findOutSheetInfo',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        param: JSON.stringify(filter),
        page: params.page,
        rows: params.pageSize,
        _csrf: this.csrf
      })
    })
    // console.log('issue', rst.data)
    return rst.data.rows
  }

  // 出库明细
  async SaleIssueEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['startViDate'] = ''
    filter['categoryId'] = ''
    filter['handler'] = ''
    filter['takerId'] = ''
    filter['outPutStatus'] = 1
    filter['selectDeptId'] = params.deptId || ''
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/outputsheet/findOutputDetail',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        treeValue: JSON.stringify(filter),
        page: params.page,
        rows: params.pageSize,
        _csrf: this.csrf
      })
    })
    // console.log('issue', rst.data)
    return rst.data.rows
  }

  // 费用记录
  async FeeInvoice (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 1
    filter['targetName'] = ''
    filter['interest-2'] = 0
    filter['startDate'] = params.begDate
    filter['careNo'] = ''
    filter['itemStatus'] = 2
    filter['plateNo'] = ''
    filter['careStatus'] = ''
    filter['receiverId'] = ''
    filter['itemName'] = ''
    filter['vinNo'] = ''
    filter['attribute'] = ''
    filter['isSurface'] = ''
    filter['selectDeptId'] = params.deptId || ''
    filter['isHead'] = 0
    filter['upId'] = ''
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/dispatch/findDispatchCareItem',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }

  // 采购入库单
  async PurIn (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['purchaseNo'] = ''
    filter['plateNo'] = ''
    filter['purchaseStatus'] = ''
    filter['tdstartDate'] = ''
    filter['buyerId'] = ''
    filter['selectDeptId'] = ''
    filter['sheetStartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/purchase/getInPurSheetSheetList',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 采购入库明细
  async PurInEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = '0'
    filter['purchaseNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['viewInStartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['plateNo'] = ''
    filter['receiverId'] = ''
    filter['viewPurStartDate'] = ''
    filter['selectDeptId'] = ''
    filter['inStartDate'] = params.begDate
    filter['inEndDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/partInfo/getPurchasePartByPage',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 采购退货
  async PurReturn (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['outputNo'] = ''
    filter['firmNo'] = ''
    filter['partNo'] = ''
    filter['tdstartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['partName'] = ''
    filter['supplierName'] = ''
    filter['barCode'] = ''
    filter['remark'] = ''
    filter['selectDeptId'] = ''
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/outputsheet/findPurchaseOutputsheet',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 采购退货明细
  async PurReturnEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['firmNo'] = ''
    filter['partNo'] = ''
    filter['outputTime'] = params.begDate + ' 至 ' + params.endDate
    filter['taker'] = ''
    filter['handler'] = ''
    filter['partName'] = ''
    filter['supplierName'] = ''
    filter['barCode'] = ''
    filter['remark'] = ''
    filter['selectDeptId'] = ''
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/outputsheet/selectPurOutDetailByPage',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 盘点
  async StockTaking (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['inventoryNo'] = ''
    filter['selectDeptId'] = ''
    filter['tdstartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/Inventory/getInventorySheetList',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 盘点
  async StockTakingEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['inventoryNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['startViDate'] = params.begDate + ' 至 ' + params.endDate
    filter['handler'] = ''
    filter['receiverId'] = ''
    filter['categoryName'] = ''
    filter['selectDeptId'] = ''
    filter['tdstartDate'] = ''
    filter['createTime'] = ''
    filter['startDate1'] = params.begDate
    filter['endDate1'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/Inventory/findInventorySheetGrid',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 其他入库
  async OtherIn (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['inputStatus'] = ''
    filter['interest'] = 0
    filter['inputNo'] = ''
    filter['handler'] = ''
    filter['categoryId'] = ''
    filter['tdstartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['selectDeptId'] = ''
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/inputsheet/findOtherInputsheet',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 其他入库明细
  async OtherInEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['inputNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['startViDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    filter['handler'] = ''
    filter['categoryId'] = ''
    filter['operater'] = ''
    filter['receiverId'] = ''
    filter['selectDeptId'] = ''
    var rst = await axios({
      url: '/inputsheet/findOtherInputDetail',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 其他出库
  async OtherIssue (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['outputStatus'] = ''
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['categoryId'] = ''
    filter['tdstartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    filter['taker'] = ''
    filter['selectDeptId'] = ''
    var rst = await axios({
      url: '/outputsheet/findOtherOutputsheet',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 其他出库明细
  async OtherIssueEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['outputNo'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['categoryId'] = ''
    filter['startViDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    filter['taker'] = ''
    filter['handler'] = ''
    filter['selectDeptId'] = ''
    var rst = await axios({
      url: '/outputsheet/findOtherOutputDetail',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 退料
  async MaterialReturn (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['inputStatus'] = 0
    filter['interest'] = 0
    filter['relateNo'] = ''
    filter['categoryId'] = ''
    filter['tdstartDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    filter['handler'] = ''
    var rst = await axios({
      url: '/inputsheet/findRequisitionInput',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 退料明细
  async MaterialReturnEntry (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['interest'] = 0
    filter['partName'] = ''
    filter['storeId'] = ''
    filter['positionId'] = ''
    filter['categoryId'] = ''
    filter['startViDate'] = params.begDate + ' 至 ' + params.endDate
    filter['startDate'] = params.begDate
    filter['endDate'] = params.endDate + ' 23:59:59'
    filter['receiverId'] = ''
    filter['handler'] = ''
    filter['creatorId'] = ''
    var rst = await axios({
      url: '/partInfo/getRequisitionPartInByPage',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        limit: params.pageSize,
        param: JSON.stringify(filter),
        _csrf: this.csrf,
        index: 1,
        size: params.pageSize
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
  // 施工业绩
  async Achievement (params) {
    params = this.initParams(params)
    var filter = {_csrf: this.csrf}
    filter['careNo'] = ''
    filter['plateNo'] = ''
    filter['targetName'] = ''
    filter['startDate'] = ''
    filter['name'] = ''
    filter['groupId'] = ''
    filter['careStatus'] = ''
    filter['categoryId'] = ''
    filter['startDate1'] = params.begDate
    filter['startDate2'] = ''
    filter['startDate3'] = ''
    filter['packageName'] = ''
    filter['endDate1'] = params.endDate + ' 23:59:59'
    var rst = await axios({
      url: '/careSheet/getItemPriceByPage',
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      data: qs.stringify({
        page: params.page,
        rows: params.pageSize,
        treeValue: JSON.stringify(filter),
        _csrf: this.csrf
      })
    })
    // console.log('fee', rst.data)
    return rst.data.rows
  }
}
export default Sten

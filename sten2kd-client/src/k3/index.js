import axios from 'axios'

const K3 = class {
  constructor () {
    this._domain = '/api'
  }

  async SyncStatus (billNoList) {
    var rst = await axios({
      method: 'POST',
      url: this._domain + '/syncstatus',
      data: billNoList,
      header: {'Content-Type': 'application/json'}
    })
    return rst.data
  }

  async Sync (bill) { // dept: bill.deptName,
    var data = {date: bill.firstBalanceTime, billNo: bill.careNo + '-' + bill.plateNo, cust: bill.shortName, emp: bill.sheetSource, feeAmount: 0, note: bill.sRemark + '-' + bill.plateNo, plateNo: bill.plateNo, fee: [], issue: []}
    for (var idx in bill.fee) {
      var rec = bill.fee[idx]
      data.fee.push({itemNo: rec.itemNo, itemName: rec.itemName, qty: rec.quantity, price: rec.discountPrice / rec.quantity, amount: rec.discountPrice})
      data.feeAmount += rec.discountPrice
    }
    var postDic = {}
    for (idx in bill.post) {
      var post = bill.post[idx]
      if (postDic[post.partName + '|' + post.spec] === undefined) {
        postDic[post.partName + '|' + post.spec] = []
      }
      postDic[post.partName + '|' + post.spec].push({codeName: post.codeName, qty: post.quantity, price: post.discountPrice})
    }
    var dic = {}
    for (idx in bill.issue) {
      var issue = bill.issue[idx]
      var cnt = issue.entry.length
      for (var jdx = 0; jdx < cnt; ++jdx) {
        var issueEntry = issue.entry[jdx]
        var postCodeName = postDic[issueEntry.partName + '|' + issueEntry.spec]
        if (postCodeName) {
          for (var kdx = 0; kdx < postCodeName.length; ++kdx) {
            var postCode = postCodeName[kdx]
            if (postCode.qty > 0) {
              if (postCode.qty >= issueEntry.quantity) { // 足够分配，出库类别按分配类别
                postCode.qty -= issueEntry.quantity
                issueEntry.codeName = postCode.codeName
                issueEntry.sellingPrice = postCode.price
                issueEntry.sellingPriceTotal = postCode.price * issueEntry.quantity
                break
              } else { // 不够分配，出库明细按分配数量拆分，原记录按分配类别，分配数量，新拆记录添加到出库明细等候分配
                var newEntry = JSON.parse(JSON.stringify(issueEntry))
                newEntry.quantity = issueEntry.quantity - postCode.qty
                issue.entry.push(newEntry)
                cnt += 1
                issueEntry.codeName = postCode.codeName
                issueEntry.quantity = postCode.qty
                issueEntry.sellingPrice = postCode.price
                issueEntry.sellingPriceTotal = postCode.qty * postCode.price
                issueEntry.salePriceTotal = postCode.qty * issueEntry.salePrice
                postCode.qty = 0
                break
              }
            }
          }
        }
        // issueEntry.codeName = postDic[issueEntry.partName + '|' + issueEntry.spec]
        rec = {stock: issueEntry.storeName, position: issueEntry.positionName, itemName: issueEntry.partName, itemModel: issueEntry.spec, codeName: issueEntry.codeName || '', unit: issueEntry.unit, qty: issueEntry.quantity, settlePrice: issueEntry.salePrice, price: issueEntry.sellingPrice, settleAmount: issueEntry.salePriceTotal, amount: issueEntry.sellingPriceTotal}
        var key = rec.stock + '|' + rec.position + '|' + rec.itemName + '|' + rec.itemModel + '|' + rec.unit + '|' + rec.codeName
        if (!dic[key]) {
          dic[key] = rec
        } else {
          dic[key].qty += rec.qty
          dic[key].amount += rec.amount
          dic[key].price = dic[key].amount / dic[key].qty
          dic[key].settleAmount += rec.settleAmount
          dic[key].settlePrice = dic[key].settleAmount / dic[key].qty // rec.settleAmount / dic[key].qty
        }
        // data.issue.push({stock: issueEntry.storeName, position: issueEntry.positionName, itemName: issueEntry.partName, itemModel: issueEntry.discountPrice, unit: issueEntry.unit, qty: issueEntry.quantity, price: issueEntry.sellingPrice, amount: issueEntry.sellingPriceTotal})
      }
    }
    for (key in dic) {
      data.issue.push(dic[key])
    }
    var rst = await axios({
      method: 'POST',
      url: this._domain + '/sync',
      data: data,
      header: {'Content-Type': 'application/json'}
    })
    return rst.data
  }

  async StenObj (obj, value) {
    var keyProp
    switch (obj) {
      case 'Work':
        keyProp = 'careId'
        break
      case 'SalePost':
        keyProp = ['careId', 'carePartId']
        break
      case 'SaleIssue':
        keyProp = 'outputId'
        break
      case 'SaleIssueEntry':
        keyProp = ['outputNo', 'partName', 'selfNo']
        break
      case 'FeeInvoice':
        keyProp = ['careId', 'careItemId', 'targetId']
        break
      case 'PurIn':
        keyProp = 'inputId'
        break
      case 'PurInEntry':
        keyProp = ['inputNo', 'partName', 'selfNo', 'purchaseNo']
        break
      case 'PurReturn':
        keyProp = []
        break
      case 'PurReturnEntry':
        keyProp = []
        break
      case 'StockTaking':
        keyProp = 'inventoryId'
        break
      case 'StockTakingEntry':
        keyProp = ['inventoryId', 'spec', 'partName', 'selfNo']
        break
      case 'OtherIn':
        keyProp = 'inputId'
        break
      case 'OtherInEntry':
        keyProp = ['inputNo', 'storeName', 'partName', 'selfNo']
        break
      case 'OtherIssue':
        keyProp = 'outputId'
        break
      case 'OtherIssueEntry':
        keyProp = ['outputNo', 'categoryName', 'partName', 'selfNo']
        break
      case 'MaterialReturn':
        keyProp = 'inputId'
        break
      case 'MaterialReturnEntry':
        keyProp = ['autoId', 'inputId']
        break
      case 'Achievement':
        keyProp = ['careItemId', 'itemId']
        break
    }
    if (keyProp) {
      var data = {
        obj: obj,
        keyField: keyProp,
        val: value
      }
      var rst = await axios({
        method: 'POST',
        url: this._domain + '/stenobj',
        data: data,
        header: {'Content-Type': 'application/json'}
      })
      return rst.data
    }
  }

  async syncStockTran (srcObjName, bill) {
    var data = {
      srcObjName,
      bill
    }
    var rst = await axios({
      method: 'POST',
      url: this._domain + '/stocktran',
      data,
      header: {'Content-Type': 'application/joon'}
    })
    return rst.data
  }
}

export default K3

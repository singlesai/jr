var express = require('express');
var K3 = require('../k3');
var Sten = require('../sten')
var router = express.Router();
var k3 = new K3();
var sten = new Sten()

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/syncstatus', async function(req, res){
  var rst = await k3.syncStatus(req.body)
  res.end(JSON.stringify(rst))
})

router.post('/sync', async function(req, res) {
  var rst = {success: false, info: ''}
  try {
    var r = await k3.sync(req.body)
    rst.success = true
    rst.info = JSON.stringify(r)
  }catch(ex){
    rst.success = false
    rst.info = ex.message || ex
  }
  res.end(JSON.stringify(rst))
})

router.post('/stenobj', async function(req, res){
  var rst = {success: false, info: ''}
  try{
    var r = await sten.set(req.body.obj, req.body.keyField, req.body.val)
    rst.success = true
    rst.info = JSON.stringify(r)
  }catch(ex){
    rst.success = false
    rst.info = ex.message || ex
  }
  res.end(JSON.stringify(rst))
})

router.get('/purin', async function(req,res){
  var rst = {success: false, info: ''}
  try{
    var synced = await k3.getSyncStatus('PurIn', req.query.begdate)
    var r = await sten.getPurIn(req.query.begdate, req.query.enddate)
    for(var idx in r){
      if(r[idx].inputNo in synced) {
        r[idx].syncSuccess = synced[r[idx].inputNo].FSuccessed
        r[idx].syncInfo = synced[r[idx].inputNo].FInfo
      }else{
        r[idx].syncSuccess = 0
        r[idx].syncInfo = ''
      }
    }
    rst.success = true
    rst.info = r
  }catch(ex){
    rst.success = false
    rst.info = ex.message || ex
  }
  res.end(JSON.stringify(rst))
})

router.get('/purreturn', async function(req,res){
  var rst = {success: false, info: ''}
  try{
    var synced = await k3.getSyncStatus('PurReturn', req.query.begdate)
    var r = await sten.getPurReturn(req.query.begdate, req.query.enddate)
    for(var idx in r){
      if(r[idx].inputNo in synced) {
        r[idx].syncSuccess = synced[r[idx].inputNo].FSuccessed
        r[idx].syncInfo = synced[r[idx].inputNo].FInfo
      }else{
        r[idx].syncSuccess = 0
        r[idx].syncInfo = ''
      }
    }
    rst.success = true
    rst.info = r
  }catch(ex){
    rst.success = false
    rst.info = ex.message || ex
  }
  res.end(JSON.stringify(rst))
})

router.post('/stocktran', async function(req,res){
  var rst = {success: false, info: ''}
  try {
    var bill = req.body.bill
    bill.billNo=bill.inputNo
    bill.date = bill.inputTime
    for(var idx in bill.entry){
      bill.entry[idx].itemName = bill.entry[idx].partName
    }
    var r = await k3.saveStockTran(req.body.srcObjName, bill)
    rst.success = true
    rst.info = JSON.stringify(r)
  }catch(ex){
    rst.success = false
    rst.info = ex.message || ex
  }
  res.end(JSON.stringify(rst))
})

module.exports = router;

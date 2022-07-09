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

module.exports = router;

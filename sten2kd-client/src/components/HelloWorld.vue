<template>
  <div class="hello">
      <el-divider>定时同步</el-divider>
    <h3>每30分钟下载一次当天数据；每2小时下载一次最近一周数据；每天下载当月数据</h3>
    <div>
      <button @click="work">工单</button>
      <button @click="salePost">发料</button>
      <button @click="saleIssue">销售出库</button>
      <button @click="saleIssueEntry">销售出库明细</button>
      <button @click="feeInvoice">费用记录</button>
      <button @click="purIn">采购入库</button>
      <button @click="purInEntry">采购入库明细</button>
      <button @click="purReturn">采购退货</button>
      <button @click="purReturnEntry">采购退货明细</button>
      <button @click="stockTaking">盘点</button>
      <button @click="stockTakingEntry">盘点明细</button>
      <button @click="otherIn">其他入库</button>
      <button @click="otherInEntry">其他入库明细</button>
      <button @click="otherIssue">其他出库</button>
      <button @click="otherIssueEntry">其他出库明细</button>
      <button @click="materialReturn">退料</button>
      <button @click="materialReturnEntry">退料明细</button>
      <button @click="achievement">施工业绩</button>
    </div>
    <div v-for="log in logs" :key="log">{{log}}</div>
  </div>
</template>

<script>
import moment from 'moment'
import Sten from '@/sten'
import K3 from '@/k3'
export default {
  name: 'HelloWorld',
  data () {
    return {
      sh: undefined,
      sten: undefined,
      k3: undefined,
      logs: []
    }
  },
  mounted () {
    this.init()
    this.sh = setInterval(this.syncWork, 60000)
  },
  destroyed () {
    clearInterval(this.sh)
  },
  methods: {
    async init () {
      this.sten = new Sten()
      this.k3 = new K3()
      await this.sten.init()
    },
    async syncWork () {
      var now = new Date()
      var begDate = moment(now)
      var endDate = moment(now)
      // 每分钟更新一天数据
      // begDate = begDate.subtract(7, 'days')
      // await this.syncAllData(begDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'))
      if (parseInt(now.getMinutes() / 30) === now.getMinutes() / 30) { // 每30分钟更新一天数据
        console.log(endDate.format('YYYY-MM-DD HH:mm:ss'), now.getMinutes(), now.getMinutes() / 30)
        await this.syncAllData(begDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'))
      }
      begDate = begDate.subtract(7, 'days')
      /* if (now.getMinutes() === 1) { // 每小时更新一周数据
        await this.syncAllData(begDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'))
      } */
      if (parseInt(now.getHours() / 2) === now.getHours() / 2 && now.getMinutes() === 20) { // 每2小时更新一周数据
        console.log(endDate.format('YYYY-MM-DD HH:mm:ss'), now.getHours(), now.getHours() / 2)
        await this.syncAllData(begDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'))
      }
      begDate = begDate.subtract(1, 'months')
      if (now.getHours() === 1 && now.getMinutes() === 20) { // 每天更新一月数据
        console.log(endDate.format('YYYY-MM-DD HH:mm:ss'))
        await this.syncAllData(begDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'))
      }
    },
    async syncAllData (begDate, endDate) {
      await this.syncData('Work', begDate, endDate)
      await this.syncData('SalePost', begDate, endDate)
      await this.syncData('SaleIssue', begDate, endDate)
      await this.syncData('SaleIssueEntry', begDate, endDate)
      await this.syncData('FeeInvoice', begDate, endDate)
      await this.syncData('PurIn', begDate, endDate)
      await this.syncData('PurInEntry', begDate, endDate)
      await this.syncData('PurReturn', begDate, endDate)
      await this.syncData('PurReturnEntry', begDate, endDate)
      await this.syncData('StockTaking', begDate, endDate)
      await this.syncData('StockTakingEntry', begDate, endDate)
      await this.syncData('OtherIn', begDate, endDate)
      await this.syncData('OtherInEntry', begDate, endDate)
      await this.syncData('OtherIssue', begDate, endDate)
      await this.syncData('OtherIssueEntry', begDate, endDate)
      await this.syncData('MaterialReturn', begDate, endDate)
      await this.syncData('MaterialReturnEntry', begDate, endDate)
      await this.syncData('Achievement', begDate, endDate)
      if (this.logs.length > 9999) {
        this.logs = this.logs.splice(0, this.logs.length - 999)
      }
    },
    async syncData (obj, begDate, endDate) {
      var pageSize = 20
      var rstSize = 20
      var page = 1
      var rst = []
      while (rstSize === pageSize) {
        var recs = await this.sten[obj]({begDate, endDate, pageSize, page})
        var syncRst = await this.k3.StenObj(obj, recs)
        if (syncRst) {
          this.logs.push(obj + ':' + syncRst.info)
        }
        rst.push(...recs)
        page++
        rstSize = recs.length
      }
      console.log(obj, rst)
      return rst
    },
    async work () {
      var rst = await this.sten.Work()
      console.log('work', rst)
    },
    async salePost () {
      var rst = await this.sten.SalePost()
      console.log('salepost', rst)
    },
    async saleIssue () {
      var rst = await this.sten.SaleIssue()
      console.log('saleissue', rst)
    },
    async saleIssueEntry () {
      var rst = await this.sten.SaleIssueEntry()
      console.log('saleissueentry', rst)
    },
    async feeInvoice () {
      var rst = await this.sten.FeeInvoice()
      console.log('feeinvoice', rst)
    },
    async purIn () {
      var rst = await this.sten.PurIn()
      console.log('purin', rst)
    },
    async purInEntry () {
      var rst = await this.sten.PurInEntry()
      console.log('purinentry', rst)
    },
    async purReturn () {
      var rst = await this.sten.PurReturn()
      console.log('PurReturn', rst)
    },
    async purReturnEntry () {
      var rst = await this.sten.PurReturnEntry()
      console.log('PurReturnEntry', rst)
    },
    async stockTaking () {
      var rst = await this.sten.StockTaking()
      console.log('StockTaking', rst)
    },
    async stockTakingEntry () {
      var rst = await this.sten.StockTakingEntry()
      console.log('StockTakingEntry', rst)
    },
    async otherIn () {
      var rst = await this.sten.OtherIn()
      console.log('OtherIn', rst)
    },
    async otherInEntry () {
      var rst = await this.sten.OtherInEntry()
      console.log('OtherInEntry', rst)
    },
    async otherIssue () {
      var rst = await this.sten.OtherIssue()
      console.log('OtherIn', rst)
    },
    async otherIssueEntry () {
      var rst = await this.sten.OtherInEntry()
      console.log('OtherInEntry', rst)
    },
    async materialReturn () {
      var rst = await this.sten.MaterialReturn()
      console.log('MaterialReturn', rst)
    },
    async materialReturnEntry () {
      var rst = await this.sten.MaterialReturnEntry()
      console.log('MaterialReturnEntry', rst)
    },
    async achievement () {
      var rst = await this.sten.Achievement()
      console.log('Achievement', rst)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>

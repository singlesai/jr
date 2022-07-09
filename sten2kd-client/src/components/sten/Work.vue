<template>
    <div>
      <el-divider>接车工单</el-divider>
        <el-form :inline="true">
            <el-form-item>
                <el-date-picker v-model="filter.date" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
            </el-form-item>
            <el-form-item>
                <el-select v-model="filter.store" placeholder="请选择">
                    <el-option v-for="item in filter.storeList" :key="item.deptId" :label="item.deptName" :value="item.deptId"></el-option>
                </el-select>
            </el-form-item>
            <!--el-form-item>
                <el-input v-model="filter.cust" placeholder="客户"></el-input>
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="filter.synced">已同步</el-checkbox>
            </el-form-item-->
            <el-form-item>
                <el-button-group>
                    <el-button type="primary" @click="query()">查询</el-button>
                    <el-button type="primary" v-loading="loading.sync" :disabled="loading.work || loading.fee || loading.post || loading.issue || loading.issueEntry" @click="sync()">同步选中记录</el-button>
                </el-button-group>
            </el-form-item>
            <el-progress v-if="loading.sync" :text-inside="true" :stroke-width="26" :percentage="loading.syncPercent">test</el-progress>
            <el-row>
                <el-col :span="24">
                    <el-table ref="multipleTable" v-loading="loading.work" :data="work.filter(data => (data.syncStatus || false) === filter.synced && (data.shortName && data.shortName.toLowerCase().includes(filter.cust.toLowerCase())))" @selection-change="handleSelectionChange">
                        <el-table-column prop="seled" type="selection" width="55"></el-table-column>
                        <el-table-column type="expand">
                          <template slot-scope="props">
                            <el-tabs v-model="props.row.tab">
                              <el-tab-pane label="接车项目" name="fee">
                                <el-table :data="props.row.fee" v-loading="loading.fee">
                                  <el-table-column prop="itemName" label="维修项目"></el-table-column>
                                  <el-table-column prop="quantity" label="项目数量"></el-table-column>
                                  <el-table-column prop="discountPrice" label="折后总价"></el-table-column>
                                </el-table>
                              </el-tab-pane>
                              <el-tab-pane label="接车材料" name="post" v-loading="loading.post">
                                <el-table :data="props.row.post">
                                  <el-table-column prop="partName" label="材料名称"></el-table-column>
                                  <el-table-column prop="spec" label="规格"></el-table-column>
                                  <el-table-column prop="codeName" label="类别"></el-table-column>
                                  <el-table-column prop="unit" label="单位"></el-table-column>
                                  <el-table-column prop="quantity" label="数量"></el-table-column>
                                  <el-table-column prop="discountPrice" label="折后价"></el-table-column>
                                </el-table>
                              </el-tab-pane>
                              <el-tab-pane label="材料出库" name="issue" v-loading="loading.issue">
                                <el-table :data="props.row.issue">
                                  <el-table-column type="expand">
                                    <template slot-scope="props">
                                      <el-table :data="props.row.entry">
                                        <el-table-column prop="storeName" label="仓库"></el-table-column>
                                        <el-table-column prop="positionName" label="仓位"></el-table-column>
                                        <el-table-column prop="partName" label="材料名称"></el-table-column>
                                        <el-table-column prop="spec" label="规格"></el-table-column>
                                        <el-table-column prop="inputTime" label="批次"></el-table-column>
                                        <el-table-column prop="unit" label="单位"></el-table-column>
                                        <el-table-column prop="quantity" label="数量"></el-table-column>
                                        <el-table-column prop="salePrice" label="出库价"></el-table-column>
                                        <el-table-column prop="sellingPrice" label="销售单价"></el-table-column>
                                        <el-table-column prop="salePriceTotal" label="出库总价"></el-table-column>
                                        <el-table-column prop="sellingPriceTotal" label="销售总价"></el-table-column>
                                      </el-table>
                                    </template>
                                  </el-table-column>
                                  <el-table-column prop="outputTime" label="出库时间"></el-table-column>
                                  <el-table-column prop="outputNo" label="出库单号"></el-table-column>
                                  <el-table-column prop="plateNo" label="车牌号"></el-table-column>
                                </el-table>
                              </el-tab-pane>
                            </el-tabs>
                          </template>
                        </el-table-column>
                        <el-table-column prop="firstBalanceTime" label="日期" width="180"></el-table-column>
                        <el-table-column prop="careNo" label="工单号" width="150"></el-table-column>
                        <el-table-column prop="shortName" label="客户" width="350">
                          <template slot="header">
                            <el-input v-model="filter.cust" size="mini" placeholder="客户"></el-input>
                          </template>
                        </el-table-column>
                        <el-table-column prop="plateNo" label="车牌号" width="150"></el-table-column>
                        <el-table-column prop="feeAmt" label="接车金额" width="150"></el-table-column>
                        <el-table-column prop="sheetSource" label="推荐人" width="120"></el-table-column>
                        <el-table-column prop="syncStatus" label="同步状态" width="120">
                          <template slot="header">
                            <el-checkbox v-model="filter.synced" size="mini">同步状态</el-checkbox>
                          </template>
                          <template slot-scope="scope">
                            <el-checkbox disabled v-model="scope.row.syncStatus"></el-checkbox>
                          </template>
                        </el-table-column>
                        <el-table-column prop="syncTime" label="同步时间" width="220"></el-table-column>
                        <el-table-column prop="syncInfo" label="同步信息" width="280"></el-table-column>
                    </el-table>
                </el-col>
                <!--el-col :span="12">
                    <el-tabs v-model="activeName">
                        <el-tab-pane label="接车项目" name="fee">接车项目</el-tab-pane>
                        <el-tab-pane label="接车材料" name="post">接车材料</el-tab-pane>
                        <el-tab-pane label="材料出库" name="issue">材料出库</el-tab-pane>
                    </el-tabs>
                </el-col-->
            </el-row>
        </el-form>
    </div>
</template>

<script>
import Sten from '@/sten'
import K3 from '@/k3'

export default {
  name: 'StenWork',
  data () { // FSJRJL,fsjrpdigly
    return {
      filter: {
        date: '',
        store: '',
        cust: '',
        synced: false,
        storeList: []
      },
      loading: {
        fee: false,
        work: false,
        post: false,
        issue: false,
        issueEntry: false,
        querying: false,
        sync: false,
        syncPercent: 0
      },
      work: [],
      multipleSelection: [],
      activeName: 'fee',
      sten: undefined,
      k3: undefined
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    async init () {
      this.sten = new Sten()
      this.k3 = new K3()
      await this.sten.init()
      this.filter.storeList = await this.sten.deptList()
      // console.log(this.filter.storeList)
    },
    async query () {
      // console.log(this.filter.date)
      var begDate
      var endDate
      if (this.filter.date) {
        begDate = this.filter.date[0].toLocaleDateString()
        endDate = this.filter.date[1].toLocaleDateString()
      }
      this.loading.work = true
      this.loading.fee = true
      this.loading.post = true
      this.loading.issue = true
      this.loading.issueEntry = true
      try {
        var rst = await this.sten.WorkQuery(begDate, endDate, this.filter.store, this.filter.cust)
        this.$message('工单数据加载完毕')
      } catch (ex) {
        this.$message.error(ex.message)
      }
      var billNoList = []
      for (var idx in rst) {
        rst[idx]['tab'] = 'fee'
        billNoList.push(rst[idx].careNo + '-' + rst[idx].plateNo)
        rst[idx]['feeAmt'] = 0
      }
      this.k3.SyncStatus(billNoList).then(syncStatus => {
        for (var idx in rst) {
          if (rst[idx].careNo + '-' + rst[idx].plateNo in syncStatus) {
            rst[idx].syncStatus = syncStatus[rst[idx].careNo + '-' + rst[idx].plateNo].syncStatus
            rst[idx].syncTime = syncStatus[rst[idx].careNo + '-' + rst[idx].plateNo].syncTime
            rst[idx].syncInfo = syncStatus[rst[idx].careNo + '-' + rst[idx].plateNo].syncInfo
          }
        }
        this.work = rst
        this.loading.work = false
        this.$message('工单同步状态加载完毕')
      })
      // 项目
      this.sten.FeeInvoiceQuery(begDate, endDate, this.filter.store, this.filter.cust).then(rst => {
        var dic = {}
        for (var idx in rst) {
          var rec = rst[idx]
          if (!dic[rec.careNo]) {
            dic[rec.careNo] = []
          }
          dic[rec.careNo].push(rec)
        }
        for (idx in this.work) {
          this.work[idx].fee = dic[this.work[idx].careNo]
          for (jdx in this.work[idx].fee) {
            this.work[idx].feeAmt += this.work[idx].fee[jdx].discountPrice
          }
          this.work[idx].feeAmt = Math.round(this.work[idx].feeAmt * 100) / 100
        }
        this.loading.fee = false
        this.$message('项目数据加载完毕')
      }).catch(ex => {
        this.$message.error(ex.message)
      })
      // 材料
      this.sten.SalePosteQuery(begDate, endDate, this.filter.store, this.filter.cust).then(rst => {
        var dic = {}
        for (var idx in rst) {
          var rec = rst[idx]
          if (!dic[rec.careNo]) {
            dic[rec.careNo] = []
          }
          dic[rec.careNo].push(rec)
        }
        for (idx in this.work) {
          this.work[idx].post = dic[this.work[idx].careNo]
        }
        this.loading.post = false
        this.$message('材料数据加载完毕')
      }).catch(ex => {
        this.$message.error(ex.message)
      })
      // 出库
      try {
        rst = await this.sten.SaleIssueQuery(begDate, /* endDate */'2100-01-01', this.filter.store, this.filter.cust)
        var dic = {}
        for (idx in rst) {
          var rec = rst[idx]
          var key = rec.relatedNo + '|' + rec.plateNo
          if (!dic[key]) {
            dic[key] = []
          }
          dic[key].push(rec)
        }

        for (idx in this.work) {
          this.work[idx].issue = dic[this.work[idx].careNo + '|' + this.work[idx].plateNo]
        }
        this.loading.issue = false
        this.$message('出库数据加载完毕')
      } catch (ex) {
        this.$message.error(ex.message)
      }
      try {
        rst = await this.sten.SaleIssueEntryQuery(begDate, /* endDate */'2100-01-01', this.filter.store, this.filter.cust)
        dic = {}
        for (idx in rst) {
          rec = rst[idx]
          if (!dic[rec.relatedNo]) {
            dic[rec.relatedNo] = {}
          }
          var cDic = dic[rec.relatedNo]
          if (!cDic[rec.outputNo]) {
            cDic[rec.outputNo] = []
          }
          dic[rec.relatedNo][rec.outputNo].push(rec)
        }
        for (idx in this.work) {
          if (this.work[idx].issue) {
            cDic = dic[this.work[idx].careNo]
            for (var jdx in this.work[idx].issue) {
              this.work[idx].issue[jdx].entry = cDic[this.work[idx].issue[jdx].outputNo]
            }
          }
          // this.work[idx].issue = dic[this.work[idx].careNo + '|' + this.work[idx].plateNo]
        }
        this.loading.issueEntry = false
        this.$message('出库明细加载完毕')
      } catch (ex) {
        this.$message.error(ex.message)
      }
      // console.log('rst', this.work)
    },
    async sync () {
      this.loading.syncPercent = 0
      this.loading.sync = true
      var recs = this.multipleSelection
      for (var idx in recs) {
        var rec = recs[idx]
        var rst = await this.k3.Sync(rec)
        if (!rst.success) {
          this.$message.error(rst.info)
        }
        console.log(idx, this.multipleSelection.length)
        this.loading.syncPercent = parseInt((idx + 1) * 100 / recs.length)
        // console.log('rst', rst)
      }
      this.loading.sync = false
      this.query()
    },
    handleSelectionChange (val) {
      this.multipleSelection = val
    }
  }
}
</script>

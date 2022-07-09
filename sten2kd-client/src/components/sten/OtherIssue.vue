<template>
    <div>
      <el-divider>其他出库</el-divider>
        <el-form :inline="true">
            <el-form-item>
                <el-date-picker v-model="filter.date" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
            </el-form-item>
            <el-form-item>
                <el-select v-model="filter.store" placeholder="请选择">
                    <el-option v-for="item in filter.storeList" :key="item.deptId" :label="item.deptName" :value="item.deptId"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button-group>
                    <el-button type="primary" @click="query()">查询</el-button>
                    <el-button type="primary" v-loading="loading.sync" :disabled="loading.work || loading.fee || loading.post || loading.issue || loading.issueEntry" @click="sync()">同步选中记录</el-button>
                </el-button-group>
            </el-form-item>
            <el-progress v-if="loading.sync" :text-inside="true" :stroke-width="26" :percentage="loading.syncPercent">test</el-progress>
            <el-row>
                <el-col :span="24">
                    <el-table ref="multipleTable" v-loading="loading.work" :data="data" @selection-change="handleSelectionChange">
                        <el-table-column prop="seled" type="selection" width="55"></el-table-column>
                        <el-table-column type="expand">
                          <template slot-scope="props">
                            <el-table :data="props.row.entry">
                                  <el-table-column v-for="(v, k) in entryFieldDic" :key="k" :prop="k" :label="v" width="120"></el-table-column>
                                </el-table>
                          </template>
                        </el-table-column>
                        <el-table-column v-for="(v, k) in fieldDic" :key="k" :prop="k" :label="v" width="120"></el-table-column>
                    </el-table>
                </el-col>
            </el-row>
        </el-form>
    </div>
</template>

<script>
import Sten from '@/sten'
import K3 from '@/k3'

export default {
  name: 'PurIn',
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
      fieldDic: {
        inputNo: '入库单号',
        inputTime: '入库日期',
        relateNo: '采购单号',
        careNo: '业务单号',
        category: '入库类别',
        totalPrice: '入库金额',
        taxPrice: '入库含税金额',
        inputCount: '入库数量',
        buyerName: '采购人',
        purPrice: '采购金额',
        supplierName: '供应商',
        plateNo: '车牌',
        modelName: '车型',
        vinNo: 'vin码',
        deptName: '所属门店'
      },
      entryFieldDic: {
        purchaseNo: '采购单号',
        buyTime: '采购日期',
        inputNo: '入库单号',
        inputTime1: '入库日期',
        relateNo: '业务单号',
        plateNo: '车牌',
        modelName: '车型',
        name: '客户',
        contact: '联系人',
        tel1: '电话',
        groupName: '材料目录名称',
        partName: '材料名称',
        brandName: '品牌',
        firmNo: 'OEM',
        partType: '材料类别',
        partNo: '材料号',
        spec: '规格',
        barCode: '条码',
        selfNo: '自编码',
        inputTime: '批次',
        storeName: '仓库',
        positionName: '仓位',
        supplierName: '供应商',
        rawUnit: '单位',
        rawQuantity: '入库数量',
        rawBuyingPrice: '进价',
        buyingTotal: '进价总额',
        rawTaxPrice: '含税价',
        taxTotal: '含税价总额',
        salePrice: '出库价',
        receiverName: '服务顾问',
        purchaseStatus: '采购状态',
        applicant: '申请人',
        buyer: '采购人',
        handler: '入库人',
        creator: '入库操作人',
        deptName: '所属部门'
      },
      data: [],
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
      this.loading.head = true
      this.loading.entry = true
      try {
        var rst = await this.sten.OtherIssue(begDate, endDate, this.filter.store, this.filter.cust)
        this.data = rst
        this.$message('单头数据加载完毕')
      } catch (ex) {
        this.$message.error(ex.message)
      }
      // 明细
      try {
        var entry = await this.sten.OtherIssueEntry()
        for (var jdx in entry) {
          var rec = entry[jdx]
          for (var idx in this.data) {
            if (this.data[idx].inputNo === rec.inputNo) {
              if (!this.data[idx].entry) {
                this.data[idx].entry = []
              }
              this.data[idx].entry.push(rec)
            }
          }
        }
        this.$message('明细数据加载完毕')
      } catch (ex) {
        this.$message.error(ex.message)
      }
      this.loading.entry = false
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

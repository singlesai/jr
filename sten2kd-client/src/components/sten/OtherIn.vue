<template>
    <div>
      <el-divider>其他入库</el-divider>
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
  name: 'OtherIn',
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
        inputId: 'inputId',
        quantity: 'quantity',
        outquantity: 'outquantity',
        inputNo: '入库单号',
        inputTime1: '入库日期',
        relatedNo: '相关单号',
        categoryName: '入库类别',
        handlerName: '经手人',
        quantity1: '入库总数量',
        buyingPrice: '入库总进价',
        salePrice: '入库总出库价',
        freight: '运费',
        remark: '备注',
        inputStatus: '状态'
      },
      entryFieldDic: {
        partName: '材料名称',
        groupName: '材料目录名称',
        inputTime: '入库日期',
        categoryName: '入库类别',
        inputNo: '入库单号',
        rawQuantity: '数量',
        rawUnit: '单位',
        rawBuyingPrice: '进价',
        rawSalePrice: '出库价',
        cnName: '品牌',
        firmNo: 'OEM',
        partNo: '材料号',
        spec: '规格',
        inputTime1: '批次',
        storeName: '仓库',
        positionName: '仓位',
        supplierName: '供应商',
        barCode: '条码',
        selfNo: '自编码',
        remark: '备注',
        handler: '经手人',
        operater: '操作人',
        partType: '材料类别',
        relateNo: '相关单号'
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
        var rst = await this.sten.OtherIn(begDate, endDate, this.filter.store, this.filter.cust)
        this.data = rst
        this.$message('单头数据加载完毕')
      } catch (ex) {
        this.$message.error(ex.message)
      }
      // 明细
      try {
        var entry = await this.sten.OtherInEntry()
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

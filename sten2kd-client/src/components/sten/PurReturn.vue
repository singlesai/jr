<template>
    <div>
      <el-divider>采购退货</el-divider>
        <el-form :inline="true">
            <el-form-item>
                <el-date-picker v-model="filter.date" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
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
                    <el-table ref="multipleTable" v-loading="loading.work" :data="data.filter(data=>(data.syncSuccess || 0) === (filter.synced?1:0))" @selection-change="handleSelectionChange">
                        <el-table-column prop="seled" type="selection" width="55"></el-table-column>
                        <el-table-column type="expand">
                          <template slot-scope="props">
                            <el-table :data="props.row.entry">
                                  <el-table-column v-for="(v, k) in entryFieldDic" :key="k" :prop="k" :label="v" width="120"></el-table-column>
                                </el-table>
                          </template>
                        </el-table-column>
                        <el-table-column v-for="(v, k) in fieldDic" :key="k" :prop="k" :label="v" width="120">
                          <template v-if="k==='syncSuccess'" slot="header">
                            <el-checkbox v-model="filter.synced" size="mini">同步状态</el-checkbox>
                          </template>
                        </el-table-column>
                    </el-table>
                </el-col>
            </el-row>
        </el-form>
    </div>
</template>

<script>
import moment from 'moment'
import Mid from '@/mid'
import K3 from '@/k3'

export default {
  name: 'PurReturn',
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
        syncSuccess: '已同步',
        syncInfo: '同步信息',
        outputNo: '退货单号',
        ouputTime1: '退货日期',
        relateNo: '相关单号',
        categoryName: '出库类别',
        quantityTotal: '退货数量',
        priceTotal: '退货金额',
        taxPrice: '退货含税金额',
        supplierName: '供应商',
        remark: '备注'
      },
      entryFieldDic: {
        partName: '材料名称',
        groupName: '材料目录名称',
        outputTime: '退货时间',
        categoryName: '出库类别',
        outputStatus: '退货状态',
        outputNo: '退货单号',
        quantity: '数量',
        unit: '单位',
        buyingPrice: '进价',
        salePrice: '出库价',
        taxPrice: '出库含税价',
        cnName: '品牌',
        firmNo: 'OEM',
        partNo: '材料号',
        spec: '规格',
        inputTime: '批次',
        storeName: '仓库',
        positionName: '仓位',
        inSupplierName: '入库供应商',
        outSupplierName: '退货供应商',
        barCode: '条码',
        selfNo: '自编码',
        creator: '操作人',
        handler: '经手人',
        partType: '材料类别',
        relatedNo: '相关单号'
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
      this.sten = new Mid()
      this.k3 = new K3()
    },
    async query () {
      // console.log(this.filter.date)
      var begDate
      var endDate
      if (this.filter.date) {
        begDate = moment(this.filter.date[0]).format('YYYY-MM-DD')
        endDate = moment(this.filter.date[1]).format('YYYY-MM-DD')
      }
      this.loading.head = true
      this.loading.entry = true
      try {
        var rst = await this.sten.PurReturn(begDate, endDate)
        this.data = rst
      } catch (ex) {
        this.$message.error(ex.message)
      }
    },
    async sync () {
      this.loading.syncPercent = 0
      this.loading.sync = true
      try {
        var recs = this.multipleSelection
        for (var idx in recs) {
          var rec = recs[idx]
          var rst = await this.k3.syncManuIssueReturn(rec)
          if (!rst.success) {
            this.$message.error(rst.info)
          }
          console.log(idx, this.multipleSelection.length)
          this.loading.syncPercent = parseInt((idx + 1) * 100 / recs.length)
          // console.log('rst', rst)
        }
        this.loading.sync = false
        this.query()
      } catch (ex) {
        this.loading.sync = false
        this.$message.error(ex.message)
      }
    },
    handleSelectionChange (val) {
      this.multipleSelection = val
    }
  }
}
</script>

<template>
  <div id="app">
      <el-divider>思腾-金蝶接口</el-divider>
    <el-col :span="4">
    <el-menu
      default-active="2"
      class="el-menu-vertical-demo"
      @open="handleOpen"
      @close="handleClose">
      <el-menu-item v-if="user==='FSJRPDIGLY'" index="0">
        <i class="el-icon-document"></i>
        <span slot="title"><router-link :to="{name:'Test'}">定时同步</router-link></span>
      </el-menu-item>
      <el-menu-item index="1">
        <i class="el-icon-document"></i>
      <span slot="title"><router-link :to="{name:'StenWork'}">接车工单</router-link></span>
      </el-menu-item>
      <el-submenu index="2">
        <template slot="title">
          <i class="el-icon-location"></i>
          <span>仓储</span>
        </template>
        <el-menu-item-group>
          <el-menu-item index="2-1"><router-link :to="{name:'PurIn'}">采购入库</router-link></el-menu-item>
          <el-menu-item index="2-2"><router-link :to="{name:'PurReturn'}">采购退货</router-link></el-menu-item>
          <el-menu-item index="2-3"><router-link :to="{name:'Stocktaking'}">盘点</router-link></el-menu-item>
          <el-menu-item index="2-4"><router-link :to="{name:'OtherIn'}">其他入库</router-link></el-menu-item>
          <el-submenu index="2-5">
            <template slot="title">其他出库</template>
            <el-menu-item index="2-5-1"><router-link :to="{name:'OtherIssue_Give'}">赠送物料</router-link></el-menu-item>
            <el-menu-item index="2-5-2"><router-link :to="{name:'OtherIssue_Loss'}">损耗</router-link></el-menu-item>
            <el-menu-item index="2-5-3"><router-link :to="{name:'OtherIssue_Tailings'}">尾料出库</router-link></el-menu-item>
          </el-submenu>
          <el-menu-item index="2-6"><router-link :to="{name:'MatRet'}">退料</router-link></el-menu-item>
        </el-menu-item-group>
      </el-submenu>
      <el-submenu index="3">
        <template slot="title">
          <i class="el-icon-location"></i>
          <span>财务</span>
        </template>
        <el-menu-item-group>
          <el-menu-item index="3-1"><router-link :to="{name:'Achievement'}">施工业绩</router-link></el-menu-item>
        </el-menu-item-group>
      </el-submenu>
    </el-menu>
    </el-col>
    <el-col :span="20">
    <router-view/>
    </el-col>
  </div>
</template>

<script>
import Sten from '@/sten'
export default {
  name: 'App',
  data () {
    return {
      sten: {},
      user: undefined
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    async init () {
      this.sten = new Sten()
      await this.sten.init()
      this.user = this.sten.user
    }
  }
}
</script>

<style>
</style>

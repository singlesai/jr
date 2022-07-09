import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import StenWork from '@/components/sten/Work'
import PurIn from '@/components/sten/PurIn'
import PurReturn from '@/components/sten/PurReturn'
import StockTaking from '@/components/sten/StockTaking'
import OtherIn from '@/components/sten/OtherIn'
import OtherIssue from '@/components/sten/OtherIssue'
import MaterialReturn from '@/components/sten/MatRet'
import Achievement from '@/components/sten/Achievement'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/test',
      name: 'Test',
      component: HelloWorld
    },
    {
      path: '/',
      name: 'StenWork',
      component: StenWork
    },
    {
      path: '/PurIn',
      name: 'PurIn',
      component: PurIn
    },
    {
      path: '/PurReturn',
      name: 'PurReturn',
      component: PurReturn
    },
    {
      path: '/Stocktaking',
      name: 'Stocktaking',
      component: StockTaking
    },
    {
      path: '/OtherIn',
      name: 'OtherIn',
      component: OtherIn
    },
    {
      path: '/OtherIssue_Give',
      name: 'OtherIssue_Give',
      component: OtherIssue
    },
    {
      path: '/OtherIssue_Loss',
      name: 'OtherIssue_Loss',
      component: OtherIssue
    },
    {
      path: '/OtherIssue_Tailings',
      name: 'OtherIssue_Tailings',
      component: OtherIssue
    },
    {
      path: '/MatRet',
      name: 'MatRet',
      component: MaterialReturn
    },
    {
      path: '/Achievement',
      name: 'Achievement',
      component: Achievement
    }
  ]
})

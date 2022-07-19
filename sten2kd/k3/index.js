var Mssql = require('mssql')
var cfg = require('../config.json')
var SqlServer = require('../db')

class K3 {
    constructor() {
        this._db = new SqlServer(cfg.db)
    }

    format (val, format) {
        try{
            var o = {
            'M+': val.getMonth() + 1, // month
            'd+': val.getDate(), // day
            'h+': val.getHours(), // hour
            'm+': val.getMinutes(), // minute
            's+': val.getSeconds(), // second
            'q+': Math.floor((val.getMonth() + 3) / 3), // quarter
            'S': val.getMilliseconds() // millisecond
            }
            if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (val.getFullYear() + '').substr(4 - RegExp.$1.length))
            }
            for (var k in o) {
            if (new RegExp('(' + k + ')').test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
            }
            }
            return format
        }catch(ex){
            return val
        }
      }

    async initDB(){
        var strSql = `if not exists(select 1 from sysobjects where type='u' and name='SL_StenSyncStatus')
        create table SL_StenSyncStatus(FCareNo varchar(255),FPlateNo varchar(255),FSuccessed int,FTime datetime,FInfo varchar(max))`
        this._db.excSql(strSql)
    }

    async syncStatus(billNoList) {
        var rst = {}
        var strSql = `select FCareNo,case when isnull(f.FInterID,0)<>0 or isnull(si.FInterID,0)<>0 then FSuccessed else 0 end FSuccessed,FTime,FInfo 
        from SL_StenSyncStatus i 
            left join ICExpenses f on f.FBillNo=i.FCareNo 
            left join icstockbill si on si.FTranType=21 and si.FBillNo=i.FCareNo 
        where FCareNo in ('`+billNoList.join(`','`)+`') order by FTime desc`
        var rs = await this._db.excSql(strSql)
        for (var idx in rs.recordset) {
            var rec = rs.recordset[idx]
            if (!rst[rec['FCareNo']]) {
                rst[rec['FCareNo']] = {syncStatus: rec['FSuccessed'] === 1, syncTime: rec['FTime'], syncInfo: rec['FInfo']}
            }
        }
        return rst
    }

    async getSyncStatus(objectName, begDate) {
        var rst = {}
        var strSql =`select * from SL_StenSyncStatus where isnull(FPlateNo,'')='`+objectName+`' and ftime>='`+begDate+`' order by FTime`
        var rs = await this._db.excSql(strSql)
        for(var idx in rs.recordset){
            var rec = rs.recordset[idx]
            rst[rec.FCareNo]=rec
        }
        return rst
    }

    async sync(bill) {
        var strSql = `select top 1 FSuccessed from SL_StenSyncStatus i 
        left join ICExpenses f on f.FBillNo=i.FCareNo
        left join icstockbill si on si.FTranType=21 and si.FBillNo=i.FCareNo 
    where (isnull(f.FInterID,0)<>0 or isnull(si.FInterID,0)<>0) and FCareNo='`+bill.billNo+`' order by FTime desc`
        var rs = await this._db.excSql(strSql)
        if (rs.recordset.length>0) {
            if (rs.recordset[0]['FSuccessed'] === 1) {
                throw(`单据'`+bill.billNo+`'已同步`)
            }
        }
        try{
            strSql = `select FItemID,F_103 from t_organization where FName = '`+bill.cust+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`客户'`+bill.cust+`'在金蝶中不存在`)
            bill.custId = rs.recordset[0]['FItemID']
            bill.hxId = rs.recordset[0]['F_103']
            
            strSql = `select FItemID,FDepartmentID from t_emp where FName='`+bill.emp+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`职员'`+bill.emp+`'在金蝶中不存在`)
            bill.empId = rs.recordset[0]['FItemID']
            bill.deptId = rs.recordset[0]['FDepartmentID']

            var strSql = `select FItemID from t_department where FNumber='017.001'`// FName='`+bill.dept+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`部门'`+bill.dept+`'在金蝶中不存在`)
            bill.deptId = rs.recordset[0]['FItemID']

            if(bill.post && !bill.issue) {
                throw('有接车材料但匹配不到出库记录')
            }

            for(var idx in bill.fee){
                var fee = bill.fee[idx]
                strSql = `select f_101 FItemID from t_Item_3006 where FName='`+fee.itemName+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`费用'`+fee.itemName+`'在金蝶中不存在`)
                bill.fee[idx].itemId = rs.recordset[0]['FItemID']
            }

            for(idx in bill.issue){
                var issue = bill.issue[idx]
                strSql = `select FItemID from t_icitemcore where FDeleted=0 and FName='`+issue.itemName+`' and FModel='`+issue.itemModel+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`物料'`+issue.itemName+`[`+issue.itemModel+`]'在金蝶中不存在`)
                bill.issue[idx].itemId = rs.recordset[0]['FItemID']
                
                strSql = `select FItemID from t_stock where FName='`+issue.position+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`仓库'`+issue.position+`'在金蝶中不存在`)
                bill.issue[idx].stockId = rs.recordset[0]['FItemID']
            }

            await this._db.begTran()
            try{
                var cnt = 0
                for (idx in bill.fee) {
                    if (fee.price * fee.qty !== 0) {
                        cnt += 1
                    }
                }
                if (cnt > 0) {
                    // 保存费用发票
                    strSql = `update ICMaxNum set FMaxNum=FMaxNum+1 where FTableName='ICExpenses'
                    select FMaxNum id from ICMaxNum where FTableName='ICExpenses'`
                    rs = await this._db.excSql(strSql)
                    var id = rs.recordset[0]['id']
                    for(idx in bill.fee){
                        fee = bill.fee[idx]
                        //if (fee.price !== 0) {
                            strSql = `INSERT INTO ICExpensesEntry (FInterID,FEntryID,FBrNo,FSourceEntryID,FItemID,FUnitID,FAuxQty,FAuxPrice,FAmount,FStdAmount,FTaxRate,FTaxAmount,FStdTaxAmount,FNote,FConfirmAdvice)  
            SELECT `+id+`,`+(parseInt(idx)+1)+`,'0',0,`+fee.itemId+`,'',`+fee.qty+`,`+fee.price+`,`+fee.amount+`,`+fee.amount+`,0,0,0,'`+fee.itemName+`','' `
                            await this._db.excSql(strSql)
                            cnt += 1
                        //}
                    }
                    strSql = `INSERT INTO ICExpenses(FInterID,FBillNo,FBrNo,FTranType,FCancellation,FStatus,FROB,FDate,FInvType,FSaleStyle,FPOStyle,FCustID,FSupplyID,FCurrencyID,FExchangeRateType,FConfirmDate,FExchangeRate,FAcctID,FRSCBillInterID,FDeptID,FEmpID,FCheckDate,FConfirmor,FYearPeriod,FBillerID,FMultiCheckDate1,FMultiCheckDate2,FVchInterID,FMultiCheckDate3,FMultiCheckDate4,FMultiCheckDate5,FMultiCheckDate6,FPayBillInterID,FRecBillInterID,FInvoiceInterID,FCussentAcctID,FSettleDate,FConfirmAdvice,FPrintCount,FHeadSelfI0746,FHeadSelfI0643,FHeadSelfI0747) 
        SELECT `+id+`,'`+bill.billNo+`','0',78,0,0,1,'`+bill.date+`',12521,101,0,`+bill.custId+`,0,1,1,Null,1,0,'',`+bill.deptId+`,`+bill.empId+`,Null,0,'',16394,Null,Null,0,Null,Null,Null,Null,0,0,'',0,'`+bill.date+`','',0,`+bill.hxId+`,`+bill.hxId+`,'`+bill.plateNo+`'`
                    await this._db.excSql(strSql)
                    strSql = `INSERT INTO t_RP_ARPBill (FRP,FYear,FPeriod,FDate,FNumber,FPayType,FBillType,FSubSystemID,FCustomer,FDepartment,FEmployee,FAccountID,FCurrencyID,FExchangeRate,FAmount,FAmountFor,FExplanation,FRPDate,FPreparer,FAdjustExchangeRate,FSource,FSourceID,FItemClassID,FfincDate,FClassTypeID,FRemainAmountFor,FRemainAmount) 
        VALUES (1,year('`+bill.date+`'),month('`+bill.date+`'),'`+bill.date+`','`+bill.billNo+`',998,995,1,`+bill.custId+`,`+bill.deptId+`,`+bill.empId+`,0,1,1,`+bill.feeAmount+`,`+bill.feeAmount+`,'编号为（`+bill.billNo+`）的费用发票','`+bill.date+`',16394,1,8,`+id+`,1,'`+bill.date+`',1000021,`+bill.feeAmount+`,`+bill.feeAmount+`)`
                    await this._db.excSql(strSql)  
                    for(idx in bill.fee){     
                        fee = bill.fee[idx]     
                        strSql = `INSERT INTO t_rp_arpbillEntry (FBillID,FEntryID,FID_SRC,FEntryID_SRC,FClassID_SRC,FBillNo_SRC,FContractNo,FContractEntryID,FAmount,FAmountFor,FRemainAmountFor,FRemainAmount,FCheckAmountFor,FCheckAmount,FOrderEntryID,FOrderNo,FFeeObjID,FAPAcctID,FTaxRate,FAmountNoTax,FAmountNoTaxFor,FTaxAmount,FTaxAmountFor) 
        select FBillID,`+(idx+1)+`,0,0,0,'','','0',`+fee.amount+`,`+fee.amount+`,`+fee.amount+`,`+fee.amount+`,$0.0000,$0.0000,0,'',0,0,$0.0000,`+fee.amount+`,`+fee.amount+`,$0.0000,$0.0000 from t_RP_ARPBill where FNumber='`+bill.billNo+`'`
                        await this._db.excSql(strSql)
                    }
                    strSql = `INSERT INTO t_RP_Contact (FYear,FPeriod,FRP,FType,FDate,FFincDate,FNumber,FCustomer,FDepartment,FEmployee,FCurrencyID,FExchangeRate,FAmount,FAmountFor,FRemainAmount,FRemainAmountFor,FInvoiceID,FRPBillID,FBillID,FRPDate,FBillType,finvoicetype,FItemClassID,FExplanation,FPreparer) 
        select year('`+bill.date+`'),month('`+bill.date+`'),1,1,'`+bill.date+`','`+bill.date+`','`+bill.billNo+`',`+bill.custId+`,`+bill.deptId+`,`+bill.empId+`,1,1,`+bill.feeAmount+`,`+bill.feeAmount+`,`+bill.feeAmount+`,`+bill.feeAmount+`,0,FBillID,0,'`+bill.date+`',995,1,1,'编号为（`+bill.billNo+`）的费用发票',16394 from t_RP_ARPBill where FNumber='`+bill.billNo+`'`
                    await this._db.excSql(strSql)
                    strSql = `update t_organization  set  FLastTradeDate='`+bill.date+`', FLastTradeAmount=`+bill.feeAmount+` where FItemID=`+bill.custId+``
                    await this._db.excSql(strSql)
                    strSql = `INSERT INTO t_RP_Plan_Ar (FBillID,FEntryID,FOrgID,FDate,FAmount,FAmountFor,FRemainAmount,FRemainAmountFor,FRP) 
        select FBillID,1,4140,'`+bill.date+`',`+bill.feeAmount+`,`+bill.feeAmount+`,`+bill.feeAmount+`,`+bill.feeAmount+`,1 from t_RP_ARPBill where FNumber='`+bill.billNo+`'`
                    await this._db.excSql(strSql)
                    strSql = `UPDATE ICExpenses SET FRecBillInterID= (select FBillID from t_RP_ARPBill where FNumber='`+bill.billNo+`') WHERE FInterID= `+id+``
                    await this._db.excSql(strSql)
                }

                // 保存销售出库
                if(bill.issue){
                    cnt = 0
                    for(idx in bill.issue) {
                        if (bill.issue[idx].qty != 0) {
                            cnt += 1
                        }
                    }
                    if (cnt > 0) {
                        strSql = `update ICMaxNum set FMaxNum=FMaxNum+1 where FTableName='ICStockBill'
                        select FMaxNum id from ICMaxNum where FTableName='ICStockBill'`
                        rs = await this._db.excSql(strSql)
                        id = rs.recordset[0]['id']
                        var eid = 0
                        for(idx in bill.issue){
                            var issue = bill.issue[idx]
                            issue.syncedQty = 0
                            strSql = `
        select FKFDate,FKFPeriod,dateadd(day,FKFPeriod,FKFDate) FKF,sum(FQty) FQty from
        (select FKFDate,FKFPeriod,FQty from ICInventory where FItemID=`+issue.itemId+` and FStockID=`+issue.stockId+` and FStockPlaceID=0
        /*union all
        select j.FKFDate,j.FKFPeriod,j.fqty
        from ICStockBill i join ICStockBillEntry j on j.FInterID=i.FInterID
        where isnull(i.FCheckerID,0)=0 and i.FTranType in (1,2,3,5,10,40) and j.fqty>0 and FItemID=`+issue.itemId+` and isnull(j.FDCStockID,j.FSCStockID)=`+issue.stockId+` and isnull(j.FDCSPID,j.FSCSPID)=0
        union all
        select j.FKFDate,j.FKFPeriod,0-j.fqty
        from ICStockBill i join ICStockBillEntry j on j.FInterID=i.FInterID
        where isnull(i.FCheckerID,0)=0 and i.FTranType in (21,24,28,29,43) and j.fqty>0 and FItemID=`+issue.itemId+` and isnull(j.FDCStockID,j.FSCStockID)=`+issue.stockId+` and isnull(j.FDCSPID,j.FSCSPID)=0
        */) i 
        group by FKFDate,FKFPeriod
        having sum(FQty) > 0
        order by dateadd(day,FKFPeriod,FKFDate)`
                            rs = await this._db.excSql(strSql)
                            rs = rs.recordset
                            for(var jdx in rs){
                                var inv = rs[jdx]
                                inv['FKFDate'] = this.format(inv['FKFDate'], 'yyyy-MM-dd')
                                inv['FKF'] = this.format(inv['FKF'], 'yyyy-MM-dd')
                                if(issue.qty>issue.syncedQty){
                                    var qty = (inv['FQty']>=(issue.qty-issue.syncedQty)?(issue.qty-issue.syncedQty):inv['FQty'])
                                    if(qty>0.0001){
                                        strSql = `INSERT INTO ICStockBillEntry (FInterID,FEntryID,FBrNo,FMapNumber,FMapName,FItemID,FOLOrderBillNo,FAuxPropID,FBatchNo,FEntrySelfB0182,FQty,FUnitID,FAuxQtyMust,Fauxqty,FSecCoefficient,FSecQty,FAuxPlanPrice,FPlanAmount,Fauxprice,Famount,Fnote,FKFDate,FKFPeriod,FPeriodDate,FIsVMI,FEntrySupply,FDCStockID,FDCSPID,FEntrySelfB0179,FEntrySelfB0180,FEntrySelfB0181,FConsignPrice,FDiscountRate,FDiscountAmount,FConsignAmount,FOrgBillEntryID,FSNListID,FSourceBillNo,FSourceTranType,FSourceInterId,FSourceEntryID,FContractBillNo,FContractInterID,FContractEntryID,FOrderBillNo,FOrderInterID,FOrderEntryID,FAllHookQTY,FCurrentHookQTY,FQtyMust,FSepcialSaleId,FClientEntryID,FPlanMode,FMTONo,FClientOrderNo,FConfirmMemEntry,FChkPassItem,FSEOutBillNo,FSEOutEntryID,FSEOutInterID,FReturnNoticeBillNo,FReturnNoticeEntryID,FReturnNoticeInterID,FProductFileQty,FOutSourceInterID,FOutSourceEntryID,FOutSourceTranType,FShopName,FPostFee,FEntrySelfB0183)  
                        SELECT `+id+`,`+(eid+1)+`,'0','','',FItemID,'',0,'','',`+qty+`,FUnitID,0,`+qty+`,0,0,0,0,0,0,'`+issue.codeName+`','`+inv['FKFDate']+`',`+inv['FKFPeriod']+`,'`+inv['FKF']+`',0,0,`+issue.stockId+`,0,0,`+issue.settlePrice+`,`+(issue.settlePrice*qty)+`,`+issue.price+`,0,0,`+(issue.price*qty)+`,0,0,'',0,0,0,'',0,0,'',0,0,0,0,0,0,'',14036,'','','',1058,'',0,0,'',0,0,0,0,0,0,'',0,`+(issue.price*qty)+` from t_ICItembase where FItemID=`+issue.itemId
                                        await this._db.excSql(strSql)
                                        eid += 1
                                        issue.syncedQty += qty
                                    }
                                }
                            }
                            if(issue.qty-issue.syncedQty>0.0001){
                                 throw(`物料'`+issue.itemName+`',仓库'`+issue.stockName+`'库存不足`)
                            }
                        }
                        strSql = `EXEC p_UpdateBillRelateData 21,`+id+`,'ICStockBill','ICStockBillEntry' `
                        await this._db.excSql(strSql)
                        strSql = `INSERT INTO ICStockBill(FInterID,FBillNo,FBrNo,FTranType,FCancellation,FStatus,FUpStockWhenSave,FROB,FHookStatus,Fdate,FSupplyID,FSaleStyle,FCheckDate,FConfirmDate,FFManagerID,FSManagerID,FBillerID,FConfirmer,FMultiCheckDate1,FMultiCheckDate2,FMultiCheckDate3,FMultiCheckDate4,FMultiCheckDate5,FPOOrdBillNo,FMultiCheckDate6,FRelateBrID,FOrgBillInterID,FMarketingStyle,FSelTranType,FPrintCount,FBrID,FFetchAdd,FConfirmMem,FExplanation,FDeptID,FEmpID,FManagerID,FVIPCardID,FReceiver,FVIPScore,FHolisticDiscountRate,FPOSName,FWorkShiftId,FLSSrcInterID,FPayCondition,FManageType,FSettleDate,FInvoiceStatus,FConsignee,FEnterpriseID,FSendStatus,FReceiveMan,FConsigneeAdd,FCod,FReceiverMobile,FHeadSelfB0163,FUUID) 
            SELECT `+id+`,'`+bill.billNo+`','0',21,0,0,0,1,0,'`+bill.date+`',`+bill.custId+`,101,Null,Null,`+bill.empId+`,`+bill.empId+`,16394,0,Null,Null,Null,Null,Null,'',Null,0,0,12530,0,0,0,'','','`+bill.note+`',`+bill.deptId+`,`+bill.empId+`,`+bill.empId+`,0,'',0,0,'',0,0,0,0,'`+bill.date+`','',0,0,0,'','','','',`+bill.hxId+`,newid()`
                        await this._db.excSql(strSql)
                    }
                    // strSql = `delete SL_StenSyncStatus where FCareNo='`+bill.billNo+`'`
                    // await this._db.excSql(strSql)
                    strSql = `insert into SL_StenSyncStatus(FCareNo,FSuccessed,FTime,FInfo)
                    select '`+bill.billNo+`',1,getdate(),''`
                    await this._db.excSql(strSql)
                }
                await this._db.endTran()
            }catch(ex){
                await this._db.exitTran()
                throw(ex)
            }
        }catch(ex){
            console.log('err', ex)
            var info = ex.message || ex
            info = info.replace(/'/g, `''`)
            strSql = `insert into SL_StenSyncStatus(FCareNo,FSuccessed,FTime,FInfo)
            select '`+bill.billNo+`',0,getdate(),'`+info+`'`
            await this._db.excSql(strSql)
        }
        return bill
    }

    async saveStockTran(objectName,bill){
        var strSql = `select top 1 FSuccessed from SL_StenSyncStatus i 
        left join icstockbill si on si.FTranType=41 and si.FBillNo=i.FCareNo 
    where isnull(si.FInterID,0)<>0 and FPlateNo='`+objectName+`' and FCareNo='`+bill.billNo+`' order by FTime desc`
        var rs = await this._db.excSql(strSql)
        if (rs.recordset.length>0) {
            if (rs.recordset[0]['FSuccessed'] === 1) {
                throw(`单据'`+bill.billNo+`'已同步`)
            }
        }
        try{
            /*
            strSql = `select FItemID,F_103 from t_organization where FName = '`+bill.cust+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`客户'`+bill.cust+`'在金蝶中不存在`)
            bill.custId = rs.recordset[0]['FItemID']
            bill.hxId = rs.recordset[0]['F_103']
            
            strSql = `select FItemID,FDepartmentID from t_emp where FName='`+bill.emp+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`职员'`+bill.emp+`'在金蝶中不存在`)
            bill.empId = rs.recordset[0]['FItemID']
            bill.deptId = rs.recordset[0]['FDepartmentID']

            var strSql = `select FItemID from t_department where FNumber='017.001'`// FName='`+bill.dept+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`部门'`+bill.dept+`'在金蝶中不存在`)
            bill.deptId = rs.recordset[0]['FItemID']
            */

            for(var idx in bill.entry){
                var entry = bill.entry[idx]
                strSql = `select FItemID from t_icitemcore where FDeleted=0 and FName='`+entry.itemName+`' and FModel='`+entry.itemModel+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`物料'`+entry.itemName+`[`+entry.itemModel+`]'在金蝶中不存在`)
                bill.entry[idx].itemId = rs.recordset[0]['FItemID']
                
                strSql = `select FItemID from t_stock where FName='`+entry.issueStock+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`仓库'`+entry.issueStock+`'在金蝶中不存在`)
                bill.entry[idx].issueStockId = rs.recordset[0]['FItemID']
                
                strSql = `select FItemID from t_stock where FName='`+entry.recStock+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`仓库'`+entry.recStock+`'在金蝶中不存在`)
                bill.entry[idx].recStockId = rs.recordset[0]['FItemID']
            }

            await this._db.begTran()
            try{
                // 保存调拨
                if(bill.entry){
                    cnt = 0
                    for(idx in bill.entry) {
                        if (bill.entry[idx].qty != 0) {
                            cnt += 1
                        }
                    }
                    if (cnt > 0) {
                        strSql = `update ICMaxNum set FMaxNum=FMaxNum+1 where FTableName='ICStockBill'
                        select FMaxNum id from ICMaxNum where FTableName='ICStockBill'`
                        rs = await this._db.excSql(strSql)
                        id = rs.recordset[0]['id']
                        var eid = 0
                        for(idx in bill.entry){
                            var entry = bill.entry[idx]
                            entry.syncedQty = 0
                            strSql = `
        select FKFDate,FKFPeriod,dateadd(day,FKFPeriod,FKFDate) FKF,sum(FQty) FQty from
        (select FKFDate,FKFPeriod,FQty from ICInventory where FItemID=`+entry.itemId+` and FStockID=`+entry.issueStockId+` and FStockPlaceID=0
        /*union all
        select j.FKFDate,j.FKFPeriod,j.fqty
        from ICStockBill i join ICStockBillEntry j on j.FInterID=i.FInterID
        where isnull(i.FCheckerID,0)=0 and i.FTranType in (1,2,3,5,10,40) and j.fqty>0 and FItemID=`+entry.itemId+` and isnull(j.FDCStockID,j.FSCStockID)=`+entry.issueStockId+` and isnull(j.FDCSPID,j.FSCSPID)=0
        union all
        select j.FKFDate,j.FKFPeriod,0-j.fqty
        from ICStockBill i join ICStockBillEntry j on j.FInterID=i.FInterID
        where isnull(i.FCheckerID,0)=0 and i.FTranType in (21,24,28,29,43) and j.fqty>0 and FItemID=`+entry.itemId+` and isnull(j.FDCStockID,j.FSCStockID)=`+entry.issueStockId+` and isnull(j.FDCSPID,j.FSCSPID)=0
        */) i 
        group by FKFDate,FKFPeriod
        having sum(FQty) > 0
        order by dateadd(day,FKFPeriod,FKFDate)`
                            rs = await this._db.excSql(strSql)
                            rs = rs.recordset
                            for(var jdx in rs){
                                var inv = rs[jdx]
                                inv['FKFDate'] = this.format(inv['FKFDate'], 'yyyy-MM-dd')
                                inv['FKF'] = this.format(inv['FKF'], 'yyyy-MM-dd')
                                if(entry.qty>entry.syncedQty){
                                    var qty = (inv['FQty']>=(entry.qty-entry.syncedQty)?(entry.qty-entry.syncedQty):inv['FQty'])
                                    if(qty>0.0001){
                                        strSql = `INSERT INTO ICStockBillEntry (FInterID,FEntryID,FBrNo,FMapNumber,FMapName,FItemID,FOLOrderBillNo,FAuxPropID,FBatchNo,FEntrySelfB0182,FQty,FUnitID,FAuxQtyMust,Fauxqty,FSecCoefficient,FSecQty,FAuxPlanPrice,FPlanAmount,Fauxprice,Famount,Fnote,FKFDate,FKFPeriod,FPeriodDate,FIsVMI,FEntrySupply,FDCStockID,FDCSPID,FSCStockID,FEntrySelfB0179,FEntrySelfB0180,FEntrySelfB0181,FConsignPrice,FDiscountRate,FDiscountAmount,FConsignAmount,FOrgBillEntryID,FSNListID,FSourceBillNo,FSourceTranType,FSourceInterId,FSourceEntryID,FContractBillNo,FContractInterID,FContractEntryID,FOrderBillNo,FOrderInterID,FOrderEntryID,FAllHookQTY,FCurrentHookQTY,FQtyMust,FSepcialSaleId,FClientEntryID,FPlanMode,FMTONo,FClientOrderNo,FConfirmMemEntry,FChkPassItem,FSEOutBillNo,FSEOutEntryID,FSEOutInterID,FReturnNoticeBillNo,FReturnNoticeEntryID,FReturnNoticeInterID,FProductFileQty,FOutSourceInterID,FOutSourceEntryID,FOutSourceTranType,FShopName,FPostFee,FEntrySelfB0183)  
                        SELECT `+id+`,`+(eid+1)+`,'0','','',FItemID,'',0,'','',`+qty+`,FUnitID,0,`+qty+`,0,0,0,0,0,0,'`+entry.codeName+`','`+inv['FKFDate']+`',`+inv['FKFPeriod']+`,'`+inv['FKF']+`',0,0,`+entry.issueStockId+`,0,`+entry.recStockId+`,0,`+entry.settlePrice+`,`+(entry.settlePrice*qty)+`,`+entry.price+`,0,0,`+(entry.price*qty)+`,0,0,'',0,0,0,'',0,0,'',0,0,0,0,0,0,'',14036,'','','',1058,'',0,0,'',0,0,0,0,0,0,'',0,`+(entry.price*qty)+` from t_ICItembase where FItemID=`+entry.itemId
                                        await this._db.excSql(strSql)
                                        eid += 1
                                        entry.syncedQty += qty
                                    }
                                }
                            }
                            if(entry.qty-entry.syncedQty>0.0001){
                                 throw(`物料'`+entry.itemName+`',仓库'`+entry.stockName+`'库存不足`)
                            }
                        }
                        strSql = `EXEC p_UpdateBillRelateData 21,`+id+`,'ICStockBill','ICStockBillEntry' `
                        await this._db.excSql(strSql)
                        strSql = `INSERT INTO ICStockBill(FInterID,FBillNo,FBrNo,FTranType,FCancellation,FStatus,FUpStockWhenSave,FROB,FHookStatus,Fdate,FSupplyID,FSaleStyle,FCheckDate,FConfirmDate,FFManagerID,FSManagerID,FBillerID,FConfirmer,FMultiCheckDate1,FMultiCheckDate2,FMultiCheckDate3,FMultiCheckDate4,FMultiCheckDate5,FPOOrdBillNo,FMultiCheckDate6,FRelateBrID,FOrgBillInterID,FMarketingStyle,FSelTranType,FPrintCount,FBrID,FFetchAdd,FConfirmMem,FExplanation,FDeptID,FEmpID,FManagerID,FVIPCardID,FReceiver,FVIPScore,FHolisticDiscountRate,FPOSName,FWorkShiftId,FLSSrcInterID,FPayCondition,FManageType,FSettleDate,FInvoiceStatus,FConsignee,FEnterpriseID,FSendStatus,FReceiveMan,FConsigneeAdd,FCod,FReceiverMobile,FHeadSelfB0163,FUUID) 
            SELECT `+id+`,'`+bill.billNo+`','0',41,0,0,0,1,0,'`+bill.date+`',`+bill.custId+`,101,Null,Null,`+bill.empId+`,`+bill.empId+`,16394,0,Null,Null,Null,Null,Null,'',Null,0,0,12530,0,0,0,'','','`+bill.note+`',`+bill.deptId+`,`+bill.empId+`,`+bill.empId+`,0,'',0,0,'',0,0,0,0,'`+bill.date+`','',0,0,0,'','','','',`+bill.hxId+`,newid()`
                        await this._db.excSql(strSql)
                    }
                    // strSql = `delete SL_StenSyncStatus where FCareNo='`+bill.billNo+`'`
                    // await this._db.excSql(strSql)
                    strSql = `insert into SL_StenSyncStatus(FCareNo,FPlateNo,FSuccessed,FTime,FInfo)
                    select '`+bill.billNo+`','`+objectName+`',1,getdate(),''`
                    await this._db.excSql(strSql)
                }
                await this._db.endTran()
            }catch(ex){
                await this._db.exitTran()
                throw(ex)
            }
        }catch(ex){
            console.log('err', ex)
            var info = ex.message || ex
            info = info.replace(/'/g, `''`)
            strSql = `insert into SL_StenSyncStatus(FCareNo,FPlateNo,FSuccessed,FTime,FInfo)
            select '`+bill.billNo+`','`+objectName+`',0,getdate(),'`+info+`'`
            await this._db.excSql(strSql)
        }
        return bill
    }

    async saveManuIssue(bill){
        var strSql = `select top 1 FSuccessed from SL_StenSyncStatus i 
        left join icstockbill si on si.FTranType=24 and si.FBillNo=i.FCareNo 
    where isnull(si.FInterID,0)<>0 and FPlateNo='manuIssue' and FCareNo='`+bill.billNo+`' order by FTime desc`
        var rs = await this._db.excSql(strSql)
        if (rs.recordset.length>0) {
            if (rs.recordset[0]['FSuccessed'] === 1) {
                throw(`单据'`+bill.billNo+`'已同步`)
            }
        }
        try{
            /*
            strSql = `select FItemID,F_103 from t_organization where FName = '`+bill.cust+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`客户'`+bill.cust+`'在金蝶中不存在`)
            bill.custId = rs.recordset[0]['FItemID']
            bill.hxId = rs.recordset[0]['F_103']
            */
            strSql = `select FItemID,FDepartmentID from t_emp where FName='`+bill.emp+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`职员'`+bill.emp+`'在金蝶中不存在`)
            bill.empId = rs.recordset[0]['FItemID']
            bill.deptId = rs.recordset[0]['FDepartmentID']
            
            var strSql = `select f_101 FItemID from t_item_3008 where FNumber='`+bill.dept+`' or FName='`+bill.dept+`'`
            rs = await this._db.excSql(strSql)
            if (rs.recordset.length<=0) throw(`部门'`+bill.dept+`'在金蝶中不存在`)
            bill.deptId = rs.recordset[0]['FItemID']
            
            bill.custId = 0
            bill.hxId = 0
            //bill.deptId = 0
            //bill.empId = 0

            for(var idx in bill.entry){
                var entry = bill.entry[idx]
                strSql = `select FItemID from t_icitemcore where FDeleted=0 and FName='`+entry.itemName+`' and FModel='`+entry.itemModel+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`物料'`+entry.itemName+`[`+entry.itemModel+`]'在金蝶中不存在`)
                bill.entry[idx].itemId = rs.recordset[0]['FItemID']
                
                strSql = `select FItemID from t_stock where FName='`+entry.stock+`' or FNumber='`+entry.stock+`'`
                rs = await this._db.excSql(strSql)
                if (rs.recordset.length<=0) throw(`仓库'`+entry.stock+`'在金蝶中不存在`)
                bill.entry[idx].stockId = rs.recordset[0]['FItemID']
            }

            await this._db.begTran()
            try{
                // 保存调拨
                if(bill.entry){
                    var cnt = 0
                    for(idx in bill.entry) {
                        if (bill.entry[idx].qty != 0) {
                            cnt += 1
                        }
                    }
                    if (cnt > 0) {
                        strSql = `update ICMaxNum set FMaxNum=FMaxNum+1 where FTableName='ICStockBill'
                        select FMaxNum id from ICMaxNum where FTableName='ICStockBill'`
                        rs = await this._db.excSql(strSql)
                        var id = rs.recordset[0]['id']
                        var eid = 0
                        for(idx in bill.entry){
                            var entry = bill.entry[idx]
                            if(bill.rob===1){ //领料
                                entry.syncedQty = 0
                                strSql = `
            select FKFDate,FKFPeriod,dateadd(day,FKFPeriod,FKFDate) FKF,sum(FQty) FQty from
            (select FKFDate,FKFPeriod,FQty from ICInventory where FItemID=`+entry.itemId+` and FStockID=`+entry.stockId+` and FStockPlaceID=0
            /*union all
            select j.FKFDate,j.FKFPeriod,j.fqty
            from ICStockBill i join ICStockBillEntry j on j.FInterID=i.FInterID
            where isnull(i.FCheckerID,0)=0 and i.FTranType in (1,2,3,5,10,40) and j.fqty>0 and FItemID=`+entry.itemId+` and isnull(j.FDCStockID,j.FSCStockID)=`+entry.stockId+` and isnull(j.FDCSPID,j.FSCSPID)=0
            union all
            select j.FKFDate,j.FKFPeriod,0-j.fqty
            from ICStockBill i join ICStockBillEntry j on j.FInterID=i.FInterID
            where isnull(i.FCheckerID,0)=0 and i.FTranType in (21,24,28,29,43) and j.fqty>0 and FItemID=`+entry.itemId+` and isnull(j.FDCStockID,j.FSCStockID)=`+entry.stockId+` and isnull(j.FDCSPID,j.FSCSPID)=0
            */) i 
            group by FKFDate,FKFPeriod
            having sum(FQty) > 0
            order by dateadd(day,FKFPeriod,FKFDate)`
                                rs = await this._db.excSql(strSql)
                                rs = rs.recordset
                                for(var jdx in rs){
                                    var inv = rs[jdx]
                                    inv['FKFDate'] = this.format(inv['FKFDate'], 'yyyy-MM-dd')
                                    inv['FKF'] = this.format(inv['FKF'], 'yyyy-MM-dd')
                                    if(entry.qty>entry.syncedQty){
                                        var qty = (inv['FQty']>=(entry.qty-entry.syncedQty)?(entry.qty-entry.syncedQty):inv['FQty'])
                                        if(qty>0.0001){
                                            strSql = `INSERT INTO ICStockBillEntry (FInterID,FEntryID,FBrNo,FMapNumber,FMapName,FItemID,FOLOrderBillNo,FAuxPropID,FBatchNo,FQty,FUnitID,FAuxQtyMust,Fauxqty,FSecCoefficient,FSecQty,FAuxPlanPrice,FPlanAmount,Fauxprice,Famount,Fnote,FKFDate,FKFPeriod,FPeriodDate,FIsVMI,FEntrySupply,FSCStockID,FDCSPID,FConsignPrice,FDiscountRate,FDiscountAmount,FConsignAmount,FOrgBillEntryID,FSNListID,FSourceBillNo,FSourceTranType,FSourceInterId,FSourceEntryID,FContractBillNo,FContractInterID,FContractEntryID,FOrderBillNo,FOrderInterID,FOrderEntryID,FAllHookQTY,FCurrentHookQTY,FQtyMust,FSepcialSaleId,FClientEntryID,FPlanMode,FMTONo,FClientOrderNo,FConfirmMemEntry,FChkPassItem,FSEOutBillNo,FSEOutEntryID,FSEOutInterID,FReturnNoticeBillNo,FReturnNoticeEntryID,FReturnNoticeInterID,FProductFileQty,FOutSourceInterID,FOutSourceEntryID,FOutSourceTranType,FShopName,FPostFee,FEntrySelfB0183,FEntrySelfB0457,FEntrySelfB0458)  
                            SELECT `+id+`,`+(eid+1)+`,'0','','',FItemID,'',0,'',`+qty+`,FUnitID,0,`+qty+`,0,0,0,0,`+entry.price+`,`+(entry.price*qty)+`,'`+entry.codeName+`','`+inv['FKFDate']+`',`+inv['FKFPeriod']+`,'`+inv['FKF']+`',0,0,`+entry.stockId+`,0,`+entry.price+`,0,0,`+(entry.price*qty)+`,0,0,'',0,0,0,'',0,0,'',0,0,0,0,0,0,'',14036,'','','',1058,'',0,0,'',0,0,0,0,0,0,'',0,`+(entry.price*qty)+`,`+entry.price+`,`+(entry.price*qty)+` from t_ICItembase where FItemID=`+entry.itemId
                                            await this._db.excSql(strSql)
                                            eid += 1
                                            entry.syncedQty += qty
                                        }
                                    }
                                }
                                if(entry.qty-entry.syncedQty>0.0001){
                                    throw(`物料'`+entry.itemName+`',仓库'`+entry.stockName+`'库存不足`)
                                }
                            }else{ //退料
                                strSql = `INSERT INTO ICStockBillEntry (FInterID,FEntryID,FBrNo,FMapNumber,FMapName,FItemID,FOLOrderBillNo,FAuxPropID,FBatchNo,FQty,FUnitID,FAuxQtyMust,Fauxqty,FSecCoefficient,FSecQty,FAuxPlanPrice,FPlanAmount,Fauxprice,Famount,Fnote,FKFDate,FKFPeriod,FPeriodDate,FIsVMI,FEntrySupply,FSCStockID,FDCSPID,FConsignPrice,FDiscountRate,FDiscountAmount,FConsignAmount,FOrgBillEntryID,FSNListID,FSourceBillNo,FSourceTranType,FSourceInterId,FSourceEntryID,FContractBillNo,FContractInterID,FContractEntryID,FOrderBillNo,FOrderInterID,FOrderEntryID,FAllHookQTY,FCurrentHookQTY,FQtyMust,FSepcialSaleId,FClientEntryID,FPlanMode,FMTONo,FClientOrderNo,FConfirmMemEntry,FChkPassItem,FSEOutBillNo,FSEOutEntryID,FSEOutInterID,FReturnNoticeBillNo,FReturnNoticeEntryID,FReturnNoticeInterID,FProductFileQty,FOutSourceInterID,FOutSourceEntryID,FOutSourceTranType,FShopName,FPostFee,FEntrySelfB0183,FEntrySelfB0457,FEntrySelfB0458)  
                                SELECT `+id+`,`+(eid+1)+`,'0','','',FItemID,'',0,'',-`+entry.qty+`,FUnitID,0,-`+entry.qty+`,0,0,0,0,`+entry.price+`,-`+(entry.price*entry.qty)+`,'`+entry.codeName+`','',0,'',0,0,`+entry.stockId+`,0,`+entry.price+`,0,0,-`+(entry.price*entry.qty)+`,0,0,'',0,0,0,'',0,0,'',0,0,0,0,0,0,'',14036,'','','',1058,'',0,0,'',0,0,0,0,0,0,'',0,-`+(entry.price*entry.qty)+`,`+entry.price+`,`+(entry.price*entry.qty*-1)+` from t_ICItembase where FItemID=`+entry.itemId
                                await this._db.excSql(strSql)
                                eid += 1
                            }
                        }
                        strSql = `EXEC p_UpdateBillRelateData 21,`+id+`,'ICStockBill','ICStockBillEntry' `
                        await this._db.excSql(strSql)
                        strSql = `INSERT INTO ICStockBill(FInterID,FPurposeID,FBillNo,FBrNo,FTranType,FCancellation,FStatus,FUpStockWhenSave,FROB,FHookStatus,Fdate,FSupplyID,FSaleStyle,FCheckDate,FConfirmDate,FFManagerID,FSManagerID,FBillerID,FConfirmer,FMultiCheckDate1,FMultiCheckDate2,FMultiCheckDate3,FMultiCheckDate4,FMultiCheckDate5,FPOOrdBillNo,FMultiCheckDate6,FRelateBrID,FOrgBillInterID,FMarketingStyle,FSelTranType,FPrintCount,FBrID,FFetchAdd,FConfirmMem,FExplanation,FDeptID,FEmpID,FManagerID,FVIPCardID,FReceiver,FVIPScore,FHolisticDiscountRate,FPOSName,FWorkShiftId,FLSSrcInterID,FPayCondition,FManageType,FSettleDate,FInvoiceStatus,FConsignee,FEnterpriseID,FSendStatus,FReceiveMan,FConsigneeAdd,FCod,FReceiverMobile,FUUID) 
            SELECT `+id+`,12000,'`+bill.billNo+`','0',24,0,0,0,`+bill.rob+`,0,'`+bill.date+`',`+bill.custId+`,101,Null,Null,`+bill.empId+`,`+bill.empId+`,16394,0,Null,Null,Null,Null,Null,'',Null,0,0,12530,0,0,0,'','','`+bill.note+`',`+bill.deptId+`,`+bill.empId+`,`+bill.empId+`,0,'',0,0,'',0,0,0,0,'`+bill.date+`','',0,0,0,'','','','',newid()`
                        await this._db.excSql(strSql)
                    }
                    // strSql = `delete SL_StenSyncStatus where FCareNo='`+bill.billNo+`'`
                    // await this._db.excSql(strSql)
                    strSql = `insert into SL_StenSyncStatus(FCareNo,FPlateNo,FSuccessed,FTime,FInfo)
                    select '`+bill.billNo+`','manuIssue',1,getdate(),''`
                    await this._db.excSql(strSql)
                }
                await this._db.endTran()
            }catch(ex){
                await this._db.exitTran()
                throw(ex)
            }
        }catch(ex){
            console.log('err', ex)
            var info = ex.message || ex
            info = info.replace(/'/g, `''`)
            strSql = `insert into SL_StenSyncStatus(FCareNo,FPlateNo,FSuccessed,FTime,FInfo)
            select '`+bill.billNo+`','manuIssue',0,getdate(),'`+info+`'`
            await this._db.excSql(strSql)
        }
        return bill
    }
}

module.exports = K3

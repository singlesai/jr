var Mssql = require('mssql')
var cfg = require('../config.json')
var SqlServer = require('../db')

class Sten {
    constructor() {
        this._db = new SqlServer(cfg.stendb)
        this._table = {}
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

    async get(obj, begDate, endDate, dateField){
        this._db.init()
        var strSql = `select * from `+obj+` where `+dateField+`>='`+begDate+`' and `+dateField+`<='`+endDate+`'`
        var rs = await this._db.excSql(strSql)
        return rs.recordset
    }

    match(val1, val2){
        for(var key in val1){
            if(!(key in val2)) {
                return false
            }
            if(val1[key]!==val2[key]) {
                return false
            }
        }
        if(val1.length!==val2.length) {
            return false
        }
        return true
    }

    async set(obj, keyField, val) {
        var rst = []
        this._db.init()
        if(typeof val == 'object' && val.constructor == Array) {
            for(var idx in val) {
                await this.set(obj, keyField, val[idx])
            }
        } else {
            if(!this._table[obj]){
                strSql = `select j.name from sysobjects i join syscolumns j on j.id=i.id where i.name='`+obj+`'`
                rs = await this._db.excSql(strSql)
                if(rs.recordset.length===0) {
                    strSql = `create table `+obj+`(FSynced int)`
                    await this._db.excSql(strSql)
                    this._table[obj] = ['FSynced']
                }else{
                    this._table[obj] = []
                    for(var idx in rs.recordset){
                        this._table[obj].push(rs.recordset[idx].name)
                    }
                }
            }
            for(var key in val){
                if(this._table[obj].indexOf(key)===-1){
                    if(typeof val[key] === 'number' && !isNaN(val[key])) {
                        strSql = `alter table `+obj+` add `+key+` decimal(28,10)`
                    }else{
                        strSql = `alter table `+obj+` add `+key+` varchar(255)`
                    }
                    await this._db.excSql(strSql)
                    this._table[obj].push(key)
                }
            }
            var strWhere = `where 1=1`
            if(typeof keyField == 'object' && keyField.constructor == Array) {
                for(key in keyField) {
                    strWhere += ` and [`+keyField[key]+`]='`+val[keyField[key]]+`'`
                }
            }else{
                strWhere += ` and [`+keyField+`]='`+val[keyField]+`'`
            }
            var strSql = `select * from `+obj+` ` + strWhere
            var rs = await this._db.excSql(strSql)
            var canInsert = true
            if(rs.recordset.length>0){
                if(!this.match(rs.recordset[0], val)){
                    strSql = `delete `+obj+` `+strWhere
                    await this._db.excSql(strSql)
                }else{
                    canInsert = false
                }
            }
            if(canInsert){
                var strSqlInsert = undefined
                var strSqlVals = undefined
                for(var key in val){
                    if(!strSqlInsert){
                        strSqlInsert = `insert into `+obj+`(`
                    }else{
                        strSqlInsert+=`,`
                    }
                    strSqlInsert+=key
                    if(!strSqlVals){
                        strSqlVals = `values(`
                    }else{
                        strSqlVals+=`,`
                    }
                    if(typeof val[key] === 'number' && !isNaN(val[key])) {
                        strSqlVals+=val[key]
                    }else{
                        strSqlVals+=`'`+val[key]+`'`
                    }
                    await this._db.excSql(strSql)
                    this._table[obj].push(key)
                }
                strSql=strSqlInsert+`)`+strSqlVals+`)`
                await this._db.excSql(strSql)
                rst.push(val)
            }
        }
        return rst
    }

    async getPurIn(begDate, endDate) {
        this._db.init()
        var strSql = `select * from purin where inputtime>='`+begDate+`' and inputtime<='`+endDate+`'`
        var rst = await this._db.excSql(strSql)
        var dic = {}
        for(var idx in rst.recordset){
            dic[rst.recordset[idx].inputNo] = rst.recordset[idx]
        }
        strSql = `select j.* from purin i join purinentry j on j.inputNo=i.inputNo where i.inputtime>='`+begDate+`' and i.inputtime<='`+endDate+`'`
        var rste = await this._db.excSql(strSql)
        for(var idx in rste.recordset){
            if(rste.recordset[idx].inputNo in dic){
                if(!dic[rste.recordset[idx].inputNo]['entry']){
                    dic[rste.recordset[idx].inputNo]['entry'] = []
                }
                dic[rste.recordset[idx].inputNo]['entry'].push(rste.recordset[idx])
            }
        }
        var rl = []
        for(var key in dic){
            rl.push(dic[key])
        }
        return rl
    }
}

module.exports = Sten
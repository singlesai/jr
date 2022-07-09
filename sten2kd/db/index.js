var Mssql = require('mssql')

class SqlServer {
    constructor(cfg) {
        this._db = new Mssql.ConnectionPool({
            server: cfg.server,
            port: cfg.port,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
            options: {
                encrypt: false
            }
        })
        this._connectiing = false
        this._inTran = false
        this._tran = undefined
        this._req = undefined
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

    async init() {
        if (!this._connectiing) {
            await this._db.connect()
            this._connectiing = true
        }
    }

    async begTran() {
        await this.init()
        if(!this._inTran) {
            this._inTran = true
            this._tran = new Mssql.Transaction(this._db)
            await this._tran.begin()
            this._req = new Mssql.Request(this._tran)
        }
    }

    async endTran() {
        await this.init()
        if(this._inTran) {
            await this._tran.commit()
            this._inTran = false
            this._tran = undefined
        }
    }

    async exitTran() {
        await this.init()
        if(this._inTran){
            await this._tran.rollback()
            this._inTran = false
            this._tran = undefined
        }
    }

    async excSql(strSql){
        try{
            if(!strSql){
                throw('sql sentence is null')
            }
            await this.init()
            if(this._inTran){
                return await this._req.query(strSql)
            }else{
                return await this._db.query(strSql)
            }
        }catch(ex){
            console.log('execSql Err:', strSql)
            throw(ex)
        }
    }
}

module.exports = SqlServer
function QueryRapper(whereOpts) {
  this.tName = null;
  this.selectFroms = [];
  this.whereOpts = whereOpts || {};
  this.whereClauses = [];
  this.orderBys = [];
  this.dataValues = {};
}

QueryRapper.prototype = {

  operators : {
    'eq'   : '=',
    'ne'   : '!=',
    'lt'   : '<',
    'gt'   : '>',
    'gte'  : '>=',
    'lte'  : '<=',
    'like' : 'LIKE',
    'in'   : 'IN',
    'notin'  : 'NOT IN'
  },

  keys: function(obj) {
    var keys = [], key;
    for ( key in obj ) {
        if (obj.hasOwnProperty(key)) { keys.push(key); }
    }
    return keys;
  },

  selectQuery : function () {
    return 'SELECT' + this.generateSelectClause() + this.generateWhereClauses() + this.generateOrderByClause() + ';';
  },

  insertQuery : function() {
    return 'INSERT INTO ' + this.tName + this.generateValuesClause() + ';';
  },

  deleteQuery : function() {
    return 'DELETE FROM ' + this.tName + this.generateWhereClauses() + ';';
  },

  updateQuery : function() {
    return 'UPDATE ' + this.tName + this.generateSetClause() + this.generateWhereClauses() + ';';
  },

  clear: function() {
    this.tName = null;
    this.selectFroms = [];
    this.whereOpts = {};
    this.whereClauses = [];
    this.orderBys = [];
    this.dataValues = {};
    return this;
  },

  'and' : function(opts) {
    this.whereClauses.push(new QueryRapper.WhereClause('and', opts));
    return this;
  },

  'or' : function(opts) {
    this.whereClauses.push(new QueryRapper.WhereClause('or', opts));
    return this;
  },

  tableName : function(name) {
    this.tName = this.quoteName(name);
    return this;
  },

  selectFrom : function(tableName, opts) {
    this.selectFroms.push(new QueryRapper.SelectFrom(tableName, opts));
    return this;
  },

  values: function(values) {
    this.dataValues = values || {};
    return this;
  },

  order : function() {
    var i,a;
    for (i=0; a = arguments[i]; i++ ) { this.orderBys.push(a); }
    return this;
  },

  escapeString : function(str) {
    return str.replace("'", "''");
  },

  quoteName : function(str) {
    return '"' + str + '"';
  },

  generateSelectClause : function() {
    var i, sf, info, opts = [], tables = [], i2, opt;
    if (this.selectFroms.length == 0) {
      if (!this.tName) { throw new QueryRapper.ArgumentError('Table name has not been set.'); }
      return ' * FROM ' + this.tName;
    } else {
      for (i=0; sf = this.selectFroms[i]; i++) {
        info = sf.process();
        tables.push(info.table);
        for (i2=0; opt = info.opts[i2]; i2++) { opts.push(opt); }
      }
      return ' ' + opts.join(', ') + ' FROM ' + tables.join(', ');
    }
  },

  generateValuesClause : function() {
    var v, keys = [], vals = [];
    for (v in this.dataValues) {
      keys.push(this.quoteName(v));
      vals.push(this.formatVal(this.dataValues[v]));
    }
    return ' ( ' + keys.join(', ') + ' ) VALUES ( ' + vals.join(', ') + ' )';
  },

  generateSetClause : function() {
    var v, vals = [];
    for ( v in this.dataValues ) {
      vals.push( this.quoteName(v) + ' = ' + this.formatVal(this.dataValues[v]) );
    }
    return ' SET ' + vals.join(', ');
  },

  generateOrderByClause : function() {
    return this.orderBys.length == 0 ? '' : ' ORDER BY ' + this.orderBys.join(', ');
  },

  generateWhereClauses : function() {
    var str = this.generateWhereClause();
    if (!str && this.whereClauses.length == 0) { return ''; }
    var i, c, gc;
    for (i=0; c = this.whereClauses[i]; i++) {
      gc = c.generateWhereClause();
      if (!gc) { continue; }
      str = '( ' + str + ' ' + c.kind.toUpperCase() + ' ' + gc + ' )';
    }
    return str ? ' WHERE ' + str : '';
  },

  formatVal: function(val) {
    var arr, v, i;
    val = typeof val == 'function' ? val() : val;
    switch (typeof val) {
      case 'string':
        val = "'" + this.escapeString(val) + "'";
        break;
      case 'boolean':
        val = val ? 1 : 0;
        break;
      case 'number':
        // Do nothing
        break;
      case 'object':
        if (val === null) {
          val = 'NULL';
        } else if (val instanceof Array) {
          arr = [];
          for (i = 0; v = val[i]; i++) { arr.push(this.formatVal(v)); }
          val = ' ( ' + arr.join(', ') + ' )';
        } else {
          throw new QueryRapper.ArgumentError('Unknown value passed to query');
        }
        break;
    }
    return val;
  },

  generateWhereClause : function() {
    var o, keyOp, arr = [], op, val;
    for (o in this.whereOpts) {
      keyOp = o.split('.');
      var k = this.quoteName(keyOp[0]);
      keyOp[1] = (keyOp[1] || 'eq').toLowerCase();
      op = this.operators[keyOp[1]];
      if (!op) {
        throw new QueryRapper.ArgumentError('Invalid operator: ' + keyOp[1]);
      }
      if (val === null) {
        if (keyOp[1] == 'eq') {
          op = 'IS';
        } else if (keyOp[1] == 'ne') {
          op = 'IS NOT';
        } else {
          throw new QueryRapper.ArgumentError('Invalid operator for null value: ' + op);
        }
      } else if (val instanceof Array) {
        if (keyOp[1] == 'eq') {
          op = 'IN';
        } else if (keyOp[1] == 'ne') {
          op = 'NOT IN';
        }
      }
      arr.push(k + ' ' + op + ' ' + this.formatVal(this.whereOpts[o]));
    }
    return '( ' + arr.join(' AND ') + ' )';
  }
}

QueryRapper.ArgumentError = function(msg) { this.description = msg; }
QueryRapper.ArgumentError.prototype = new Error();

QueryRapper.WhereClause = function(kind, opts) {
  this.kind = kind;
  this.whereOpts = opts || {};
  this.checkKinds();
}

QueryRapper.WhereClause.prototype = {
  checkKinds : function() {
    var validKinds = ['and', 'or'];
    var kind, i, found = false;
    for (i=0; kind = validKinds[i]; i++) {
      if (this.kind === kind) { found = true; }
    }
    if (!found) {
      throw new QueryRapper.ArgumentError('Invalid kind passed to QueryRapper initialization: ' + this.kind);
    }
  },
  generateWhereClause : QueryRapper.prototype.generateWhereClause,
  operators : QueryRapper.prototype.operators,
  quoteName : QueryRapper.prototype.quoteName,
  formatVal : QueryRapper.prototype.formatVal,
  escapeString : QueryRapper.prototype.escapeString
}

QueryRapper.SelectFrom = function(tableName, opts) {
  this.tableName = tableName;
  this.opts = opts;
};

QueryRapper.SelectFrom.prototype = {
  process : function() {
    var tName, t, tPhrase, o, opts = [], key, keys, i;
    if (typeof this.tableName == 'object') {
      tName = QueryRapper.prototype.keys(this.tableName)[0];
      t = this.quoteName(this.tableName[tName]);
      tPhrase = this.quoteName(tName) + ' AS ' + t;
    } else {
      tPhrase = t = this.quoteName(this.tableName);
    }

    if (this.opts instanceof Array) {
      for (i=0; o = this.opts[i]; i++) {
        opts.push(t + '.' + this.quoteName(o));
      }
    } else if (typeof this.opts == 'object') {
      keys = QueryRapper.prototype.keys(this.opts);
      for (i=0; key = keys[i]; i++) {
        opts.push(t + '.' + this.quoteName(key) + ' AS ' + this.quoteName(this.opts[key]));
      }
    } else if (opts === null) {
      opts.push(t + '.*');
    } else {
      throw new QueryRapper.ArgumentError('Invalid object type sent to 2nd argument of selectFrom');
    }
    return {
      table: tPhrase,
      opts: opts
    };
  },
  quoteName: QueryRapper.prototype.quoteName
};


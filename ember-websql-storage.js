/**
  @module data
  @submodule data-adapters
*/

/**
  The Cordova Storage adapter enables the use of permanent storage in your mobile applications. Column names match the
  attribute names exactly as they are defined. The `id` is expected to be present for document retrieval and saving.
  This class is modeled from the same base as the storage adapter.

  @class CordovaStorageAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
*/

DS.WebSqlStorageAdapter = DS.Adapter.extend({

  dbName: 'websqldb',
  dbVersion: '1.0',
  dbDisplayName: 'WebSQL DB',
  dbSize: 5000000,   // Size is determined in bytes
  logQueries: false,

  serializer: DS.JSONSerializer.create(),

  init: function() {
    this._super.apply(this, arguments);
    var cont = window.sqlitePlugin ? window.sqlitePlugin : window;
    this.db = cont.openDatabase(this.dbName, this.dbVersion, this.dbDisplayName, this.dbSize);
  },

  find: function(store, type, id) {
    var qr = new QueryRapper({id: id}).tableName(this.tableName(type));
    var adapter = this;
    return this.query(qr.selectQuery(), function(tx, results) {
      var data = {}, root = adapter.singularize(type);
      data[root] = {};
      if (results.rows.length > 0) {
        data[root] = results.rows.item(0);
        return data;
      } else {
        throw new Error('Record was not found');
      }
    });
  },

  findAll: function(store, type) {
    var qr = new QueryRapper().tableName(this.tableName(type));
    var adapter = this;
    return this.query(qr.selectQuery(), function(tx, results) {
      var data = {}, root = adapter.pluralize(type);
      data[root] = [];
      for (var i = 0; i < results.rows.length; i++) { data[root].push(results.rows.item(i)); }
      return data;
    });
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.singularize(type),
        adapter = this;
    var qr = new QueryRapper(query).tableName(this.tableName(type));
    return this.query(qr.selectQuery(), function(tx, results) {
      var data = {}, root = adapter.pluralize(type);
      data[root] = [];
      for (var i = 0; i < results.rows.length; i++) { data[root].push(results.rows.item(i)); }
      return data;
    });
  },

  createRecord: function(store, type, record) {
    var data = this.serialize(store,type,record);
    var adapter = this;
    var qr = new QueryRapper().tableName(this.tableName(type)).values(data);
    return this.query(qr.insertQuery(), function(tx, results) {
      return adapter.serializeWithRootAndId(store,type,record,results.insertId);
    });
  },

  updateRecord: function(store, type, record) {
    var data = this.serialize(store,type,record);
    var adapter = this;
    var qr = new QueryRapper({id: record.id}).tableName(this.tableName(type)).values(data);
    return this.query(qr.updateQuery(), function(tx, results) {
      return adapter.serializeWithRoot(store, type, record);
    });
  },

  deleteRecord: function(store, type, record) {
    var adapter = this;
    var qr = new QueryRapper({id: record.get('id')}).tableName(this.tableName(type));
    return this.query(qr.deleteQuery(), function(tx, results) {
      return adapter.serializeWithRoot(store, type, record);
    });
  },

  singularize: function(recordOrString) {
    if (recordOrString.typeKey) { recordOrString = recordOrString.typeKey; }
    return Ember.String.singularize(recordOrString);
  },

  pluralize: function(string) {
    if (string.typeKey) { string = string.typeKey ; }
    return Ember.String.pluralize(string);
  },

  serialize: function(store, type, record) {
    var data = {};
    data = this.serializer.serialize(record);
    return data;
  },

  serializeWithRoot: function(store, type, record) {
    var data = {}, root = this.singularize(type);
    data[root] = this.serialize(store,type,record);
    return data;
  },

  serializeWithRootAndId: function(store,type, record, id) {
    var data = this.serializeWithRoot(store,type,record);
    data.id = id
    return data;
  },

  tableName: function(type) {
    return this.pluralize(type.typeKey);
  },

  logError: function() {
    if (this.logQueries && console && console.error) {
      console.error.apply(console, arguments);
    }
  },

  logInfo: function() {
    if (this.logQueries && console && console.info) {
      console.info.apply(console, arguments);
    }
  },

  query: function(query, callback) {
    var adapter = this;
    this.logInfo('Running query: ' + query);
    return new Ember.RSVP.Promise(function(resolve, reject) {
      adapter.db.transaction(
          function(tx)  {
            tx.executeSql(query, [], function(tx, results) {
              var data = callback(tx, results);
              Ember.run(null, resolve, data);
            });
          },
          function(err) {
            adapter.logError(err, query);
            Ember.run(null, reject, err);
          }
      );
    });
  }

});

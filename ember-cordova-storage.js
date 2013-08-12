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

DS.CordovaStorageAdapter = DS.Adapter.extend({

  dbName: 'cordovadb',
  dbVersion: '1.0',
  dbDisplayName: 'Cordova DB',
  dbSize: 5000000,   // Size is determined in bytes
  serializer: DS.JSONSerializer,

  init: function() {
    this._super.apply(this, arguments);
    this.db = openDatabase(this.dbName, this.dbVersion, this.dbDisplayName, this.dbSize);
  },

  find: function(store, type, id) {
    var qr = new QueryRapper({id: id}).tableName(this.tableName(type));
    var adapter = this;
    return this.query(qr.selectQuery())
        .then(function(arr) {
          var tx = arr[0], results = arr[1];
          var data = {}, root = adapter.rootForType(type);
          data[root] = {};
          if (results.rows.length > 0) {
            data[root] = results.rows.item(0);
            adapter.didFindRecord(store,type,data,id);
          } else {
            throw new Error('Record was not found');
          }
        })
        .then(null, DS.rejectionHandler);
  },

  findAll: function(store, type) {
    var qr = new QueryRapper().tableName(this.tableName(type));
    var adapter = this;
    return this.query(qr.selectQuery())
        .then(
          function(arr) {
            var tx = arr[0], results = arr[1];
            var data = {}, root = adapter.rootForType(type) + 's';
            data[root] = [];
            for (var i = 0; i < results.rows.length; i++) { data.push(results.rows.item(i)); }
            adapter.didFindAll(store,type,data);
            this.logInfo(data);
          },
          DS.rejectionHandler
        );
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type),
        adapter = this;
    var qr = new QueryRapper(query).tableName(this.tableName(type));
    return this.query(qr.selectQuery())
        .then(function(arr) {
          var tx = arr[0], results = arr[1];
          var data = {}, root = adapter.rootForType(type) + 's';
          data[root] = [];
          for (var i = 0; i < results.rows.length; i++) { data.push(results.rows.item(i)); }
          adapter.didFindQuery(store,type,data,recordArray);
        })
        .then(null, DS.rejectionHandler);
  },

  createRecord: function(store, type, record) {
    if (record.validate && !record.validate()) {
      return store.recordWasInvalid(record, record.errors);
    }
    var data = this.serialize(record);
    var adapter = this;
    var qr = new QueryRapper().tableName(this.tableName(type)).values(data);
    var query = qr.insertQuery();
    return this.query(query)
        .then(
          function(arr) {
            var tx = arr[0], results = arr[1];
            data.id = results.insertId;
            var dat = {}, root = adapter.rootForType(type);
            dat[root] = data;
            adapter.didCreateRecord(store, type, record, dat);
          },
          function(err) {
            adapter.dbError(store, query, err, type, record);
            throw err;
          }
        ).then(null, DS.rejectionHandler);
  },

  updateRecord: function(store, type, record) {
    if (record.validate && !record.validate()) {
      return store.recordWasInvalid(record, record.errors);
    }
    var data = this.serialize(record);
    var adapter = this;
    var qr = new QueryRapper({id: record.id}).tableName(this.tableName(type)).values(data);
    var query = qr.updateQuery();
    return this.query(query)
        .then(
          function(tx, results) {
            var dat = adapter.serializeWithRootAndId(type, record);
            adapter.didUpdateRecord(store, type, record, dat);
          },
          function(err) {
            adapter.dbError(store, query, err, type, record);
          }
        ).then(null, DS.rejectionHandler);
  },

  deleteRecord: function(store, type, record) {
    var adapter = this;
    var qr = new QueryRapper({id: record.get('id')}).tableName(this.tableName(type));
    var query = qr.deleteQuery();
    return this.query(query)
        .then(
          function(tx, results) { adapter.didDeleteRecord(store,type,record); },
          function(err) { adapter.dbError(store, query, err, type, record); }
    ).then(null, DS.rejectionHandler);
  },


  ///////////// Support Functions //////////////////
  dbError: function(store, query, err, type, record) {
    this.logError(query, err, record);
    record.errors = record.errors || {};
    record.errors.db = err.message;
    this.didError(store,type,record);
  },

  rootForType: function(type) {
    var serializer = Ember.get(this, 'serializer');
    return serializer.rootForType(type);
  },

  pluralize: function(string) {
    var serializer = Ember.get(this, 'serializer');
    return serializer.pluralize(string);
  },

  serializeWithRootAndId: function(type, record) {
    var data = {}, root = this.rootForType(type);
    data[root] = this.serialize(record);
    data[root].id = record.id;
    return data;
  },

  tableName: function(type) {
    return this.pluralize(this.rootForType(type));
  },

  logError: function() {
    if (console && console.error) {
      console.error.apply(console, arguments);
    }
  },

  logInfo: function() {
    if (console && console.info) {
      console.info.apply(console, arguments);
    }
  },

  query: function(query) {
    var adapter = this;
    this.logInfo('Running query: ' + query);
    return new Ember.RSVP.Promise(function(resolve, reject){
      adapter.db.transaction(
          function(tx)  { tx.executeSql(query, [], function(tx, results) { Ember.run(null, resolve, [tx, results]); }); },
          function(err) { adapter.logError(query); Ember.run(null, reject, err); }
      );
    });
  }

});

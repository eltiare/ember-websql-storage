/**
  @module data
  @submodule data-adapters
*/

// Placeholder for later use. May just switch to JSONSerializer if customization not needed.
DS.CordovaStorageSerializer = DS.JSONSerializer.extend({
  /*init: function() {
    this._super.apply(this, arguments);
  }*/
});

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
  serializer: DS.CordovaStorageSerializer,

  init: function() {
    this._super.apply(this, arguments);
    this.db = openDatabase(this.dbName, this.dbVersion, this.dbDisplayName, this.dbSize);
  },

  find: function(store, type, id) {
    console.info('Finding!');
    var qr = new QueryRapper({id: id}).tableName(this.tableName(type));
    var adapter = this;
    function selectSuccess(tx, results) {
      var data, root;
      if (results.rows.length > 0) {
        root = adapter.rootForType(type);
        data = {};
        data[root] = results.rows.item(0);
      }
      adapter.didFindRecord(store,type,data,id);
    }
    var query = qr.selectQuery();
    this.db.transaction(
      function(tx) { tx.executeSql(query, [], selectSuccess); },
      function(err) { console.error(query, err); throw err; }
    )
  },

  createRecord: function(store, type, record) {
    console.info('Creating!');
    if (record.validate && !record.validate()) {
      return store.recordWasInvalid(record, record.errors);
    }
    var data = this.serialize(record);
    var adapter = this;
    var qr = new QueryRapper().tableName(this.tableName(type)).values(data);
    var query = qr.insertQuery();
    function insertSuccess(tx, results) {
      data.id = results.insertId;
      var dat = {}, root = adapter.rootForType(type);
      dat[root] = data;
      adapter.didCreateRecord(store, type, record, dat);
    }
    return this.db.transaction(
      function(tx) { tx.executeSql(query, [], insertSuccess); },
      function(err) { this.dbError(query, err, type, record); }
    );
  },

  updateRecord: function(store, type, record) {
    console.info('Updating!');
    if (record.validate && !record.validate()) {
      return store.recordWasInvalid(record, record.errors);
    }
    var data = this.serialize(record);
    var adapter = this;
    var qr = new QueryRapper({id: record.id}).tableName(this.tableName(type)).values(data);
    var query = qr.updateQuery();
    function updateSuccess(tx, results) {
      var dat = adapter.serializeWithRootAndId(type,record);
      adapter.didUpdateRecord(store, type, record, dat);
    }
    return this.db.transaction(
      function(tx) { tx.executeSql(query, [], updateSuccess); },
      function(err) { this.dbError(query, err, type, record); }
    )
  },

  deleteRecord: function(store, type, record) {
    console.info('Deleting!');
    var adapter = this;
    var qr = new QueryRapper({id: record.get('id')}).tableName(this.tableName(type));
    var query = qr.deleteQuery();
    console.info(query);
    function deleteSuccess(tx, results) {
      adapter.didDeleteRecord(store,type,record);
    }
    return this.db.transaction(
      function(tx) { tx.executeSql(query, [], deleteSuccess); },
      function(err) { this.dbError(query, err, type, record); }
    );
  },


  ///////////// Support Functions //////////////////
  dbError: function(query, err, type, record) {
    console.error(query, err, record);
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
  }

});
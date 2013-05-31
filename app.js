window.App = Ember.Application.create();

App.Store = DS.Store.extend({
  adapter: DS.CordovaStorageAdapter.create()
});

App.createTables = function() {
  var db = App.Store.create().adapter.db;
  db.transaction(
    function(tx) {
      tx.executeSql('DROP TABLE IF EXISTS test_models;');
      tx.executeSql('CREATE TABLE IF NOT EXISTS test_models (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
        '"string" TEXT,' +
        '"number" REAL,' +
        '"date" TEXT,' +
        '"boolean" INTEGER' +
        ');');
    },
    function(err) {
      console.error(err);
      throw new Exception('Database error!');
    },
    function() {
      App.dbCreated = true;
    }
  );

}

App.dbCreated = false;

App.TestModel = DS.Model.extend({
  string:   DS.attr('string'),
  number:   DS.attr('number'),
  date:     DS.attr('date'),
  boolean:  DS.attr('boolean')
});



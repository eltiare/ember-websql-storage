window.App = {};

App.createTables = function() {
  var db = store.adapter.create().db;

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

App.TestModel = DS.Model.extend({
  number:   DS.attr('number'),
  date:     DS.attr('date'),
  string:   DS.attr('string'),
  boolean:  DS.attr('boolean')
});

window.store = createStore({ adapter: DS.WebSqlStorageAdapter.extend({ logQueries: true }), test_model: App.TestModel});

App.dbCreated = false;
setTimeout(App.createTables, 500);



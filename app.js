Ember.run(function() {
  window.App = Ember.Application.create();
});

App.rootElement = '#ember-root';
App.Router.map(function() {
  this.route("home", { path: '/'});
})

Ember.run(function() {
  App.setupForTesting();
  App.injectTestHelpers();
});

var store;
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

App.dbCreated = false;

var transforms = {
  'boolean': DS.BooleanTransform.create(),
  'date': DS.DateTransform.create(),
  'number': DS.NumberTransform.create(),
  'string': DS.StringTransform.create()
};

// Prevent all tests involving serialization to require a container
DS.JSONSerializer.reopen({
  transformFor: function(attributeType) {
    return this._super(attributeType, true) || transforms[attributeType];
  }
});

Ember.run(function() {
  window.env = setupStore({ isDefaultStore: true, test_model: App.TestModel, adapter: DS.WebSqlStorageAdapter.extend({ logQueries: true }), serializer: DS.JSONSerializer });
  window.store = env.store;
  store = window.store = env.store;
  setTimeout(App.createTables, 500);
})






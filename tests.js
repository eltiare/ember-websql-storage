var m;

function waitForDbInit() {
  waitsFor(function() { return App.dbCreated; }, 'DB initialization', 4000);
}

function waitsFor(fn, label, time) {
  QUnit.stop();
  var int2 = setInterval(function() {
    throw new Error(label + 'was not completed after ' + time + ' ms.');
  }, time);
  var int =  setInterval(function() {
    if (fn()) {
      clearInterval(int);
      clearInterval(int2);
      QUnit.start();
    }
  }, 50);
}
//var inc = 0;
// var id = 1;
module('CRUD', {
  setup: function() {
    waitForDbInit();
    Ember.run(function() {
      m = store.createRecord('test_model', {
        // id:  id,
        string: 'String!',
        number: 1234,
        date: new Date(),
        boolean: true
      });
    });
  },
  teardown: function() {
    // m.destroyRecord();
  },
});

// This method is useful for debugging
var viewTestModelsTable = function(msg) {
  store.adapterFor('test_model').db.transaction(function(tx) {
    tx.executeSql('select * from test_models', [], function(_tx, res) {
      console.log(msg);
      console.log('number of rows found:', res.rows.length);
      for(i = 0; i < res.rows.length; i++) {
        console.log('row:', res.rows.item(i));
      }
    });
  });
};

asyncTest('creates a record', function() {
  Ember.run(function() {
    viewTestModelsTable('before m.save()');
    m.save().then(function() {
      viewTestModelsTable();
      ok(m.get('number') === 1234);
      start();
    }, function(err) {
      console.error(err, err.message);
      ok(false);
      start();
    });
  });
});

asyncTest('retrieves a record', function() {
  Ember.run(function() {
    m.save().then(function() {
      viewTestModelsTable('before findAll');
      var first = store.findAll('test_model')[0];
      var m2 = store.find('test_model', m.get('id'));
      m2.then(function() {
        ok(m2.get('string') == m.get('string'));
        start();
      }, function(err) {
        throw(err);
        start();
      });
    });
  });
});

asyncTest('updates a record', function() {
  Ember.run(function() {
    m.save().then(function() {
      m.set('number', 4567);
      m.save().then(function() {
        ok(m.get('number') === 4567);
        start();
      }, function(err) {
        throw(err);
        console.error(err);
        ok(false);
        start();
      });
    }, function(err) {
      console.error(err);
      ok(false);
      start();
    });
  });

});


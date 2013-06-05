describe('EmberCordovaStorageAdapter', function() {
  var m;

  beforeEach(function() {
    waitForDbInit();
    runs(function() {
      m = App.TestModel.createRecord({
        string: 'String!',
        number: 1234,
        date: new Date(),
        boolean: true
      });
      m.save();
      waitForReady();
    });
  });

  it('creates a record', function() {
    waitForReady();
    runs(function() { expect(m.get('number')).toBe(1234); });
  });

  it('retrieves a record', function() {
    waitForReady();
    runs(function() {
      m2 = App.TestModel.find(m.id);
      waitForReady(m2);
    });
    runs(function() { expect(m2.get('string')).toBe(m.get('string')); });
  });

  it('updates a record', function() {
    waitForReady();
    runs(function() {
      m.set('number', 4567);
      m.save();
      waitForReady();
    });
    runs(function() { m.reload(); waitForReady(); });
    runs(function() { expect(m.get('number')).toBe(4567); });
  });

  it('deletes a record', function() {
    waitForReady();
    runs(function() { m.deleteRecord(); waitForDeleted(); });
    runs(function() { expect(m.get('isDeleted')).toBe(true); });
  });

  function waitForDbInit() {
    waitsFor(function() { return App.dbCreated; }, 'DB initialization', 4000);
  }

  function waitForDeleted(model) {
    model = model || m;
    waitForMessage(model, 'rootState.deleted.committed');
  }

  function waitForReady(model) {
    model = model || m;
    waitForMessage(model, 'rootState.loaded.saved');
  }

  function waitForMessage(model, msg) {
    waitsFor(function() {
      console.info(msg, model.get('stateManager.currentPath'));
      return model.get('stateManager.currentPath') == msg;
    }, 'model message: ' + msg, 1500);
  }

});
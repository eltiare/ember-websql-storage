(function() {
  App.createTables();
  var intCounter = 0;
  var int = setInterval(function() {
    if (App.dbCreated) {
      clearInterval(int);
      doTests();
    } else {
      intCounter++;
      if (intCounter > 100) {
        clearInterval(int);
        throw new Exception('Database creation took too long. Tests not running');
      }
    }
  }, 100);

  function doTests() {

    test("creation of records", function() {
      expect(0);
      var m = App.TestModel.createRecord({
        string: 'String!',
        number: 1234,
        date: new Date(),
        boolean: true
      });
      m.save();

    });

    test("finding of records", function() {
      var m = App.TestModel.find(1);
      console.info(m, m.get('string'));
      ok(m.get('string') == 'String!');
    });

  }
})();

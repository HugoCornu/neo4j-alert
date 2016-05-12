//Config
var config = require('./config.json');


//Dependencies 
var Agenda = require('agenda');
var neo4j = require('neo4j-driver').v1;
var nDriver = neo4j.driver(config.neo4j.path, neo4j.auth.basic(config.neo4j.login, config.neo4j.pwd));
var hash = require('object-hash');
var mongoClient = require('mongodb').MongoClient;
require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );


/* Functions */

var addHash = function(cypherResponse){
// Add an Hash to the result of a Cypher query
// the Hash will be used later to test equality
  cypherResponse.hash = hash(cypherResponse.records)
  cypherResponse.date = new Date()
  return cypherResponse;
}

var testChange = function(cypherResponse) {
// Test if the result of the current cypher query is equal to the result of the last query
// Return a promise 
  return new Promise(function(resolve, reject) {
    mongoClient.connect(config.mongoConnectionString, function(err, db) {
      if (err !== null) return reject(err);
      db.collection('records').find().limit(1).sort({
        $natural: -1
      }).toArray(function(err, docs) {
        if (err !== null) return reject(err);
        cypherResponse.hasChanged = !(docs[0] && (docs[0].hash === cypherResponse.hash));
        db.close();
        resolve(cypherResponse);
      })
    });
  });
}


var mInsertPromise = function(record) {
// Simple mongodb insert as a promise
  return new Promise(function(resolve, reject) {
    mongoClient.connect(config.mongoConnectionString, function(err, db) {
      if (err !== null) return reject(err);
      db.collection('records').insert(record, function(err, docs) {
        if (err !== null) return reject(err);
        db.close();
        resolve(docs);
      })
    });
  });
}


var changeAlert= function(){
// Function called to notify a change in the data
  console.log('The data has changed');
  // here you could plug an emailing feature
}




var checkCypher = function(cypher,done) {
// Emit a cypher request and test if the data changed
// (params,callback) structure for easy use with Agenda.js
  var nSession = nDriver.session();
  nSession.run(cypher)
    .then(addHash)
    .then(testChange)
    .then(function(response) {
      if (response.hasChanged) {
        changeAlert();
        return mInsertPromise(response);
      } else {
        console.log('no change');
        return 'no change';
      }
    })
    .then(function() {
      nSession.close();
      done();
    })
    .catch(console.log);
};


/* launching Agenda */

var agenda = new Agenda({db: {address: config.mongoConnectionString}});
agenda.define('checking cypher', {priority: 'high', concurrency: 10}, function(job, done) {
// Define loop action
  var cypher = job.attrs.data.cypher;
  checkCypher(cypher, done);
});

agenda.on('ready', function() {
// Start looping
  agenda.every(config.checkFrequency, 'checking cypher', {cypher: config.cypher});
  checkCypher(config.cypher,agenda.start);
});
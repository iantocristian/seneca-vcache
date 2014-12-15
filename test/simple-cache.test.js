/* Copyright (c) 2010-2014 Richard Rodger */
"use strict";

var _ = require('underscore')
var util = require('util')
var async = require('async')

var assert = require('assert')


var seneca = require('seneca')


var si = seneca({log:'silent'})
si.use('cache')
si.use('mem-store');
si.use('..')


si.__testcount = 0
var testcount = 0


var entdata = {
  "test": {
    "ent": {
      "1": {
        "entity$": "-/test/ent",
        "id": 1,
        "val": 1
      }
    }
  }
}


describe('vcache', function(){

  before(function(done) {
    si.ready(function() {
      var ent$ = si.make('test/ent');
      async.series([
        function(done) {
          ent$.native$(function(err, entmap) {
            _.extend(entmap, entdata);
            done();
          });
        }
      ], done);
    });
  })

  function dumpall(done) {
    console.log('DUMPALL');
    async.series([
      // dump store
      function(done) {
        console.log('STORE');
        si.act('role:mem-store,cmd:dump',function(err,dump) {
          console.log(JSON.stringify(dump, null, 4));
          done();
        });
      },
      // dump cache
      function(done) {
        console.log('CACHE');
        si.act('role:cache,get:native',function(err,lru) {
          var keys = lru.keys();
          var map = _.reduce(keys, function(map, key) {
            map[key] = lru.peek(key);
            return map;
          }, {});
          console.log(JSON.stringify(map, null, 4));
          done();
        });
      },
      // dump vcache cache
      function(done) {
        console.log('LRU');
        si.act('plugin:vcache,get:lru-cache',function(err,lru) {
          var keys = lru.keys();
          var map = _.reduce(keys, function(map, key) {
            map[key] = lru.peek(key);
            return map;
          }, {});
          console.log(JSON.stringify(map, null, 4));
          done();
        });
      }
    ], done);
  }

  it('consistent', function(done){
    var ent$ = si.make('test/ent');
    async.series([
      dumpall,
      function(done) {
        ent$.load$(1, function(err, ent) {
          console.log(JSON.stringify(ent, null, 4));
          done();
        });
      },
      dumpall,
      function(done) {
        console.log('ok');
        ent$.save$({
          "id": 1,
          "val": 2
        }, done);
      },
      dumpall,
      function(done) {
        ent$.load$(1, function(err, ent) {
          assert.equal(ent.val, 2);
          done();
        });
      },
      dumpall
    ], function(err) {
      if (err) {
        console.error(err);
      }
      done();
    });
  })

  after(function(done) {
    si.close(done);
  })

})




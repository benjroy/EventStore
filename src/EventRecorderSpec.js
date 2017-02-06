'use strict';

var expect = require('chai').expect;
var _ = require('lodash');
var q = require('q');

var localforageStorage = require('./local-storage');

var EventRecorder = require('./EventRecorder');
var CONSTANTS = require('./constants');

var ID = '0000000000000000000000000000000000000000';

describe('EventRecorder:', function () {

    before(function (done) {
        this.recorder = new EventRecorder(ID, localforageStorage);
        this.recorder.clear()
            .then(function () {
                done();
            }, done)
            .done();
    });

    describe('id:', function () {
        it('should not allow construction without valid string id as the first argument', function () {
            var Err = TypeError;
            var errMsgRegex = /id <string> required/;
            expect(function () {
                new EventRecorder(undefined);
            }).to.throw(Err, errMsgRegex);
        });

        it('should set provided id on instance', function () {
            expect(this.recorder).to.have.property('id')
                .that.is.a('string');
            expect(this.recorder.id).to.eql(ID);
        });
    });

    describe('storage:', function () {
        it('instance `storage` should not exist after construction if no `storage` module provided as argument to constructor', function () {
            var Err = TypeError;
            var errMsgRegex = /storage <object> with localforage-compatible API required/;

            expect(function () {
                new EventRecorder(ID, undefined);
            }).to.throw(Err, errMsgRegex);
        });

        it('should be able to be constructed with a `storage` module provided as the second argument to the constructor', function () {
            var recorder = new EventRecorder(ID, localforageStorage);
            expect(recorder).to.have.property('_storage')
                .that.is.an('object');
        });
    });

    describe('_key:', function () {
        it('should have a method that provides storage key', function () {
            expect(EventRecorder).to.respondTo('_key');
            expect(this.recorder).to.have.property('_key')
                .that.is.a('function');
        });

        it('should use instance `id`', function () {
            expect(this.recorder._key()).to.eql(CONSTANTS.STORAGE_PREFIX + '-' + this.recorder.id);            
        });
    });

    describe('startTime:', function () {
        before(function (done) {
            this.recorder.clear()
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should set startTime by default to current time', function () {
            var now = (new Date()).getTime();
            var recorder = new EventRecorder(ID, localforageStorage);
            expect(recorder).to.have.property('startTime')
                .that.is.a('number');
            expect(recorder.startTime).to.be.within(now - 2, now + 2); //fudge the time due to promise async
        });

    });

    describe('ready:', function () {

        it('should have a `ready` method', function () {
            expect(EventRecorder).to.respondTo('ready');
            expect(this.recorder).to.have.property('ready')
                .that.is.a('function');
        });

        it('should return a promise', function () {
            expect(this.recorder.ready()).to.respondTo('then');
        });

        it('should resolve returned promise when storage has been fetched', function (done) {
            this.timeout(500);
            this.recorder.ready()
                .then(function () {
                    done();
                }, done)
                .done();
        });
    });

    describe('fetch:', function () {
        it('should have a fetch method', function () {
            expect(EventRecorder).to.respondTo('fetch');
        });
        
        it('should return a promise', function () {
            expect(this.recorder.fetch()).to.respondTo('then');
        });

        it('should return data in the structure of EventRecorder._SCHEMA', function (done) {
            this.recorder.fetch()
                .then(function (data) {
                    _.each(EventRecorder._SCHEMA, function (val, key) {
                        expect(typeof data[key]).to.eql(typeof val);
                    });
                })
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should store retrieved data on instance as private-ish property `_store`', function (done) {
            var recorder = this.recorder;

            recorder.fetch()
                .then(function (data) {
                    expect(recorder._store).to.eql(data);
                })
                .then(function () {
                    done();
                }, done)
                .done();
        });
    });

    describe('_processItem:', function () {
        it('should create an item with name, data, and time added since start', function () {
            var eventName = 'foobar';
            var eventData = { boo: 'meh' };
            var item = this.recorder._processItem(eventName, eventData);
            var timeSinceStart = _.now() - this.recorder.startTime;
            expect(item).to.have.property('t')
                .that.is.a('number');
            expect(item).to.have.property('n')
                .that.is.a('string');
            expect(item).to.have.property('d');
            // expect(item.t).to.equal(timeSinceStart);
            expect(item.t).to.be.closeTo(timeSinceStart, 2);
            expect(item.n).to.equal(eventName);
            expect(item.d).to.eql(eventData);
        });
    });

    describe('push:', function () {

        before(function (done) {
            this.recorder.clear()
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should have a push method', function () {
            expect(EventRecorder).to.respondTo('push');
            expect(this.recorder).to.have.property('push')
                .that.is.a('function');
        });

        it('should require eventName <string> when pushing items', function () {
            var self = this;

            var Err = TypeError;
            var errMsgRegex = /eventName <string> required/;

            expect(function () {
                self.recorder.push(undefined);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.recorder.push(1);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.recorder.push(true);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.recorder.push(false);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.recorder.push({});
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.recorder.push([]);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.recorder.push('a string');
            }).not.to.throw();

        });

        it('should return a promise', function () {
            expect(this.recorder.push('fooName', { bar: 'baz' }))
                .to.respondTo('then');
        });

        it('should store pushed objects in instance\'s memory storage', function (done) {
            var eventName = 'foobar';
            var eventData = { boo: 'meh' };
            var item;
            var self = this;
            this.recorder.ready()
                .then(function () {
                    item = self.recorder._processItem(eventName, eventData);
                    return self.recorder.push(eventName, eventData);
                })
                .then(function () {
                    var lastStoreItem = _.last(self.recorder._store.items);
                    expect(lastStoreItem.n).to.eql(item.n);
                    expect(lastStoreItem.d).to.eql(item.d);
                    expect(lastStoreItem.t).to.be.closeTo(item.t, 2); //fudge the time due to promise async
                })
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should store pushed items in instance `_storage`', function (done) {
            var eventName = 'anotherfoobar';
            var eventData = { meh: 'bee' };
            var item = this.recorder._processItem(eventName, eventData);
            var self = this;

            this.recorder.push(eventName, eventData)
                .then(function () {
                    return self.recorder.fetch();
                })
                .then(function (data) {
                    var lastFetchedItem = _.last(data.items);
                    expect(lastFetchedItem.n).to.eql(item.n);
                    expect(lastFetchedItem.d).to.eql(item.d);
                    expect(lastFetchedItem.t).to.be.within(item.t - 2, item.t + 2);  //fudge time due to promise async
                })
                .then(function () {
                    done();
                }, done)
                .done();
        });
    });

    describe('clear:', function () {

        it('should return a promise', function (done) {
            var clearReturn = this.recorder.clear();
            expect(clearReturn).to.respondTo('then');
            // let async chain finish before finishing test
            clearReturn
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should set startTime to now', function (done) {
            var self = this;
            var expectedStartTime;
            var startTime;
            this.recorder.fetch()
                .then(function (data) {
                    startTime = data.startTime;
                    return self.recorder.push('event', { some: 'data' });
                })
                .then(function () {
                    expect(self.recorder._store.items.length).to.be.above(0);
                    expectedStartTime = _.now();
                    return self.recorder.clear();
                })
                .then(function () {
                    expect(self.recorder.startTime).not.to.eql(startTime);
                    expect(self.recorder.startTime).to.be.within(expectedStartTime - 2, expectedStartTime + 2); //fudge the time due to promise async
                })
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should empty out stored items', function (done) {
            var self = this;
            this.recorder.clear()
                .then(function () {
                    return q.all([
                        self.recorder.push('event', { some: 'data' }),
                        self.recorder.push('event', { some: 'other data' })
                    ]);
                })
                .then(function () {
                    expect(self.recorder._store.items.length).to.eql(2);
                    return self.recorder.clear();
                })
                .then(function () {
                    expect(self.recorder._store.items.length).to.eql(0);
                })
                .then(function () {
                    done();
                }, done)
                .done();
        });
    });

    describe('destroy:', function () {
        it('should totally remove instance key and data from _storage', function (done) {
            var recorder = new EventRecorder('some-fake-new-id', localforageStorage);
            var storageKey = recorder._key();
            recorder.ready()
                .then(function () {
                    return recorder.destroy();
                })
                .then(function () {
                    expect(recorder._storage).to.be.null();
                    expect(recorder._store).to.be.null();
                    expect(recorder.id).to.be.null();
                })
                .then(function () {
                    // check storage provided to instance for key.
                    return localforageStorage.getItem(storageKey)
                        .then(function (storedData) {
                            expect(storedData).to.be.null();
                        });
                })
                // let async chain finish before finishing test
                .then(function () {
                    done();
                }, done)
                .done();
        });

        it('should return a promise', function (done) {
            var recorder = new EventRecorder(ID, localforageStorage);
            recorder.ready()
                .then(function () {
                    var destroyReturn = recorder.destroy();
                    expect(destroyReturn).to.respondTo('then');
                    return destroyReturn;
                })
                // let async chain finish before finishing test
                .then(function () {
                    done();
                }, done)
                .done();
        });

    });

});

'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('lodash');
var events = require('events');

var EventPlayer = require('./EventPlayer');

var TIME_FUDGE = 50; // events can be emitted within this many ms of their defined time delay

describe('EventPlayer', function () {

    beforeEach(function () {
        this.player = new EventPlayer();
        this.TEST_ITEMS_DATA = [
            {
                n: 'foo',
                d: { bar: 'baz' },
                t: 10
            },
            {
                n: 'foo',
                d: { bar: 'biz' },
                t: 200
            },
            {
                n: 'bar',
                d: { bar: 'bizza' },
                t: 210
            },
            {
                n: 'foo',
                d: { bar: 'biz' },
                t: 300
            },
            {
                n: 'bar',
                d: { bar: 'bizza' },
                t: 400
            },
            {
                n: 'foo',
                d: { bar: 'biz' },
                t: 500
            },
            {
                n: 'bar',
                d: { bar: 'bizza' },
                t: 600
            }
        ];
    });

    afterEach(function () {
        this.player.clear();
    });

    it('should be an event emitter', function () {
        expect(this.player).to.have.property('emit', events.EventEmitter.prototype.emit);
        expect(this.player).to.have.property('on', events.EventEmitter.prototype.on);
        expect(this.player).to.have.property('addListener', events.EventEmitter.prototype.addListener);
        expect(this.player).to.have.property('removeListener', events.EventEmitter.prototype.removeListener);
    });

    describe('load:', function () {

        it('ensures data fits EventRecorder._SCHEMA', function () {
            var self = this;

            var Err = TypeError;
            var errMsgRegex = /EventPlayer.load requires Array of itemsData/;

            expect(function () {
                self.player.load(undefined);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load(true);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load(false);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load(1);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load(0);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load(-1);
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load('string');
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load({});
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load({
                    startTime: 1234,
                    items: []
                });
            }).to.throw(Err, errMsgRegex);

            expect(function () {
                self.player.load([]);
            }).not.to.throw();

            expect(function () {
                self.player.load([
                    {},
                    {},
                    {}
                ]);
            }).not.to.throw();

            expect(function () {
                self.player.load(self.TEST_ITEMS_DATA);
            }).not.to.throw();
        });

        it('sets loaded data as `private` _data on the instance', function () {
            this.player.load(this.TEST_ITEMS_DATA);
            expect(this.player._data).to.eql(this.TEST_ITEMS_DATA);
        });

    });

    describe('setMaxDelay:', function () {
        it('sets instance _maxDelay', function () {
            this.player.setMaxDelay(100);
            expect(this.player._maxDelay).to.eql(100);
        });

        it('throws if not called with a number', function () {
            var Err = TypeError;
            var errMsgRegex = /maxDelay must be a number/;

            var self = this;
            expect(function () {
                self.player.setMaxDelay(true);
            }).to.throw(Err, errMsgRegex);
            expect(function () {
                self.player.setMaxDelay(false);
            }).to.throw(Err, errMsgRegex);
            expect(function () {
                self.player.setMaxDelay('string');
            }).to.throw(Err, errMsgRegex);
            expect(function () {
                self.player.setMaxDelay([]);
            }).to.throw(Err, errMsgRegex);
            expect(function () {
                self.player.setMaxDelay({});
            }).to.throw(Err, errMsgRegex);
            expect(function () {
                self.player.setMaxDelay();
            }).to.throw(Err, errMsgRegex);
        });
    });

    describe('Constructor:', function () {

        it('will call load if Constructor is called with data to load', function () {
            var player = new EventPlayer(this.TEST_ITEMS_DATA);
            expect(player._data).to.eql(this.TEST_ITEMS_DATA);
        });

        it('will set _maxDelay if a number is provided as the second argument', function () {
            var player = new EventPlayer(this.TEST_ITEMS_DATA, 200);
            expect(player._maxDelay).to.eql(200);
        });

    });

    describe('_emitError:', function () {
        it('emits supplied argument as an `error` event on the instance', function () {
            var spy = sinon.spy();

            var errorData = {
                just: 'some',
                data: 1
            };
            this.player.on('error', spy);

            this.player._emitError(errorData);

            expect(spy.calledWithExactly(errorData)).to.eql(true);

            var moreErrorData = 'just some string';

            this.player._emitError(moreErrorData);

            expect(spy.calledWithExactly(moreErrorData)).to.eql(true);
        });
    });

    describe('_emitEvent:', function () {
        beforeEach(function () {
            this.itemData = {
                n: 'foo',
                d: [],
                t: 1
            };
        });

        it('emits on instance an `event` event with the supplied item', function () {
            var spy = sinon.spy();
            this.player.on('event', spy);
            this.player._emitEvent(this.itemData);
            expect(spy.calledWithExactly(this.itemData)).to.eql(true);
        });

        it('emits on instance an event named <item.n> with payload <item.d>', function () {
            var spy = sinon.spy();
            this.player.on(this.itemData.n, spy);
            this.player._emitEvent(this.itemData);
            expect(spy.calledWithExactly(this.itemData.d)).to.eql(true);
        });
    });

    describe('start:', function () {

        it('should require data to be loaded by <instance>.load', function () {
            var Err = Error;
            var errMsgRegex = /no data to playback/;

            var self = this;
            expect(function () {
                self.player.start();
            }).to.throw(Err, errMsgRegex);
            self.player.clear();
        });

        it('keeps track of time when started', function () {
            this.player.load(this.TEST_ITEMS_DATA);
            var now = _.now();
            this.player.start();
            expect(this.player._playing).to.be.closeTo(now, 5); //fudge time due to promise async
        });

        it('fires a `complete` event when there are no items left to play back', function (done) {
            this.timeout(50);
            this.player.load([]);
            this.player.once('complete', function () {
                done();
            });
            this.player.start();
        });

        it('fires a generic `event` event for every item it plays back', function (done) {
            this.player.load(this.TEST_ITEMS_DATA);

            var spy = sinon.spy();
            var length = this.TEST_ITEMS_DATA.length;

            this.player.on('event', spy);
            this.player.once('complete', function () {
                expect(spy.callCount).to.eql(length);
                done();
            });
            this.player.start();
        });

        it('emits error events if item data is not in proper format', function (done) {
            var dataWithBadItem = [
                {
                    n: 'foo',
                    d: { bar: 'baz' },
                    t: 1
                },
                {
                    n: 'foo',
                    d: { bar: 'baz' },
                    badTimeKey: 1
                },
                {
                    not: 'foo',
                    properly: { bar: 'biz' },
                    formatted: 20
                },
                {
                    not: 'foo',
                    properly: { bar: 'biz' },
                    t: 20
                },
                {
                    n: 'foo',
                    improperDataKeyShouldNotError: { bar: 'biz' },
                    t: 20
                }
            ];

            this.player.load(dataWithBadItem);

            var eventSpy = sinon.spy();
            var errorSpy = sinon.spy();

            this.player.on('event', eventSpy);
            this.player.on('error', errorSpy);
            this.player.once('complete', function () {
                expect(eventSpy.callCount).to.eql(2);
                expect(errorSpy.callCount).to.eql(3);
                done();
            });

            this.player.start();
        });

        it('emits events based on item name `.n` with item data `.d`', function (done) {
            this.player.load(this.TEST_ITEMS_DATA);
            
            var fooSpy = sinon.spy();
            var barSpy = sinon.spy();

            var fooLength = _.where(this.TEST_ITEMS_DATA, { n: 'foo' }).length;
            var barLength = _.where(this.TEST_ITEMS_DATA, { n: 'bar' }).length;

            this.player.on('foo', fooSpy);
            this.player.on('bar', barSpy);

            this.player.once('complete', function () {
                expect(fooSpy.callCount).to.eql(fooLength);
                expect(barSpy.callCount).to.eql(barLength);
                done();
            });
            this.player.start();
        });

        it('emits events after <item.t> time has passed since player was started', function (done) {
            var spy = sinon.spy();
            var expectedStartTime = _.now();
            var itemData = {
                t: 100,
                n: 'foo',
                d: [ 1, 2, 3, 4 ]
            };
            this.player.load([ itemData ]);
            this.player.on(itemData.n, spy);
            this.player.once('complete', function () {
                expect(spy.calledOnce).to.eql(true);
                var timeElapsed = _.now() - expectedStartTime;
                expect(timeElapsed).to.be.closeTo(itemData.t, TIME_FUDGE);
                expect(timeElapsed).to.be.at.least(itemData.t);
                done();
            });
            this.player.start();
        });

        it('emits multiple events at the right times', function (done) {
            this.player.load(this.TEST_ITEMS_DATA);

            var expectedStartTime = _.now();
            var spy = sinon.spy();
            var length = this.TEST_ITEMS_DATA.length;

            this.player.on('event', spy);
            this.player.on('event', function (itemData) {
                var timeElapsed = _.now() - expectedStartTime;
                expect(timeElapsed).to.be.at.least(itemData.t);
                expect(timeElapsed).to.be.closeTo(itemData.t, TIME_FUDGE);
            });
            this.player.once('complete', function () {
                expect(spy.callCount).to.eql(length);
                done();
            });
            this.player.start();
        });

        it('respects _maxDelay when timing emitted events', function (done) {
            var maxDelay = 20;
            var player = new EventPlayer(this.TEST_ITEMS_DATA, maxDelay);
            var expectedStartTime = _.now();
            var spy = sinon.spy();
            var length = this.TEST_ITEMS_DATA.length;

            player.on('event', spy);
            player.on('event', function () {
                var now = _.now();
                var timeElapsed = now - expectedStartTime;
                expect(timeElapsed).to.be.at.most(maxDelay + TIME_FUDGE);
                // reset expectedStartTime to now to test delay until next event
                expectedStartTime = now;
            });

            player.once('complete', function () {
                expect(spy.callCount).to.eql(length);
                done();
            });
            player.start();
        });

        it('<instance>.load throws an error if <instance> is playing', function () {
            var self = this;

            var Err = Error;
            var errMsgRegex = /cannot load data while playing back/;

            expect(function () {
                self.player.load(self.TEST_ITEMS_DATA);
                self.player.start();
                self.player.load();
            }).to.throw(Err, errMsgRegex);
        });

        it('should noop if <instance> already started', function () {
            var self = this;
            var _setPlayingStub = sinon.stub(this.player, '_setPlaying', function () {
                return EventPlayer.prototype._setPlaying.call(self.player);
            });
            this.player.load(this.TEST_ITEMS_DATA);
            this.player.start();
            expect(_setPlayingStub.calledOnce).to.eql(true);
            this.player.start();
            expect(_setPlayingStub.calledOnce).to.eql(true);
            _setPlayingStub.restore();
        });
    });

    describe('stop:', function () {
        it('clears the timeout for the next item to be processed', function () {
            this.player.load(this.TEST_ITEMS_DATA);
            this.player.start();
            expect(this.player._nextItemTimeout).not.to.be.null();
            this.player.stop();
            expect(this.player._nextItemTimeout).to.be.null();
        });

        it('unsets the playing flag', function () {
            this.player.load(this.TEST_ITEMS_DATA);
            this.player.start();
            expect(this.player._playing).to.be.a('number');
            expect(this.player._playing).not.to.be.false();
            this.player.stop();
            expect(this.player._playing).to.be.false();            
        });

        it('leaves items to be played when stopped in the middle of emitting events', function (done) {
            var current = 0;
            var stopAt = ~~(this.TEST_ITEMS_DATA.length / 2);
            var expectedRemaining = this.TEST_ITEMS_DATA.length - stopAt;
            var self = this;
            this.player.load(this.TEST_ITEMS_DATA);
            this.player.on('event', function () {
                current++;
                if (current === stopAt) {
                    self.player.stop();
                    expect(self.player._data.length).to.eql(expectedRemaining);
                    done();
                }
            });
            this.player.start();
        });
    });

    describe('clear:', function () {

        it('calls <instance>.stop', function () {
            var stopStub = sinon.stub(this.player, 'stop');
            this.player.clear();
            expect(stopStub.calledOnce).to.eql(true);
            stopStub.restore();
        });

        it('resets loaded `._data` to empty array []', function () {
            this.player.load(this.TEST_ITEMS_DATA);
            this.player.clear();
            expect(this.player._data).to.eql([]);
        });

    });

});

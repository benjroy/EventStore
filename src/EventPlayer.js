'use strict';

var _ = require('lodash');
var util = require('util');
var events = require('events');

var EventPlayer = function (data, maxDelay) {
    _.bindAll(this,
        '_playItem'
    );

    if (_.isNumber(maxDelay)) {
        this.setMaxDelay(maxDelay);
    }

    if (_.isObject(data)) {
        this.load(data);
    }
};

util.inherits(EventPlayer, events.EventEmitter);

// Instance Properties

_.extend(EventPlayer.prototype, {

    _data: null,

    _playing: false,

    _maxDelay: -1, // -1 === always use item delay

    _nextItemTimeout: null,

    setMaxDelay: function (maxDelay) {
        if (_.isNumber(maxDelay) === false) {
            throw new TypeError('maxDelay must be a number');
        }
        this._maxDelay = maxDelay;
    },

    load: function (itemsData) {
        if (_.isNumber(this._playing) === true) {
            throw new Error('EventPlayer.load: cannot load data while playing back events');
        }
        if (_.isArray(itemsData) === false) {
            throw new TypeError('EventPlayer.load requires Array of itemsData');
        }
        this._data = itemsData;
    },

    clear: function () {
        this.stop();
        this._data = [];
    },

    start: function () {
        if (_.isNull(this._data) === true) {
            throw new TypeError('EventPlayer.start: no data to playback.  Did you call `.load`?');
        }
        if (this._playing !== false) {
            return;
        }
        this._setPlaying();
        this._next();
    },

    stop: function () {
        clearTimeout(this._nextItemTimeout);
        this._nextItemTimeout = null;
        this._unsetPlaying();
    },

    _next: function () {
        if (this._data.length === 0) {
            this.emit('complete');
            this._unsetPlaying();
            return;
        }

        var self = this;
        var nextItem = this._data[0];

        // time not properly specified?  emit error
        if (_.isUndefined(nextItem.t) === true) {
            this._emitError(this._data.shift());
            return this._next();
        }

        var itemTime = this._data[0].t;
        // proper time for event delay recorded with item
        var delay = Math.max(itemTime - (_.now() - this._playing), 0);        
        
        if (this._maxDelay > -1) {
            delay = Math.min(delay, this._maxDelay);
        }

        this._nextItemTimeout = setTimeout(function () {
            self._playItem();
            self._next();
        }, delay);
    },

    _playItem: function () {
        var item = this._data.shift();

        if (_.isUndefined(item.n) === true) {
            this._emitError(item);
        } else {
            this._emitEvent(item);
        }
    },

    _emitEvent: function (item) {
        this.emit('event', item);
        this.emit(item.n, item.d);
    },

    _emitError: function (item) {
        this.emit('error', item);
    },

    _setPlaying: function () {
        this._playing = _.now();
    },

    _unsetPlaying: function () {
        this._playing = false;
    }
});

module.exports = EventPlayer;

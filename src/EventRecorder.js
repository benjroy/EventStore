'use strict';

var _ = require('lodash');
var q = require('q');
var CONSTANTS = require('./constants');

var EventRecorder = function (id, storage) {
    _.bindAll(this,
        '_processToSchema',
        '_setStore'
    );

    if (_.isString(id) === false) {
        throw new TypeError('id <string> required');
    }
    this.id = id;
    // storage is any storage module compatible
    // with localforage promise-style api
    if (_.isObject(storage) === false) {
        throw new TypeError('storage <object> with localforage-compatible API required');
    }
    this._storage = storage;
    this.startTime = _.now();
    this._store = null; // populated in fetch

    this._readyDefer = q.defer();

    var self = this;

    // load stored data into memory
    this.fetch()
        .then(function (data) {
            self._readyDefer.resolve(data);
        })
        .done();
};


// Class properties

_.extend(EventRecorder, {
    // schema for recorder data
    _SCHEMA: {
        startTime: 0,
        items: []
    }
});


// Instance properties

_.extend(EventRecorder.prototype, {

    destroy: function () {
        var self = this;
        return q(this._storage.removeItem(this._key()))
            .then(function () {
                self._store = null;
                self._storage = null;
                self.id = null;
            });
    },

    clear: function () {
        var cleanData = this._processToSchema({
            startTime: _.now()
        });

        return q(this._storage.setItem(this._key(), cleanData))
            .then(this._setStore);
    },

    fetch: function () {
        return q(this._storage.getItem(this._key()))
            .then(this._processToSchema)
            .then(this._setStore);
    },

    ready: function () {
        return this._readyDefer.promise;
    },

    push: function (eventName, eventData) {
        if (_.isString(eventName) === false) {
            throw new TypeError('EventRecorder.push: eventName <string> required');
        }
        var self = this;

        return this.ready()
            .then(function () {
                var item = self._processItem(eventName, eventData);
                self._store.items.push(item);
                return self._save();
            });
    },

    // save is throttled, but still returns a promise
    _SAVE_THROTTLE_TIME: 200,
    _deferSave: null, // holds a q.defer()
    _save: function () {
        if (this._deferSave === null) {
            var _deferSave = this._deferSave = q.defer();

            var self = this;

            setTimeout(function () {
                q(self._storage.setItem(self._key(), self._store))
                    .then(function () {
                        self._deferSave = null;
                        _deferSave.resolve.apply(_deferSave, arguments);
                    })
                    .done();
            }, this._SAVE_THROTTLE_TIME);
        }
        return this._deferSave.promise;
    },

    _processItem: function (eventName, eventData) {
        return {
            n: eventName,
            d: eventData,
            t: _.now() - this.startTime
        };
    },

    // ensures that data stored in this instance
    // follows class _SCHEMA
    _processToSchema: function (data) {
        // use _store as schema if data does not exist
        if (_.isObject(data) !== true) {
            data = _.clone(EventRecorder._SCHEMA);
        }
        // ensure stored data has a startTime
        // and instance `startTime` matches
        if (_.isNumber(data.startTime) === true && data.startTime > 0) {
            this.startTime = data.startTime;
        } else {
            data.startTime = this.startTime;
        }
        // ensure stored data has `items` matching schema
        if (_.isArray(data.items) === false) {
            data.items = [];
        }
        return data;
    },

    _setStore: function (data) {
        // store data on instance
        this._store = data;
        return this._store;
    },

    _key: function () {
        return CONSTANTS.STORAGE_PREFIX + '-' + this.id;
    }

});

module.exports = EventRecorder;

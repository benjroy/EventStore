'use strict';

var localforage = require('localforage');

localforage.config({
    driver: localforage.LOCALSTORAGE,
    name: 'justStorage',
    storeName: 'pageStorage',
    description: 'page-local storage for EventStore.'
});

module.exports = localforage;

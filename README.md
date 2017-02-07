Record and playback a series of events in the browser.  Useful for dynamic visualizations.

```
var EventStore = require('EventStore');
var EventRecorder = EventStore.EventRecorder;  // records events
var EventPlayer = EventStore.EventPlayer; // replays recorded event data

var storage = require('localforage');  // any storage with localforage-compatible API

// create a recorder with an id and give it a place to store data
var eventRecorder = new EventRecorder('some-event-recorder-name', storage);

// listen for different events from a source and save them with the recorder
[ 'dht:request', 'dht:nodes', 'dht:peers' ].forEach(function (eventName) {
    torrentClient.on(eventName, function (payload) {
      eventRecorder.push(eventName, payload);
    });
});


var eventPlayer = new EventPlayer();

// load up stored events and replay them!
eventRecorder.ready()
  .then(function (previouslyRecordedData) {
    eventPlayer.load(previouslyRecordedData);
    eventPlayer.start();
    // event player will begin emitting events in time with the previously recorded session
  })
  .done();

```

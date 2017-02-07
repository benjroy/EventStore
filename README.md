Record and playback a series of events in the browser.  Useful for dynamic visualizations.

```
var EventStore = require('EventStore');
var EventRecorder = EventStore.EventRecorder;
var EventPlayer = EventStore.EventPlayer;

var eventRecorder = new EventRecorder('some-event-recorder-name', globalStorage)

_.each([ 'dht:request', 'dht:nodes', 'dht:peers' ], function (eventName) {
    torrentClient.on(eventName, function (payload) {
      eventRecorder.push(eventName, payload);
    });
});


var eventPlayer = new EventPlayer();
eventRecorder.ready()
  .then(function (previouslyRecordedData) {
    eventPlayer.load(previouslyRecordedData);
    eventPlayer.start();
    // event player will begin emitting events in the time with the previously recorded session
  })
  .done();

```

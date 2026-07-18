// Bridge demo companion: receives the fetched fact from the config page
// and sends it to the watch via AppMessage.

const ConfigPageUrl = 'https://caco3.github.io/bridge-demo/config/index.html';

Pebble.addEventListener('ready', function() {
  console.log('Bridge demo ready');
});

Pebble.addEventListener('showConfiguration', function() {
  Pebble.openURL(ConfigPageUrl);
});

Pebble.addEventListener('webviewclosed', function(e) {
  if (!e.response) return;
  try {
    const config = JSON.parse(decodeURIComponent(e.response));
    if (config.fact) {
      Pebble.sendAppMessage({ fact: config.fact });
    } else if (config.error) {
      Pebble.sendAppMessage({ error: config.error });
    }
  } catch (err) {
    Pebble.sendAppMessage({ error: 'Bad config' });
  }
});

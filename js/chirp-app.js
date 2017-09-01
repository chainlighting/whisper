var ALPHABET = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890~`!@#%&*()_-+={}[]:;\"\'|\\<>,.?/';
var freqCodec = {
  freqMin: 1000,
  freqMax: 3000,
  frameStartFreq: 3100,
  frameEndFreq: 3120,
  frameDataSeqFreqs: [3200,3220,3240,3260,3280,3300,3320,3340],
  encodeDuration: 0.2
};

// Create an ultranet server.
var ChirpListener = new ChirpListener({
  alphabet: ALPHABET,
  debug: true,
  freqMin: freqCodec.freqMin,
  freqMax: freqCodec.freqMax,
  timeout: 300,
  charDuration: freqCodec.encodeDuration});

// Create an ultranet socket.
var ChirpComposer = new ChirpComposer({
  alphabet: ALPHABET,
  freqMin: freqCodec.freqMin,
  freqMax: freqCodec.freqMax,
  charDuration: freqCodec.encodeDuration});


var msgWindow = document.querySelector('#msg-window');
var wrap = document.querySelector('#msg-window-wrap');
var formInput = document.querySelector('#formInput');
var inputText = document.querySelector('#inputMsgText');
var waveStart = document.querySelector('#enableWaveTracking');
var sendMsgBtn = document.querySelector('[send-text-button]');

function init() {
  ChirpListener.start();
  ChirpListener.on('message', onIncomingChat);
  formInput.addEventListener('submit', onSubmitForm);
  sendMsgBtn.addEventListener('click', onSubmitForm, false);
  waveStart.addEventListener('click',onWaveStart,false);
}

function onWaveStart(e) {
  ChirpListener.setDebug(waveStart.checked);
}

function onSubmitForm(e) {
  // Get contents of input element.
  var message = inputText.value;
  // Send via oscillator.
  ChirpComposer.send(message);
  // Clear the input element.
  inputText.value = '';
  // Don't actually submit the form.
  e.preventDefault();
}

function onIncomingChat(message) {
  console.log('chat inbound.');
  msgWindow.innerHTML +='<code>' + time() + ': ' + message + '<br/></code>';
  // Scroll msgWindow to the bottom.
  msgWindow.scrollTop = msgWindow.scrollHeight;
}

function time() {
  var now = new Date();
  var hours = now.getHours();
  hours = (hours > 9 ? hours: ' ' + hours);
  var mins = now.getMinutes();
  mins = (mins > 9 ? mins : '0' + mins);
  var secs = now.getSeconds();
  secs = (secs > 9 ? secs : '0' + secs);
  return '[' + hours + ':' + mins + ':' + secs + ']';
}

window.addEventListener('load', init);

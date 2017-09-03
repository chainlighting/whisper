var ALPHABET = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890~`!@#%&*()_-+={}[]:;\"\'|\\<>,.?/';
var freqCodec = {
  freqMin: 1500,
  freqMax: 4500,
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


var msgWnd = document.querySelector('#msg-window');
var wrap = document.querySelector('#msg-window-wrap');
var formInput = document.querySelector('#formInput');
var inputText = document.querySelector('#inputMsgText');
var waveStart = document.querySelector('#enableWaveTracking');
var waveCanvasWnd = document.querySelector('#wave-canvas-window');
var sendMsgBtn = document.querySelector('[send-text-button]');
var codeRainWnd = document.querySelector('#code-rain-window');

function init() {
  ChirpListener.start();
  ChirpListener.on('message', onIncomingChat);
  ChirpListener.on('validSample',onIncomingSample);
  formInput.addEventListener('submit', onSubmitForm);
  sendMsgBtn.addEventListener('click', onSubmitForm, false);
  waveStart.addEventListener('click',onWaveStart,false);

  $("#ctrl-valid-sample-db").slider({
    orientation: "horizontal",
    range: "min",
    max: 100,
    min: -100,
    value: -65,
    slide: onCtrlValidSampleDb,
    change: onCtrlValidSampleDb
  });
}

function onCtrlValidSampleDb(e,ui) {
  a = document.querySelector("#ctrl-valid-sample-db-label");
  a.innerHTML = "TH: " + ui.value;
  ChirpListener.setSampleThreshold(ui.value);
}

function onWaveStart(e) {
  ChirpListener.setDebug(waveStart.checked);
  if(!waveStart.checked) {
    waveCanvasWnd.style.display = "none";
    codeRainWnd.innerHTML = "";
  } else {
    waveCanvasWnd.style.display = "";
  }
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
  msgWnd.innerHTML +='<code>' + time() + ': ' + message + '<br/></code>';
  // Scroll msgWnd to the bottom.
  msgWnd.scrollTop = msgWnd.scrollHeight;
}

function onIncomingSample(message) {
  if(!waveStart.checked) {
  } else {
    codeRainWnd.innerHTML +='<code>' + message + '<br/></code>';
    // Scroll msgWnd to the bottom.
    codeRainWnd.scrollTop = codeRainWnd.scrollHeight;
  }
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

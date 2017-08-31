/*
var ChirpComposer = require('../lib/sonic-socket.js');
var ChirpListener = require('../lib/sonic-server.js');
var SonicCoder = require('../lib/sonic-coder.js');
*/
var ALPHABET = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890~`!@#%&*()_-+={}[]:;\"\'|\\<>,.?/';
// Create an ultranet server.
var ChirpListener = new ChirpListener({alphabet: ALPHABET, debug: true,freqMin:500,freqMax:3300,timeout:300,charDuration:0.2});
//var ChirpListener = new ChirpListener({alphabet: ALPHABET, debug: true});
// Create an ultranet socket.
var ChirpComposer = new ChirpComposer({alphabet: ALPHABET,freqMin:500,freqMax:3300,charDuration:0.2});
//var ChirpComposer = new ChirpComposer({alphabet: ALPHABET});


var msgWindow = document.querySelector('#msg-window');
var wrap = document.querySelector('#msg-window-wrap');
var form = document.querySelector('form');
var input = document.querySelector('input');
var sendBtn = document.querySelector('[send-text-button]');

function init() {
  ChirpListener.start();
  ChirpListener.on('message', onIncomingChat);
  form.addEventListener('submit', onSubmitForm);
  sendBtn.addEventListener('click', onSubmitForm, false);
}

function onSubmitForm(e) {
  // Get contents of input element.
  var message = input.value;
  // Send via oscillator.
  ChirpComposer.send(message);
  // Clear the input element.
  input.value = '';
  // Don't actually submit the form.
  e.preventDefault();
}

function onIncomingChat(message) {
  console.log('chat inbound.');
  msgWindow.innerHTML += time() + ': ' + message + '<br/>';
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

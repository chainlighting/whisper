var ChirpComposer = (function() {

var audioContext = new window.AudioContext || new webkitAudioContext();

/**
 * Encodes text as audio streams.
 *
 * 1. Receives a string of text.
 * 2. Creates an oscillator.
 * 3. Converts characters into frequencies.
 * 4. Transmits frequencies, waiting in between appropriately.
 */
function ChirpComposer(params) {
  params = params || {};
  this.coder = params.coder || new ChirpCoder();
  this.charDuration = params.charDuration || 0.2;
  this.coder = params.coder || new ChirpCoder(params);
  this.rampDuration = params.rampDuration || 0.001;
}


ChirpComposer.prototype.send = function(input, opt_callback) {
  // Surround the word with start and end characters.
  input = this.coder.startChar + input + this.coder.endChar;
  // Use WAAPI to schedule the frequencies.
  for (var i = 0; i < input.length; i++) {
    var char = input[i];
    var freq = this.coder.charToFreq(char);
    var time = audioContext.currentTime + this.charDuration * i;
    //this.scheduleToneAt(freq, time, this.charDuration);
    this.scheduleMultiTonesAt([freq],time,this.charDuration);
  }

  // If specified, callback after roughly the amount of time it would have
  // taken to transmit the token.
  if (opt_callback) {
    var totalTime = this.charDuration * input.length;
    setTimeout(opt_callback, totalTime * 1000);
  }
};

ChirpComposer.prototype.scheduleToneAt = function(freq, startTime, duration) {
  var gainNode = audioContext.createGain();
  // Gain => Merger
  gainNode.gain.value = 0;

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(1, startTime + this.rampDuration);
  gainNode.gain.setValueAtTime(1, startTime + duration - this.rampDuration);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  gainNode.connect(audioContext.destination);

  var osc = audioContext.createOscillator();
  osc.frequency.value = freq;
  osc.connect(gainNode);

  osc.start(startTime);
};

ChirpComposer.prototype.scheduleMultiTonesAt = function(freqs, startTime, duration) {
  var i = 0;
  var oscs = [];

  for(i = 0; i < freqs.length; i++) {
    var gainNode = audioContext.createGain();
    // Gain => Merger
    gainNode.gain.value = 0;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(3, startTime + this.rampDuration);
    gainNode.gain.setValueAtTime(3, startTime + duration - this.rampDuration);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    gainNode.connect(audioContext.destination);

    var osc = audioContext.createOscillator();
    osc.frequency.value = freqs[i];
    osc.connect(gainNode);

    oscs.push(osc);
  }  

  for(i = 0; i < oscs.length; i++) {
    oscs[i].start(startTime);
  }
};

  return ChirpComposer;
})();

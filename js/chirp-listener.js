var ChirpListener = (function() {

var audioContext = new window.AudioContext || new webkitAudioContext();
/**
 * Extracts meaning from audio streams.
 *
 * (assumes audioContext is an AudioContext global variable.)
 *
 * 1. Listen to the microphone.
 * 2. Do an FFT on the input.
 * 3. Extract frequency peaks in the ultrasonic range.
 * 4. Keep track of frequency peak history in a ring buffer.
 * 5. Call back when a peak comes up often enough.
 */
function ChirpListener(params) {
  params = params || {};
  this.peakThreshold = params.peakThreshold || -65;
  this.minRunLength = params.minRunLength || 2;
  this.coder = params.coder || new ChirpCoder(params);
  // How long (in ms) to wait for the next character.
  this.timeout = params.timeout || 300;
  this.debug = !!params.debug;

  this.peakHistory = new RingBuffer(16);
  this.peakTimes = new RingBuffer(16);

  this.callbacks = {};

  this.buffer = '';
  this.state = State.IDLE;
  this.isRunning = false;
  this.iteration = 0;
}

var State = {
  IDLE: 1,
  RECV: 2
};

/**
 * Start processing the audio stream.
 */
ChirpListener.prototype.start = function() {
  // Start listening for microphone. Continue init in onStream.
  var constraints = {
    audio: { optional: [{ echoCancellation: false }] }
  };
  navigator.webkitGetUserMedia(constraints,
      this.onStream_.bind(this), this.onStreamError_.bind(this));
};

/**
 * Stop processing the audio stream.
 */
ChirpListener.prototype.stop = function() {
  this.isRunning = false;
  this.track.stop();
};

ChirpListener.prototype.on = function(event, callback) {
  if (event == 'message') {
    this.callbacks.message = callback;
  }
  if (event == 'character') {
    this.callbacks.character = callback;
  }
  if (event == 'validSample') {
    this.callbacks.validSample = callback;
  }
};

ChirpListener.prototype.setDebug = function(value) {
  this.debug = value;
  // just stop redraw the canvas,it make a snapshot
};

ChirpListener.prototype.fire_ = function(callback, arg) {
  if (typeof(callback) === 'function') {
    callback(arg);
  }
};

ChirpListener.prototype.onStream_ = function(stream) {
  // Store MediaStreamTrack for stopping later. MediaStream.stop() is deprecated
  // See https://developers.google.com/web/updates/2015/07/mediastream-deprecations?hl=en
  this.track = stream.getTracks()[0];

  // Setup audio graph.
  var input = audioContext.createMediaStreamSource(stream);
  var analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;//default is 2048
  analyser.smoothingTimeConstant = 0.8;//default is 0.8
  analyser.minDecibels = -100;//default is -100
  analyser.maxDecibels = -30;//default is -30
  input.connect(analyser);
  // Create the frequency array.
  this.freqs = new Float32Array(analyser.frequencyBinCount);
  this.auxFreqs = new Uint8Array(analyser.frequencyBinCount);
  // Save the analyser for later.
  this.analyser = analyser;
  this.isRunning = true;
  // Save freqence probe edge
  this.freqMinIndex = this.freqToIndex(this.coder.freqMin);
  this.freqMaxIndex = this.freqToIndex(this.coder.freqMax);
  // Do an FFT and check for inaudible peaks.
  this.raf_(this.loop.bind(this));
};

ChirpListener.prototype.onStreamError_ = function(e) {
  console.error('Audio input error:', e);
};

ChirpListener.prototype.setSampleThreshold = function(v) {
  this.peakThreshold = v;
}
/**
 * Given an FFT frequency analysis, return the peak frequency in a frequency
 * range.
 */
ChirpListener.prototype.getPeakFrequency = function() {
  // Find where to start.
  // var start = this.freqToIndex(this.coder.freqMin);
  // TODO: use first derivative to find the peaks, and then find the largest peak.
  // Just do a max over the set.
  var max = -Infinity;
  var index = -1;
  for (var i = this.freqMinIndex; i < this.freqMaxIndex; i++) {
    if (this.freqs[i] > max) {
      max = this.freqs[i];
      index = i;
    }
  }
  // Only care about sufficiently tall peaks.
  if (max > this.peakThreshold) {
    return this.indexToFreq(index);
  }
  return null;
};

ChirpListener.prototype.loop = function() {
  this.analyser.getFloatFrequencyData(this.freqs);
  this.analyser.getByteTimeDomainData(this.auxFreqs);
  // Sanity check the peaks every 5 seconds.
  if ((this.iteration + 1) % (60 * 5) == 0) {
    this.restartServerIfSanityCheckFails();
  }
  // Calculate peaks, and add them to history.
  var freq = this.getPeakFrequency();
  if (freq) {
    var char = this.coder.freqToChar(freq);
    // DEBUG ONLY: Output the transcribed char.
    if (this.debug) {
      this.fire_(this.callbacks.validSample,char + '(' + Math.round(freq) + ')');
    }
    this.peakHistory.add(char);
    this.peakTimes.add(new Date());
  } else {
    // If no character was detected, see if we've timed out.
    var lastPeakTime = this.peakTimes.last();
    if (lastPeakTime && new Date() - lastPeakTime > this.timeout) {
      // Last detection was over 300ms ago.
      this.state = State.IDLE;
      if (this.debug) {
        this.fire_(this.callbacks.validSample,'Token: ' + this.buffer +' timed out')
      }
      this.peakTimes.clear();
    }
  }
  // Analyse the peak history.
  this.analysePeaks();
  // DEBUG ONLY: Draw the frequency response graph.
  if (this.debug) {
    this.showWaveFreqs();
  }
  if (this.isRunning) {
    this.raf_(this.loop.bind(this));
  }
  this.iteration += 1;
};

ChirpListener.prototype.indexToFreq = function(index) {
  var nyquist = audioContext.sampleRate/2;
  return nyquist/this.freqs.length * index;
};

ChirpListener.prototype.freqToIndex = function(frequency) {
  var nyquist = audioContext.sampleRate/2;
  return Math.round(frequency/nyquist * this.freqs.length);
};

/**
 * Analyses the peak history to find true peaks (repeated over several frames).
 */
ChirpListener.prototype.analysePeaks = function() {
  // Look for runs of repeated characters.
  var char = this.getLastRun();
  if (!char) {
    return;
  }
  if (this.state == State.IDLE) {
    // If idle, look for start character to go into recv mode.
    if (char == this.coder.startChar) {
      this.buffer = '';
      this.state = State.RECV;
    }
  } else if (this.state == State.RECV) {
    // If receiving, look for character changes.
    if (char != this.lastChar &&
        char != this.coder.startChar && char != this.coder.endChar) {
      this.buffer += char;
      this.lastChar = char;
      this.fire_(this.callbacks.character, char);
    }
    // Also look for the end character to go into idle mode.
    if (char == this.coder.endChar) {
      this.state = State.IDLE;
      this.fire_(this.callbacks.message, this.buffer);
      this.buffer = '';
    }
  }
};

ChirpListener.prototype.getLastRun = function() {
  var lastChar = this.peakHistory.last();
  var runLength = 0;
  // Look at the peakHistory array for patterns like ajdlfhlkjxxxxxx$.
  for (var i = this.peakHistory.length() - 2; i >= 0; i--) {
    var char = this.peakHistory.get(i);
    if (char == lastChar) {
      runLength += 1;
    } else {
      break;
    }
  }
  if (runLength > this.minRunLength) {
    // Remove it from the buffer.
    this.peakHistory.remove(i + 1, runLength + 1);
    return lastChar;
  }
  return null;
};

/**
 * Show Wave and Freqences
 */
ChirpListener.prototype.showWaveFreqs = function() {
  var canvas = document.querySelector('#audio-wave-canvas');
  var i = 0;
  var x_offset = 0;
  var y_offset = 0;
  var sliceWidth = 0;
  var value = 0;
  var freqSegStep = 1;
  
  if (!canvas) {
    return;
  }

  // resize canvas width/heigth
  canvas.width = $("#audio-wave-canvas").width();
  canvas.height = $("#audio-wave-canvas").height();

  drawContext = canvas.getContext('2d');
  drawContext.fillStyle = 'rgb(102, 84, 139)';
  drawContext.fillRect(0, 0, canvas.width, canvas.height);
  
  // Plot the frequency data.
  drawContext.fillStyle = 'rgb(231,255,214)';
  sliceWidth = canvas.width/this.freqs.length;
  freqSegStep = Math.round(Math.max(1,1/(sliceWidth)));
  for (i = 0; i < this.freqs.length; i=i+freqSegStep) {
    // Transform this value (in db?) into something that can be plotted.
    // 0.5 canvas area to draw freqences [canvas.height - ((value + 150)/150)*canvas.height*0.5]
    y_offset = (0.5 - this.freqs[i]/300)*canvas.height;        
    drawContext.fillRect(i * sliceWidth, y_offset, 1, 1);
  }

  // Plot Threshold line
  drawContext.strokeStyle = 'rgb(231,255,214)';
  drawContext.beginPath();
  y_offset = (0.5 - this.peakThreshold/300)*canvas.height;
  drawContext.moveTo(0,y_offset);
  x_offset = canvas.width - 1;
  drawContext.lineTo(x_offset,y_offset);
  drawContext.stroke();

  // Plot wave
  drawContext.strokeStyle = 'rgb(131, 255, 148)';
  drawContext.beginPath();

  sliceWidth = canvas.width/this.auxFreqs.length;
  freqSegStep = Math.round(Math.max(1,1/(sliceWidth)));
  x_offset = 0;
  for (i = 0; i < this.auxFreqs.length; i++) {
    value = this.auxFreqs[i] / 128.0;
    // 0.5 canvas area to draw wave
    y_offset = 0.5*canvas.height*(1-value/2)

    if (i === 0) {
      drawContext.moveTo(x_offset, y_offset);
    } else {
      drawContext.lineTo(x_offset, y_offset);
    }

    x_offset += sliceWidth;
  }

  drawContext.stroke();
};

/**
 * A request animation frame shortcut. This one is intended to work even in
 * background pages of an extension.
 */
ChirpListener.prototype.raf_ = function(callback) {
  var isCrx = !!(window.chrome && chrome.extension);
  if (isCrx) {
    setTimeout(callback, 1000/60);
  } else {
    requestAnimationFrame(callback);
    //setTimeout(callback, 1000/100);
  }
};

ChirpListener.prototype.restartServerIfSanityCheckFails = function() {
  // Strange state 1: peaks gradually get quieter and quieter until they
  // stabilize around -800.
  if (this.freqs[0] < -300) {
    console.error('freqs[0] < -300. Restarting.');
    this.restart();
    return;
  }
  // Strange state 2: all of the peaks are -100. Check just the first few.
  var isValid = true;
  for (var i = 0; i < 10; i++) {
    if (this.freqs[i] == -100) {
      isValid = false;
    }
  }
  if (!isValid) {
    console.error('freqs[0:10] == -100. Restarting.');
    this.restart();
  }
}

ChirpListener.prototype.restart = function() {
  window.location.reload();
};

  return ChirpListener;

})();

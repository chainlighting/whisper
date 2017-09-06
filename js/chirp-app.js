var ALPHABET = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890~`!@#%&*()_-+={}[]:;\"\'|\\<>,.?/';

var freqCodec = {
  freqListener: null,
  freqComposer: null,
  freqMin: 1500,
  freqMax: 4500,
  frameStartFreq: 3100,
  frameEndFreq: 3120,
  frameDataSeqFreqs: [3200,3220,3240,3260,3280,3300,3320,3340],
  encodeDuration: 0.2,
  sampleDbThd: -65,
  sampleDbMin: -100,
  sampleDbMax: 100
};

function init() {
  // Create an ultranet server.
  freqCodec.freqListener = new ChirpListener({
    alphabet: ALPHABET,
    debug: true,
    freqMin: freqCodec.freqMin,
    freqMax: freqCodec.freqMax,
    timeout: 300,
    charDuration: freqCodec.encodeDuration});

  // Create an ultranet socket.
  freqCodec.freqComposer = new ChirpComposer({
    alphabet: ALPHABET,
    freqMin: freqCodec.freqMin,
    freqMax: freqCodec.freqMax,
    peakThreshold: freqCodec.sampleDbThd,
    charDuration: freqCodec.encodeDuration});

  freqCodec.freqListener.start();
  freqCodec.freqListener.on('message', function(msg) {
    $("#msg-window")[0].innerHTML +='<code>' + time() + ': ' + msg + '<br/></code>';
    // Scroll msgWnd to the bottom.
    $("#msg-window")[0].scrollTop = $("#msg-window")[0].scrollHeight;
  });
  
  freqCodec.freqListener.on('validSample',function(msg) {
    if(!$("#enable-wave-tracking")[0].checked) {
    } else {
      $("#code-rain-window")[0].innerHTML +='<code>' + msg + '<br/></code>';
      // Scroll msgWnd to the bottom.
      $("#code-rain-window")[0].scrollTop = $("#code-rain-window")[0].scrollHeight;
    }
  });
  
  $("#input-form").on('submit',onSubmitForm);
  $("#send-text-button").on('click', onSubmitForm);


  $("#enable-wave-tracking").on('click',function(e) {
    var tracking = $("#enable-wave-tracking")[0].checked;
    
    freqCodec.freqListener.setDebug(tracking);
    if(!tracking) {
      $("#wave-canvas-window")[0].style.display = "none";
      $("#code-rain-window")[0].innerHTML = "";
    } else {
      $("#wave-canvas-window")[0].style.display = "";
    }
  });

  $("#ctrl-setting-sample-db-val").bootstrapSlider({
    orientation: 'horizontal',
    range: false,
    tooltip: 'show',
    max: freqCodec.sampleDbMax,
    min: freqCodec.sampleDbMin,
    value: freqCodec.sampleDbThd,
    step: 1,
    handle: 'round'
  })
  .on('change',function(e) {
    $("#ctrl-setting-sample-db-label")[0].value = e.value.newValue;
    freqCodec.freqListener.setSampleThreshold(e.value.newValue);
  });

  $("#ctrl-setting-sample-freqs-val").bootstrapSlider({
    orientation: 'horizontal',
    range: true,
    tooltip: 'show',
    max: 20000,
    min: 20,
    value: [freqCodec.freqMin,freqCodec.freqMax],
    step: 1,
    handle: 'round'
  })
  .on('change',function(e) {
    $("#ctrl-setting-sample-freqs-label")[0].value = e.value.newValue[0] + ":" + e.value.newValue[1];
    freqCodec.freqMin = e.value.newValue[0];
    freqCodec.freqMax = e.value.newValue[1];
    //this should restart chirp-composer/chirp-listener
  })
  .on('slideStop',function(e) {
    freqCodec.freqMin = e.value[0];
    freqCodec.freqMax = e.value[1];

    freqCodec.freqListener.setSampleRange([freqCodec.freqMin,freqCodec.freqMax]);
    freqCodec.freqComposer.setSampleRange([freqCodec.freqMin,freqCodec.freqMax]);
  });

  $("#ctrl-setting-sample-db-label").on('input',function(e) {
    var v = _.parseInt(e.currentTarget.value);
    if(_.isNaN(v)) {
      return;
    }
    var slider = $("#ctrl-setting-sample-db-val").bootstrapSlider();
    slider.bootstrapSlider('setValue',v);
    freqCodec.freqListener.setSampleThreshold(v);
  })
}

function onSubmitForm(e) {
  // Get contents of input element.
  var message = $("#text-msg-input")[0].value;
  // Send via oscillator.
  freqCodec.freqComposer.send(message);
  // Clear the input element.
  $("#text-msg-input")[0].value = '';
  // Don't actually submit the form.
  e.preventDefault();
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

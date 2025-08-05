/**
 * Capture mic input in 250ms slices and send to main for STT.
 */
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = event => {
    if (event.data.size > 0) {
      event.data.arrayBuffer().then(buffer => {
        window.ipcRenderer.send('audio-chunk', new Uint8Array(buffer));
      });
    }
  };
  recorder.start(250);
}

// Build UI
document.body.innerHTML = '<button id="start-btn">Start Talking</button>';
document
  .getElementById('start-btn')
  .addEventListener('click', startRecording);

// test-speech.js
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

async function test() {
  const [result] = await client.recognize({
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US'
    },
    audio: {
      content: '' // empty for now
    }
  });
  console.log(result);
}

test().catch(console.error);

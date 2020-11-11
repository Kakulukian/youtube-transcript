const YoutubeTranscript = require('../dist/youtube-transcript.common').default;
YoutubeTranscript.fetchTranscript(process.argv[2])
  .then(console.log)
  .catch(console.error);

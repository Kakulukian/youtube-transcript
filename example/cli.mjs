import { YoutubeTranscript } from 'youtube-transcript';

(async () => {
    console.log(await YoutubeTranscript.fetchTranscript(process.argv[2]));
})();
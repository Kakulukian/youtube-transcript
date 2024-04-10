# youtube-transcript

[![npm version](https://badge.fury.io/js/youtube-transcript.svg)](https://badge.fury.io/js/youtube-transcript)

I wanted to extract a transcript from a youtube video but there was only a python script so I created this to do it in node.
This package use unofficial YTB API so it can be broken over the time if no update appears.

Supports these Youtube URLs:

* `https://www.youtube.com/watch?v={ID}`
* `https://www.youtube.com/embed/{ID}`
* `https://www.youtube.com/e/{ID}`
* `https://youtu.be/{ID}`

## Dependencies 

Requires [`node-html-parser`](https://www.npmjs.com/package/node-html-parser) to parse transcription endpoint XML (does not respond with JSON). 

## Installation

```bash
$ npm i youtube-transcript node-html-parser
```

or

```bash
$ yarn add youtube-transcript node-html-parser
```

## Usage

```js
import { fetchTranscript } from 'youtube-transcript';

fetchTranscript('videoId or URL').then(console.log);
```

### Methods

- fetchTranscript(videoId: string [,options: TranscriptConfig]): Promise<TranscriptResponse[]>;

## License

**[MIT](LICENSE)** Licensed

# youtube-transcript

[![npm version](https://badge.fury.io/js/youtube-transcript.svg)](https://badge.fury.io/js/youtube-transcript)

I wanted to extract a transcript from a youtube video but there was only a python script so I created this to do it in node.
This package use unofficial YTB API so it can be broken over the time if no update appears.

## Installation

```bash
$ npm i youtube-transcript
```

or

```bash
$ yarn add youtube-transcript
```

## Usage

### Default Usage:

```js
import { YoutubeTranscript } from 'youtube-transcript';

YoutubeTranscript.fetchTranscript('videoId or URL').then(console.log);
```

### Specify a language:

```js
import { YoutubeTranscript } from 'youtube-transcript';

YoutubeTranscript.fetchTranscript('videoId or URL', { lang: 'fr' }).then(
  console.log
);
```

### Provide a proxy*:

```js
import { YoutubeTranscript } from 'youtube-transcript';

YoutubeTranscript.fetchTranscript('videoId or URL', {
  proxy: 'http://localhost:8080',
}).then(console.log);
```

\* The proxy option uses Axios [Request Config](https://axios-http.com/docs/req_config) to set the proxy and supports http, https in the following format:
`protocol://username:password@host:port`

### Methods

- fetchTranscript(videoId: string [,options: TranscriptConfig]): Promise<TranscriptResponse[]>;

## License

**[MIT](LICENSE)** Licensed

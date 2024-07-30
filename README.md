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

```js
import { YoutubeTranscript } from 'youtube-transcript';
YoutubeTranscript.fetchTranscript('videoId or URL').then(console.log);
```

or override / provide your own implementation of specific methods

```js
import { YoutubeTranscript } from 'youtube-transcript';
import { request } from "obsidian";

class ObsidianYoutubeTranscript extends YoutubeTranscript {
	videoId: string;
	videoPageBody: string;
	transcriptBody: string;

	constructor(videoId: string) {
		super();
		this.videoId = YoutubeTranscript.retrieveVideoId(videoId);
	}

	public async getPageBody(): Promise<string> {
		const videoPageResponse = await request(
			`https://www.youtube.com/watch?v=${this.videoId}`
		);
		this.videoPageBody = videoPageResponse;
		return this.videoPageBody;
	}

	public async getTranscriptResponse(transcriptURL: string): Promise<string> {
		const transcriptResponse = await request(transcriptURL);
		this.transcriptBody = transcriptResponse;
		return this.transcriptBody;
	}
}

const ytt = new ObsidianYoutubeTranscript(url);
const transcriptList = await ytt.fetchTranscript();
console.debug("got transcriptList:", transcriptList);
```

### Methods

- fetchTranscript(videoId: string [,options: TranscriptConfig]): Promise<TranscriptResponse[]>;
- async getPageBody(): Promise<string>;
- splitHtml(pageBody: string): string[];
- getCaptionTracks(splittedHTML: string[]): any[];
- getTranscriptURL(captionTracks: any[]): string;
- async getTranscriptResponse(transcriptURL: string): Promise<string>;
- async parseTranscript(transcriptBody: string, captionTracks: any[] ): Promise<TranscriptResponse[]>;

## License

**[MIT](LICENSE)** Licensed

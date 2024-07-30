import { YoutubeTranscript } from '../src/index';

// set up mock functions for fetch and request
const mock_fetch_fn = jest.fn(async (url) => {
  if (url.toString().includes('watch')) {
    const pageBody = await require('fs').readFileSync(
      './tests/data/defaultFetchPageBody.html',
      'utf8'
    );
    return Promise.resolve(new Response(pageBody));
  } else if (url.toString().includes('api')) {
    const transcriptBody = await require('fs').readFileSync(
      './tests/data/obsidianRequestTranscriptBody.xml',
      'utf8'
    );
    return Promise.resolve(new Response(transcriptBody));
  }
});

let fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mock_fetch_fn);

const request = jest.fn().mockImplementation(async (url) => {
  if (url === 'https://www.youtube.com/watch?v=OAROO-kM8m8') {
    const pageBody = await require('fs').readFileSync(
      './tests/data/obsidianRequestPageBody.html',
      'utf8'
    );
    return Promise.resolve(new Response(pageBody));
  } else {
    const transcriptBody = await require('fs').readFileSync(
      './tests/data/obsidianRequestTranscriptBody.xml',
      'utf8'
    );
    return Promise.resolve(new Response(transcriptBody));
  }
});

// set up expected transcript output
const expectedTranscript = [
  { text: '[Music]', duration: 3.359, offset: 0, lang: 'en' },
  { text: 'away', duration: 3, offset: 0.359, lang: 'en' },
  { text: 'inside', duration: 3, offset: 5.52, lang: 'en' },
  { text: '[Music]', duration: 14.99, offset: 10.03, lang: 'en' },
  { text: 'give it to me saturated', duration: 4.42, offset: 20.6, lang: 'en' },
  { text: '[Music]', duration: 3.109, offset: 28.32, lang: 'en' },
  { text: '[Music]', duration: 5.669, offset: 37.3, lang: 'en' },
  { text: '[Music]', duration: 3.149, offset: 47.25, lang: 'en' },
  { text: 'I&amp;#39;m ready', duration: 6.769, offset: 51.62, lang: 'en' },
  {
    text: '[Music]',
    duration: 5.109,
    offset: 53.28,
    lang: 'en',
  },
];

// create overridden custom class
class ObsidianYoutubeTranscript extends YoutubeTranscript {
  public async getPageBody(): Promise<string> {
    const videoPageResponse = await request(
      `https://www.youtube.com/watch?v=${this.videoId}`
    );
    const videoPageBody = await videoPageResponse.text();
    this.videoPageBody = videoPageBody;
    return this.videoPageBody;
  }

  public async getTranscriptResponse(transcriptURL: string): Promise<string> {
    const transcriptResponse = await request(transcriptURL);
    this.transcriptBody = await transcriptResponse.text();
    return this.transcriptBody;
  }
}

describe('YoutubeTranscript', () => {
  it('should create an empty instance', () => {
    expect(new YoutubeTranscript()).toBeTruthy();
  });

  it('should create instance with video id', async () => {
    const expected = 'OAROO-kM8m8';
    const ytTranscript = new YoutubeTranscript(expected);
    expect(ytTranscript.videoId).toEqual(expected);
  });

  it('should fetch transcript from valid video - using actual fetch', async () => {
    fetchSpy.mockRestore();
    const got = await YoutubeTranscript.fetchTranscript('OAROO-kM8m8');
    expect(got).toEqual(expectedTranscript);
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mock_fetch_fn);
  });

  it('should fetch transcript from valid video - using mock fetch', async () => {
    const ytTranscript = new YoutubeTranscript('OAROO-kM8m8');
    const pageBodyResponse = await fetch(
      'https://www.youtube.com/watch?v=OAROO-kM8m8'
    );
    const pageBody = await pageBodyResponse.text();
    const splitHtml = ytTranscript.splitHtml(pageBody);
    const captionTracks = ytTranscript.getCaptionTracks(splitHtml);
    const transcriptURL = await ytTranscript.getTranscriptURL(captionTracks);
    const transcriptBodyResponse = await fetch(transcriptURL);
    const transcriptBody = await transcriptBodyResponse.text();
    const got = await ytTranscript.parseTranscript(
      transcriptBody,
      captionTracks
    );
    expect(got).toEqual(expectedTranscript);
  });
  it('should fetch transcript from valid video - using mock obsidian request', async () => {
    const ytTranscript = new YoutubeTranscript('OAROO-kM8m8');
    const pageBodyResponse = await request(
      'https://www.youtube.com/watch?v=OAROO-kM8m8'
    );
    const pageBody = await pageBodyResponse.text();
    const splitHtml = ytTranscript.splitHtml(pageBody);
    const captionTracks = ytTranscript.getCaptionTracks(splitHtml);
    const transcriptURL = await ytTranscript.getTranscriptURL(captionTracks);
    const transcriptBodyResponse = await request(transcriptURL);
    const transcriptBody = await transcriptBodyResponse.text();
    const got = await ytTranscript.parseTranscript(
      transcriptBody,
      captionTracks
    );
    expect(got).toEqual(expectedTranscript);
  });
  it('should be overridable', async () => {
    const got = await ObsidianYoutubeTranscript.fetchTranscript('OAROO-kM8m8');
    expect(got).toEqual(expectedTranscript);
  });

});

describe('YoutubeTranscript - retrieveVideoId', () => {
  it('should create an empty instance', () => {
    expect(new YoutubeTranscript()).toBeTruthy();
  });
  it('should find video id directly from id', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId('OAROO-kM8m8');
    expect(got).toBe(expected);
  });
  it('should find video id from full url', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId(
      'https://www.youtube.com/watch?v=OAROO-kM8m8'
    );
    expect(got).toBe(expected);
  });
  it('should find video id from share url', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId(
      'https://youtu.be/OAROO-kM8m8?si=Pi6TIG9M_4Eusfwl'
    );
    expect(got).toBe(expected);
  });
  it('should find video id from embed url', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId(
      'https://www.youtube.com/embed/OAROO-kM8m8?si=Pi6TIG9M_4Eusfwl'
    );
    expect(got).toBe(expected);
  });
  it('should not find video id from wrong id - short id', () => {
    expect(() => {
      YoutubeTranscript.retrieveVideoId('nZ4SAXgUrI');
    }).toThrow(
      '[YoutubeTranscript] 🚨 Impossible to retrieve Youtube video ID.'
    );
  });
  it('should not find video id from wrong full url - short id', () => {
    expect(() => {
      YoutubeTranscript.retrieveVideoId(
        'https://www.youtube.com/watch?v=nZ4SAXgUrI'
      );
    }).toThrow(
      '[YoutubeTranscript] 🚨 Impossible to retrieve Youtube video ID.'
    );
  });
  it('should not find video id from wrong share url - short id', () => {
    expect(() => {
      YoutubeTranscript.retrieveVideoId(
        'https://youtu.be/nZ4SAXgUrI?si=Pi6TIG9M_4Eusfwl'
      );
    }).toThrow(
      '[YoutubeTranscript] 🚨 Impossible to retrieve Youtube video ID.'
    );
  });
  it('should not find video id from wrong embed url - short id', () => {
    expect(() => {
      YoutubeTranscript.retrieveVideoId(
        'https://www.youtube.com/embed/nZ4SAXgUrI?si=Pi6TIG9M_4Eusfwl'
      );
    }).toThrow(
      '[YoutubeTranscript] 🚨 Impossible to retrieve Youtube video ID.'
    );
  });
  it('should not find video id from wrong id - long id', () => {
    expect(() => {
      YoutubeTranscript.retrieveVideoId('OAROO-kM8m8c');
    }).toThrow(
      '[YoutubeTranscript] 🚨 Impossible to retrieve Youtube video ID.'
    );
  });
  it('should find video id from wrong full url - long id', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId(
      'https://www.youtube.com/watch?v=OAROO-kM8m8c'
    );
    expect(got).toBe(expected);
  });
  it('should find video id from wrong share url - long id', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId(
      'https://youtu.be/OAROO-kM8m8c?si=Pi6TIG9M_4Eusfwl'
    );
    expect(got).toBe(expected);
  });
  it('should find video id from wrong embed url - long id', () => {
    const expected = 'OAROO-kM8m8';
    const got = YoutubeTranscript.retrieveVideoId(
      'https://www.youtube.com/embed/OAROO-kM8m8c?si=Pi6TIG9M_4Eusfwl'
    );
    expect(got).toBe(expected);
  });
});

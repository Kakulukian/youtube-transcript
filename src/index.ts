const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';
const RE_XML_TRANSCRIPT =
  /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

export class YoutubeTranscriptError extends Error {
  constructor(message) {
    super(`[YoutubeTranscript] 🚨 ${message}`);
  }
}

export class YoutubeTranscriptTooManyRequestError extends YoutubeTranscriptError {
  constructor() {
    super(
      'YouTube is receiving too many requests from this IP and now requires solving a captcha to continue'
    );
  }
}

export class YoutubeTranscriptVideoUnavailableError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`The video is no longer available (${videoId})`);
  }
}

export class YoutubeTranscriptDisabledError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`Transcript is disabled on this video (${videoId})`);
  }
}

export class YoutubeTranscriptNotAvailableError extends YoutubeTranscriptError {
  constructor(videoId: string) {
    super(`No transcripts are available for this video (${videoId})`);
  }
}

export class YoutubeTranscriptNotAvailableLanguageError extends YoutubeTranscriptError {
  constructor(lang: string, availableLangs: string[], videoId: string) {
    super(
      `No transcripts are available in ${lang} this video (${videoId}). Available languages: ${availableLangs.join(
        ', '
      )}`
    );
  }
}

export interface TranscriptConfig {
  lang?: string;
}
export interface TranscriptResponse {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}

/**
 * Class to retrieve transcript if exist
 */
export class YoutubeTranscript {
  videoId: string;
  config: TranscriptConfig;
  videoPageBody: string;
  splittedHTML: string[];
  captionTracks: any[];
  manoj: string;
  transcriptURL: string;
  transcriptResponse: string;
  transcriptBody: string;
  parsedTranscript: TranscriptResponse[];

  constructor(videoId?: string, config?: TranscriptConfig) {
    this.videoId = videoId ? videoId : '';
    this.config = config;
  }

  /**
   * Fetches the transcript for a YouTube video.
   *
   * @param {string} videoId - The ID of the YouTube video.
   * @param {TranscriptConfig} [config] - Optional configuration for retrieving the transcript in a specific language.
   * @return {Promise<TranscriptResponse[]>} - A promise that resolves to an array of transcript responses.
   */
  public static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig
  ): Promise<TranscriptResponse[]> {
    const identifier = this.retrieveVideoId(videoId);
    const ytt = new YoutubeTranscript(identifier, config);
    return ytt.fetchTranscript();
  }

  /**
   * Fetches the transcript for a YouTube video.
   *
   * @return {Promise<TranscriptResponse[]>} - A promise that resolves to an array of transcript responses.
   */
  public async fetchTranscript(): Promise<TranscriptResponse[]> {
    await this.getPageBody();
    this.splitHtml(this.videoPageBody);
    this.getCaptionTracks(this.splittedHTML);
    this.getTranscriptURL(this.captionTracks);
    await this.getTranscriptResponse(this.transcriptURL);
    return this.parseTranscript(this.transcriptBody, this.captionTracks);
  }

  /**
   * Retrieves the page body of a YouTube video by making a GET request to the YouTube watch page URL.
   *
   * @return {Promise<string>} A promise that resolves to the page body of the YouTube video.
   */
  public async getPageBody(): Promise<string> {
    const videoPageResponse = await fetch(
      `https://www.youtube.com/watch?v=${this.videoId}`,
      {
        headers: {
          ...(this.config?.lang && { 'Accept-Language': this.config.lang }),
          'User-Agent': USER_AGENT,
        },
      }
    );

    const videoPageBody = await videoPageResponse.text();
    this.videoPageBody = videoPageBody;
    return this.videoPageBody;
  }

  /**
   * Splits the HTML page body into two parts at the position of the first occurrence of the string '"captions":'.
   *
   * @param {string} pageBody - The HTML page body to split.
   * @return {string[]} An array containing two strings: the part of the HTML page body before the split and the part after the split.
   * @throws {YoutubeTranscriptTooManyRequestError} If the HTML page body includes the string 'class="g-recaptcha"'.
   * @throws {YoutubeTranscriptVideoUnavailableError} If the HTML page body does not include the string '"playabilityStatus":'.
   * @throws {YoutubeTranscriptDisabledError} If the HTML page body does not contain the string '"captions":'.
   */
  public splitHtml(pageBody: string): string[] {
    this.splittedHTML = pageBody.split('"captions":');

    if (this.splittedHTML.length <= 1) {
      if (pageBody.includes('class="g-recaptcha"')) {
        throw new YoutubeTranscriptTooManyRequestError();
      }
      if (!pageBody.includes('"playabilityStatus":')) {
        throw new YoutubeTranscriptVideoUnavailableError(this.videoId);
      }
      throw new YoutubeTranscriptDisabledError(this.videoId);
    }
    return this.splittedHTML;
  }

  /**
   * Retrieves the caption tracks for a given video ID from the splitted HTML.
   *
   * @param {string[]} splittedHTML - The splitted HTML containing the video details.
   * @return {any[]} An array of caption tracks for the video.
   * @throws {YoutubeTranscriptDisabledError} If the captions are disabled for the video.
   * @throws {YoutubeTranscriptNotAvailableError} If the caption tracks are not available for the video.
   */
  public getCaptionTracks(splittedHTML: string[]): any[] {
    const captions = (() => {
      try {
        return JSON.parse(
          splittedHTML[1].split(',"videoDetails')[0].replace('\n', '')
        );
      } catch (e) {
        return undefined;
      }
    })()?.['playerCaptionsTracklistRenderer'];

    if (!captions) {
      throw new YoutubeTranscriptDisabledError(this.videoId);
    }

    if (!('captionTracks' in captions)) {
      throw new YoutubeTranscriptNotAvailableError(this.videoId);
    }

    this.captionTracks = captions.captionTracks;
    return this.captionTracks;
  }

  /**
   * Retrieves the transcript URL for a given video ID and caption tracks.
   *
   * @param {any[]} captionTracks - An array of caption tracks.
   * @returns {Promise<string>} - A promise that resolves to the transcript URL.
   * @throws {YoutubeTranscriptNotAvailableLanguageError} - If the specified language is not available in the caption tracks.
   */
  public getTranscriptURL(captionTracks: any[]): string {
    if (
      this.config?.lang &&
      !captionTracks.some((track) => track.languageCode === this.config?.lang)
    ) {
      throw new YoutubeTranscriptNotAvailableLanguageError(
        this.config?.lang,
        captionTracks.map((track) => track.languageCode),
        this.videoId
      );
    }

    this.transcriptURL = (
      this.config?.lang
        ? captionTracks.find(
            (track) => track.languageCode === this.config?.lang
          )
        : captionTracks[0]
    ).baseUrl;

    return this.transcriptURL;
  }

  /**
   * Retrieves the transcript response from the given transcript URL for a specific video.
   *
   * @param {string} transcriptURL - The URL of the transcript.
   * @returns {Promise<Response>} - The transcript response as a string.
   * @throws {YoutubeTranscriptNotAvailableError} - If the transcript is not available.
   */
  public async getTranscriptResponse(transcriptURL: string): Promise<string> {
    const transcriptResponse = await fetch(transcriptURL, {
      headers: {
        ...(this.config?.lang && { 'Accept-Language': this.config.lang }),
        'User-Agent': USER_AGENT,
      },
    });
    if (!transcriptResponse.ok) {
      throw new YoutubeTranscriptNotAvailableError(this.videoId);
    }
    this.transcriptBody = await transcriptResponse?.text();
    return this.transcriptBody;
  }

  /**
   * Parses the transcript from the given transcript body, caption tracks, and optional configuration.
   *
   * @param {string} transcriptBody - The HTML body of the video page containing the transcript.
   * @param {any[]} captionTracks - An array of caption tracks for the video.
   * @returns {Promise<TranscriptResponse[]>} - A promise that resolves to an array of transcript responses.
   */
  public async parseTranscript(
    transcriptBody: string,
    captionTracks: any[]
  ): Promise<TranscriptResponse[]> {
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    return results.map((result) => ({
      text: result[3],
      duration: parseFloat(result[2]),
      offset: parseFloat(result[1]),
      lang: this.config?.lang ?? captionTracks[0].languageCode,
    }));
  }

  /**
   * Retrieves the YouTube video ID from the given string.
   *
   * @param {string} videoId - The video ID or URL.
   * @return {string} The extracted YouTube video ID.
   * @throws {YoutubeTranscriptError} If the video ID cannot be retrieved.
   */
  static retrieveVideoId(videoId: string) {
    if (videoId.length === 11) {
      return videoId;
    }
    const matchId = videoId.match(RE_YOUTUBE);
    if (matchId && matchId.length) {
      return matchId[1];
    }
    throw new YoutubeTranscriptError(
      'Impossible to retrieve Youtube video ID.'
    );
  }
}

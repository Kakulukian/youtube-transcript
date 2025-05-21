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
  constructor(langs: string[], availableLangs: string[], videoId: string) {
    super(
      `No transcripts are available in ${langs.join(', ')} for this video (${videoId}). Available languages: ${availableLangs.join(
        ', '
      )}`
    );
  }
}

export class YoutubeTranscriptEmptyError extends YoutubeTranscriptError {
  constructor(videoId: string, transcriptBody: string) {
    super(`Transcript response is empty for video (${videoId}). Response body: ${transcriptBody}`);
  }
}

export interface TranscriptConfig {
  lang?: string;
  langs?: string[];
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
  /**
   * Fetch transcript from YTB Video
   * @param videoId Video url or video identifier
   * @param config Get transcript in a specific language ISOs, ordered by preference
   */
  public static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig
  ): Promise<TranscriptResponse[]> {
    const identifier = this.retrieveVideoId(videoId);
    
    // Merge config.lang and config.langs
    const configLangs = [...(config?.lang ? [config.lang] : []), ...(config?.langs ?? [])];
    const preferredLang = configLangs?.[0];

    const videoPageResponse = await fetch(
      `https://www.youtube.com/watch?v=${identifier}`,
      {
        headers: {
          ...(preferredLang && { 'Accept-Language': preferredLang }),
          'User-Agent': USER_AGENT,
        },
      }
    );
    const videoPageBody = await videoPageResponse.text();

    const splittedHTML = videoPageBody.split('"captions":');

    if (splittedHTML.length <= 1) {
      if (videoPageBody.includes('class="g-recaptcha"')) {
        // TODO: add a captcha solver
        throw new YoutubeTranscriptTooManyRequestError();
      }
      if (!videoPageBody.includes('"playabilityStatus":')) {
        throw new YoutubeTranscriptVideoUnavailableError(videoId);
      }
      throw new YoutubeTranscriptDisabledError(videoId);
    }

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
      throw new YoutubeTranscriptDisabledError(videoId);
    }

    if (!('captionTracks' in captions)) {
      throw new YoutubeTranscriptNotAvailableError(videoId);
    }

    
    // Check for available languages based on config
    let availableLanguages: string[] = configLangs.filter(
        (lang) => captions.captionTracks.some((track) => track.languageCode === lang)
      );

    if (configLangs.length && !availableLanguages.length) {
      throw new YoutubeTranscriptNotAvailableLanguageError(
        configLangs,
        captions.captionTracks.map((track) => track.languageCode),
        videoId
      );
    }

    const transcriptLanguage = availableLanguages[0];

    const transcriptURL = (
      transcriptLanguage
        ? captions.captionTracks.find(
          (track) => track.languageCode === transcriptLanguage
        )
        : captions.captionTracks[0]
    ).baseUrl;

    const transcriptResponse = await fetch(transcriptURL, {
      headers: {
        ...(transcriptLanguage && { 'Accept-Language': transcriptLanguage }),
        'User-Agent': USER_AGENT,
      },
    });
    if (!transcriptResponse.ok) {
      throw new YoutubeTranscriptNotAvailableError(videoId);
    }
    const transcriptBody = await transcriptResponse.text();
    
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    
    if (results.length === 0) {
      const headers: Record<string, string> = {};
      transcriptResponse.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      console.error('YouTube Transcript Debug Info:', {
        videoId,
        transcriptURL,
        transcriptLanguage,
        transcriptBody,
        timestamp: new Date().toISOString(),
        responseStatus: transcriptResponse.status,
        responseHeaders: headers
      });
      throw new YoutubeTranscriptEmptyError(videoId, transcriptBody);
    }
  
    return results.map((result) => ({
      text: result[3],
      duration: parseFloat(result[2]),
      offset: parseFloat(result[1]),
      lang: transcriptLanguage,
    }));
  }

  /**
   * Retrieve video id from url or string
   * @param videoId video url or video id
   */
  private static retrieveVideoId(videoId: string) {
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

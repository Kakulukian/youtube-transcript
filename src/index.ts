import { load } from 'cheerio'

const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i

const RE_CAPTION_TRACKS = /"captionTracks":\s*(\[.*?\])/

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)'

export interface YoutubeTranscriptResponse {
  text: string
  duration: number
  offset: number
}

export interface YoutubeFetchConfig {
  /**
   * Locale code
   * @example en, es, hk, uk
   */
  lang?: string
}

export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`)
  }
}

/**
 * Fetch transcript from Youtube Video
 * @param {string} videoUrlOrId - Video url or identifier
 * @param {YoutubeFetchConfig} [config]
 * @return {Promise<YoutubeTranscriptResponse[]>} - If locale available, the localized transcription or default or null.
 */
export const fetchTranscript = async (videoUrlOrId: string, config: YoutubeFetchConfig = {}): Promise<YoutubeTranscriptResponse[]> => {
  try {
    const videoId = getVideoId(videoUrlOrId)

    if (!videoId) {
      throw new Error('Invalid Youtube video identifier.')
    }

    const url = await getTranscriptUrl(videoId, config?.lang ?? 'en')

    if (!url) {
      throw new Error('Transcription unavailable.')
    }

    return await getTranscript(url)
  } catch (err) {
    throw new YoutubeTranscriptError(err)
  }
}

/**
 * @deprecated Use named export `fetchTranscript`.
 */
export const YoutubeTranscript = {
  fetchTranscript
}

const getTranscriptUrl = async (identifier: string, lang?: string) => {
  const response = await fetch(`https://www.youtube.com/watch?v=${identifier}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })
  const body = await response.text()

  return getCaptionTrack(body, lang)
}

/**
 * @see https://github.com/Kakulukian/youtube-transcript/issues/19
 * @param {string} url
 * @returns {Promise<YoutubeTranscriptResponse[]>}
 */
const getTranscript = async (url: string): Promise<YoutubeTranscriptResponse[]> => {
  const response = await fetch(url)
  const body = await response.text()

  const $ = load(body)

  return $('text')
    .map((_, element) => {
      return {
        text: $(element).text(),
        offset: toMs($(element).attr('start')),
        duration: toMs($(element).attr('dur')),
      }
    })
    .get()
}

/**
 * Extract caption track URL from raw HTML string.
 * @param {string} html - The raw HTML string.
 * @param {string} [lang] - The language code to filter the caption tracks by. Default is undefined.
 * @returns {string|null} - The URL of the caption track, or null if not found or an error occurred.
 */
const getCaptionTrack = (
  html: string,
  lang?: string
): string | null => {
  try {
    const captionTracks = JSON.parse(html.match(RE_CAPTION_TRACKS)?.[1] ?? '[]')

    return (
      ((lang && captionTracks.find((e) => e.languageCode.includes(lang))) || captionTracks[0])
        ?.baseUrl ?? null
    )
  } catch (err) {
    return null
  }
}

/**
 * Get video id from url or string
 * @param videoId - video url or video id
 * @returns {string|null} - the identifier of null
 */
const getVideoId = (videoId: string) => {
  if (videoId.length === 11) {
    return videoId
  }

  return getVideoIdFromSearchParams(videoId) || videoId.match(RE_YOUTUBE)?.[1] || null
}

const getVideoIdFromSearchParams = (videoId: string) => {
  try {
    return new URL(videoId).searchParams.get('v')
  } catch (err) {
    return null
  }
}

const toMs = (n: string): number => Math.round(parseFloat(n) * 1000)

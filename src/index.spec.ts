import {fetchTranscript, getVideoId} from './'

const ID = 'dQw4w9WgXcQ'

describe(fetchTranscript, () => {
  test.concurrent.each([
    [ ID, expect.arrayContaining([
      expect.objectContaining({
        text: expect.any(String),
        offset: expect.any(Number),
        duration: expect.any(Number),
      })
    ]) ]
  ])('fetchTranscript(%s) returns transcript', async (input, expected) => {
    const actual = await fetchTranscript(input);

    expect(actual).toEqual(expected)
  })
})

describe(getVideoId, () => {
  test.concurrent.each([
    [ `https://www.youtube.com/watch?v=${ID}`, ID ],
    [ `https://www.youtube.com/embed/${ID}`, ID ],
    [ `https://www.youtube.com/e/${ID}`, ID ],
    [ `https://youtu.be/${ID}`, ID ],
    [ ID, ID ],
    [ null, null ],
    [ `https://www.youtube.com/${ID.slice(0, 1)}`, null ],
  ])('getVideoId(%s) returns %s', ((input, expected) => {
    const actual = getVideoId(input);

    expect(actual).toBe(expected)
  }))
})

import typescript from 'rollup-plugin-typescript2';

const baseConfig = {
  input: 'src/index.ts',
  plugins: [typescript()],
  external: ['cheerio'],
};

const buildFormats = [];

// ES Module build
const esConfig = {
  ...baseConfig,
  output: {
    file: 'dist/youtube-transcript.esm.js',
    format: 'esm',
  },
};
buildFormats.push(esConfig);

// Module build
const umdConfig = {
  ...baseConfig,
  output: {
    compact: true,
    file: 'dist/youtube-transcript.common.js',
    format: 'cjs',
    name: 'YoutubeTranscript',
    exports: 'named',
  },
};
buildFormats.push(umdConfig);

// Export config
export default buildFormats;

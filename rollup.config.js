import typescript from 'rollup-plugin-typescript2';

const baseConfig = {
  input: 'src/index.ts',
  plugins: [typescript()],
  external: ['axios'],
};

const buildFormats = [];

// ES Module build
const esConfig = {
  ...baseConfig,
  output: {
    file: 'dist/youtube-transcript.js',
    format: 'esm',
  },
};
buildFormats.push(esConfig);

// Module build
const umdConfig = {
  ...baseConfig,
  output: {
    compact: true,
    file: 'dist/youtube-transcript.cjs',
    format: 'cjs',
    name: 'YoutubeTranscript',
    exports: 'named',
  },
};
buildFormats.push(umdConfig);

// Export config
export default buildFormats;

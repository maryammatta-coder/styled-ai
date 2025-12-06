import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.styledai.app',
  appName: 'Styled AI',
  webDir: 'out',
  server: {
    url: 'https://styled-ai.vercel.app',
    cleartext: true
  }
};

export default config;

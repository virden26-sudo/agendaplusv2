import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.agendaplus',
  appName: 'Agenda+',
  webDir: 'out',
  server: {
    // This allows the app to load from local assets (FinalA+)
    // instead of trying to find an external server.
    androidScheme: 'https'
  }
};

export default config;

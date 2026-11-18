import { Application } from 'pixi.js';
import './ui/styles.css';
import { App } from './app/app';
import { TextureBank } from './render/textures';
import { loadProfile } from './save/storage';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  const pixi = new Application();
  await pixi.init({
    background: '#060d1f',
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    resizeTo: root,
    powerPreference: 'high-performance',
  });
  const tex = new TextureBank(pixi.renderer);
  const app = new App(root, pixi, tex, loadProfile());
  try {
    const { Sfx } = await import('./audio/sfx');
    app.audio = new Sfx(app.profile.settings);
  } catch {
    app.audio = null;
  }
  app.showMainMenu();
  // dev/testing hook
  (window as unknown as { gtd: App }).gtd = app;
}

boot();

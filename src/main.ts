import { Application, Graphics } from 'pixi.js';

// Phase 2 placeholder: proves the build + deploy pipeline and PixiJS rendering work.
async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  root.style.cssText = 'position:fixed;inset:0;background:#060d1f;display:grid;place-items:center;color:#7fe9ff;font-family:Orbitron,sans-serif';
  const app = new Application();
  await app.init({ width: 480, height: 320, background: '#060d1f', antialias: true });
  root.appendChild(app.canvas);
  const hex = new Graphics();
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) pts.push(Math.cos((i / 6) * Math.PI * 2) * 60, Math.sin((i / 6) * Math.PI * 2) * 60);
  hex.poly(pts).fill({ color: 0x39ff88, alpha: 0.15 }).stroke({ width: 4, color: 0x39ff88 });
  hex.position.set(240, 150);
  app.stage.addChild(hex);
  app.ticker.add((t) => (hex.rotation += 0.01 * t.deltaTime));
  const label = document.createElement('div');
  label.textContent = 'GEOMETRY TOWER D — under construction';
  root.appendChild(label);
}
boot();

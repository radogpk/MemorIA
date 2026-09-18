import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest Configuration', () => {
  it('should have a valid public/manifest.json file with required PWA properties', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifestContent.name).toBe('memorIA - Agenda & Calendario Académico');
    expect(manifestContent.short_name).toBe('memorIA');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.start_url).toBe('/calendar');
    expect(manifestContent.icons).toBeInstanceOf(Array);
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);
  });
});

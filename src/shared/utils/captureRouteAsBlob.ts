import type { GpsSample } from '@/apis/runningSessions';

const WIDTH = 600;
const HEIGHT = 400;
const PADDING = 40;

export function captureRouteAsBlob(gpsSamples: GpsSample[]): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (gpsSamples.length < 2) {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    // 지도 느낌의 배경
    ctx.fillStyle = '#E8EAE0';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const lats = gpsSamples.map((s) => s.latitude);
    const lons = gpsSamples.map((s) => s.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;

    const mapW = WIDTH - PADDING * 2;
    const mapH = HEIGHT - PADDING * 2;

    function project(lat: number, lon: number): [number, number] {
      return [
        PADDING + ((lon - minLon) / lonRange) * mapW,
        PADDING + ((maxLat - lat) / latRange) * mapH,
      ];
    }

    // 폴리라인
    ctx.beginPath();
    ctx.strokeStyle = '#4F80FF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [x0, y0] = project(gpsSamples[0].latitude, gpsSamples[0].longitude);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < gpsSamples.length; i++) {
      const [x, y] = project(gpsSamples[i].latitude, gpsSamples[i].longitude);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 출발 마커 (초록)
    const [sx, sy] = project(gpsSamples[0].latitude, gpsSamples[0].longitude);
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#22C55E';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 도착 마커 (빨강)
    const last = gpsSamples[gpsSamples.length - 1];
    const [ex, ey] = project(last.latitude, last.longitude);
    ctx.beginPath();
    ctx.arc(ex, ey, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

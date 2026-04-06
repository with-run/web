const KAKAO_APP_KEY = '00e95b3c23d98d12a07d3744fb0afcc7';

let sdkPromise: Promise<void> | null = null;

export function loadKakaoMapSdk(): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => kakao.maps.load(resolve);
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Kakao Maps SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

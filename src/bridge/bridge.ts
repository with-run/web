import type { AndroidPostMessageSchema, AppBridge } from '@bridge';
import { linkBridge } from '@webview-bridge/web';

// 웹은 모바일에서 작성한 브릿지 클라이언트를 받아서 사용
const bridge = linkBridge<AppBridge, AndroidPostMessageSchema>();

export { bridge };

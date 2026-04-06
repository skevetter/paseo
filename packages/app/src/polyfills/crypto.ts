import * as ExpoCrypto from "expo-crypto";
import { Buffer } from "buffer";

declare global {
  interface Crypto {
    randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
  }
}

export function polyfillCrypto(): void {
  // Ensure TextEncoder/TextDecoder exist for shared E2EE code (tweetnacl + relay transport).
  // Hermes may not provide them in all configurations.
  if (typeof (globalThis as any).TextEncoder !== "function") {
    class BufferTextEncoder {
      encode(input = ""): Uint8Array {
        return Uint8Array.from(Buffer.from(String(input), "utf8"));
      }
    }
    (globalThis as any).TextEncoder = BufferTextEncoder as any;
  }

  if (typeof (globalThis as any).TextDecoder !== "function") {
    class BufferTextDecoder {
      constructor(_label?: string, _options?: unknown) {
        // no-op
      }
      decode(input?: ArrayBuffer | ArrayBufferView): string {
        if (input == null) return "";
        if (input instanceof ArrayBuffer) {
          return Buffer.from(input).toString("utf8");
        }
        if (ArrayBuffer.isView(input)) {
          return Buffer.from(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
        }
        return Buffer.from(String(input), "utf8").toString("utf8");
      }
    }
    (globalThis as any).TextDecoder = BufferTextDecoder as any;
  }

  const existing = (globalThis as any).crypto as Crypto | null | undefined;
  let target = existing;
  if (!target) {
    target = {} as Crypto;
    (globalThis as any).crypto = target;
  }

  // Install getRandomValues first — the randomUUID polyfill below depends on it.
  if (typeof (globalThis as any).crypto?.getRandomValues !== "function") {
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {} as Crypto;
    }
    globalThis.crypto.getRandomValues = <T extends ArrayBufferView>(array: T): T => {
      return ExpoCrypto.getRandomValues(array as any) as T;
    };
  }

  if (typeof (globalThis as any).crypto?.randomUUID !== "function") {
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {} as Crypto;
    }
    // Implement UUID v4 directly using getRandomValues to avoid the recursive
    // loop: ExpoCrypto.randomUUID() calls getCrypto().randomUUID() which is
    // this very polyfill again (since window.crypto.randomUUID is absent in
    // non-secure HTTP contexts).
    globalThis.crypto.randomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
      const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    };
  }
}

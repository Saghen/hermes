export type TransferableObject =
  | SharedArrayBuffer
  | ArrayBuffer
  | MessagePort
  | ReadableStream
  | WritableStream
  | TransformStream
  | ImageBitmap

export const isClonable = (value: any) =>
  globalThis.SharedArrayBuffer && value instanceof globalThis.SharedArrayBuffer

export const isTransferable = (value: any) =>
  (globalThis.ArrayBuffer && value instanceof globalThis.ArrayBuffer) ||
  (globalThis.MessagePort && value instanceof globalThis.MessagePort) ||
  (globalThis.ReadableStream && value instanceof globalThis.ReadableStream) ||
  (globalThis.WritableStream && value instanceof globalThis.WritableStream) ||
  (globalThis.TransformStream && value instanceof globalThis.TransformStream) ||
  (globalThis.ImageBitmap && value instanceof globalThis.ImageBitmap)

export const getTransferables = (value: any): TransferableObject[] => {
  if (isClonable(value)) return []
  if (isTransferable(value)) return [value]
  if (Array.isArray(value)) return value.flatMap(getTransferables)
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(getTransferables)
  }
  return []
}

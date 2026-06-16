import QRCode from "qrcode";

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 320, margin: 1 });
}

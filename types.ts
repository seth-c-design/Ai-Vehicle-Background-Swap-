export interface FileInfo {
  name: string;
  type: string;
  size: number;
  base64: string;
  width?: number;
  height?: number;
}

export interface PinPosition {
  x: number;
  y: number;
}

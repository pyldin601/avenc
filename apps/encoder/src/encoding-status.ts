export interface EncodingStatusInitial {
  status: "initial";
}

export interface EncodingStatusReading {
  status: "reading";
}

export interface EncodingStatusEncoding {
  percent: number;
  status: "encoding";
}

export interface EncodingStatusWriting {
  status: "writing";
}

export interface EncodingStatusFinished {
  status: "finished";
}

export interface EncodingStatusError {
  status: "error";
}

export type EncodingStatus =
  | EncodingStatusInitial
  | EncodingStatusReading
  | EncodingStatusEncoding
  | EncodingStatusWriting
  | EncodingStatusFinished
  | EncodingStatusError;

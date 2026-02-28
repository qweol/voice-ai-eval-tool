/**
 * Doubao WebSocket Protocol Implementation
 * Based on official Python example: volcengine_unidirectional_stream_demo
 */

// Message Type Enumeration
export enum MsgType {
  Invalid = 0,
  FullClientRequest = 0b1,
  AudioOnlyClient = 0b10,
  FullServerResponse = 0b1001,
  AudioOnlyServer = 0b1011,
  FrontEndResultServer = 0b1100,
  Error = 0b1111,
}

// Message Type Flag Bits
export enum MsgTypeFlagBits {
  NoSeq = 0,           // Non-terminal packet with no sequence
  PositiveSeq = 0b1,   // Non-terminal packet with sequence > 0
  LastNoSeq = 0b10,    // Last packet with no sequence
  NegativeSeq = 0b11,  // Last packet with sequence < 0
  WithEvent = 0b100,   // Payload contains event number (int32)
}

// Version Bits
export enum VersionBits {
  Version1 = 1,
  Version2 = 2,
  Version3 = 3,
  Version4 = 4,
}

// Header Size Bits
export enum HeaderSizeBits {
  HeaderSize4 = 1,
  HeaderSize8 = 2,
  HeaderSize12 = 3,
  HeaderSize16 = 4,
}

// Serialization Bits
export enum SerializationBits {
  Raw = 0,
  JSON = 0b1,
  Thrift = 0b11,
  Custom = 0b1111,
}

// Compression Bits
export enum CompressionBits {
  None = 0,
  Gzip = 0b1,
  Custom = 0b1111,
}

// Event Type Enumeration
export enum EventType {
  None = 0,

  // Connection events
  StartConnection = 1,
  FinishConnection = 2,
  ConnectionStarted = 50,
  ConnectionFailed = 51,
  ConnectionFinished = 52,

  // Session events
  StartSession = 100,
  CancelSession = 101,
  FinishSession = 102,
  SessionStarted = 150,
  SessionCanceled = 151,
  SessionFinished = 152,
  SessionFailed = 153,

  // TTS events
  TTSSentenceStart = 350,
  TTSSentenceEnd = 351,
  TTSResponse = 352,
  TTSEnded = 359,
}

export interface Message {
  version: VersionBits;
  headerSize: HeaderSizeBits;
  type: MsgType;
  flag: MsgTypeFlagBits;
  serialization: SerializationBits;
  compression: CompressionBits;

  event: EventType;
  sessionId: string;
  connectId: string;
  sequence: number;
  errorCode: number;

  payload: Buffer;
}

/**
 * Create a default message
 */
export function createMessage(type: MsgType, flag: MsgTypeFlagBits): Message {
  return {
    version: VersionBits.Version1,
    headerSize: HeaderSizeBits.HeaderSize4,
    type,
    flag,
    serialization: SerializationBits.JSON,
    compression: CompressionBits.None,
    event: EventType.None,
    sessionId: '',
    connectId: '',
    sequence: 0,
    errorCode: 0,
    payload: Buffer.alloc(0),
  };
}

/**
 * Marshal message to binary format
 */
export function marshalMessage(msg: Message): Buffer {
  const buffers: Buffer[] = [];

  // Write header (4 bytes for HeaderSize4)
  const header = Buffer.alloc(4);
  header[0] = (msg.version << 4) | msg.headerSize;
  header[1] = (msg.type << 4) | msg.flag;
  header[2] = (msg.serialization << 4) | msg.compression;
  header[3] = 0; // Reserved
  buffers.push(header);

  // Write event if WithEvent flag is set
  if (msg.flag === MsgTypeFlagBits.WithEvent) {
    const eventBuf = Buffer.alloc(4);
    eventBuf.writeInt32BE(msg.event, 0);
    buffers.push(eventBuf);

    // Write session ID (if not connection event)
    if (![EventType.StartConnection, EventType.FinishConnection,
          EventType.ConnectionStarted, EventType.ConnectionFailed].includes(msg.event)) {
      const sessionIdBytes = Buffer.from(msg.sessionId, 'utf-8');
      const sizeBuf = Buffer.alloc(4);
      sizeBuf.writeUInt32BE(sessionIdBytes.length, 0);
      buffers.push(sizeBuf);
      if (sessionIdBytes.length > 0) {
        buffers.push(sessionIdBytes);
      }
    }
  }

  // Write sequence if needed
  if (msg.type in [MsgType.FullClientRequest, MsgType.FullServerResponse,
                   MsgType.AudioOnlyClient, MsgType.AudioOnlyServer]) {
    if (msg.flag === MsgTypeFlagBits.PositiveSeq || msg.flag === MsgTypeFlagBits.NegativeSeq) {
      const seqBuf = Buffer.alloc(4);
      seqBuf.writeInt32BE(msg.sequence, 0);
      buffers.push(seqBuf);
    }
  }

  // Write error code if Error type
  if (msg.type === MsgType.Error) {
    const errorBuf = Buffer.alloc(4);
    errorBuf.writeUInt32BE(msg.errorCode, 0);
    buffers.push(errorBuf);
  }

  // Write payload
  const payloadSizeBuf = Buffer.alloc(4);
  payloadSizeBuf.writeUInt32BE(msg.payload.length, 0);
  buffers.push(payloadSizeBuf);
  buffers.push(msg.payload);

  return Buffer.concat(buffers);
}

/**
 * Unmarshal binary data to message
 */
export function unmarshalMessage(data: Buffer): Message {
  let offset = 0;

  // Read header
  const versionAndHeaderSize = data[offset++];
  const version = (versionAndHeaderSize >> 4) as VersionBits;
  const headerSize = (versionAndHeaderSize & 0b00001111) as HeaderSizeBits;

  const typeAndFlag = data[offset++];
  const type = (typeAndFlag >> 4) as MsgType;
  const flag = (typeAndFlag & 0b00001111) as MsgTypeFlagBits;

  const serializationAndCompression = data[offset++];
  const serialization = (serializationAndCompression >> 4) as SerializationBits;
  const compression = (serializationAndCompression & 0b00001111) as CompressionBits;

  // Skip header padding
  const headerSizeBytes = 4 * headerSize;
  offset = headerSizeBytes;

  const msg = createMessage(type, flag);
  msg.version = version;
  msg.headerSize = headerSize;
  msg.serialization = serialization;
  msg.compression = compression;

  // Read sequence if needed
  if ([MsgType.FullClientRequest, MsgType.FullServerResponse,
       MsgType.AudioOnlyClient, MsgType.AudioOnlyServer].includes(type)) {
    if (flag === MsgTypeFlagBits.PositiveSeq || flag === MsgTypeFlagBits.NegativeSeq) {
      msg.sequence = data.readInt32BE(offset);
      offset += 4;
    }
  }

  // Read error code if Error type
  if (type === MsgType.Error) {
    msg.errorCode = data.readUInt32BE(offset);
    offset += 4;
  }

  // Read event if WithEvent flag is set
  if (flag === MsgTypeFlagBits.WithEvent) {
    msg.event = data.readInt32BE(offset) as EventType;
    offset += 4;

    // Read session ID (if not connection event)
    if (![EventType.StartConnection, EventType.FinishConnection,
          EventType.ConnectionStarted, EventType.ConnectionFailed,
          EventType.ConnectionFinished].includes(msg.event)) {
      const sessionIdSize = data.readUInt32BE(offset);
      offset += 4;
      if (sessionIdSize > 0) {
        msg.sessionId = data.toString('utf-8', offset, offset + sessionIdSize);
        offset += sessionIdSize;
      }
    }

    // Read connect ID (if connection event)
    if ([EventType.ConnectionStarted, EventType.ConnectionFailed,
         EventType.ConnectionFinished].includes(msg.event)) {
      const connectIdSize = data.readUInt32BE(offset);
      offset += 4;
      if (connectIdSize > 0) {
        msg.connectId = data.toString('utf-8', offset, offset + connectIdSize);
        offset += connectIdSize;
      }
    }
  }

  // Read payload
  const payloadSize = data.readUInt32BE(offset);
  offset += 4;
  if (payloadSize > 0) {
    msg.payload = data.subarray(offset, offset + payloadSize);
  }

  return msg;
}

/**
 * Send full client request
 */
export function createFullClientRequest(payload: Buffer): Buffer {
  const msg = createMessage(MsgType.FullClientRequest, MsgTypeFlagBits.NoSeq);
  msg.payload = payload;
  return marshalMessage(msg);
}

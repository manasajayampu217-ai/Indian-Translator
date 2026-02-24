import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming";

// AWS Configuration
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "";

export interface TranscribeConfig {
  languageCode: string;
  sampleRate: number;
}

export class TranscribeService {
  private client: TranscribeStreamingClient;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.client = new TranscribeStreamingClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async startTranscription(
    config: TranscribeConfig,
    onTranscript: (text: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: config.sampleRate });
      const source = this.audioContext.createMediaStreamSource(stream);

      // Create audio chunks generator
      const audioStream = this.createAudioStream(stream);

      // Start transcription
      const command = new StartStreamTranscriptionCommand({
        LanguageCode: config.languageCode,
        MediaEncoding: "pcm",
        MediaSampleRateHertz: config.sampleRate,
        AudioStream: audioStream,
      });

      const response = await this.client.send(command);

      // Process transcription results
      if (response.TranscriptResultStream) {
        for await (const event of response.TranscriptResultStream) {
          if (event.TranscriptEvent?.Transcript?.Results) {
            const results = event.TranscriptEvent.Transcript.Results;
            
            for (const result of results) {
              if (result.Alternatives && result.Alternatives.length > 0) {
                const transcript = result.Alternatives[0].Transcript || "";
                if (transcript && !result.IsPartial) {
                  onTranscript(transcript);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      onError(error as Error);
    }
  }

  private async *createAudioStream(stream: MediaStream): AsyncGenerator<{ AudioEvent: { AudioChunk: Uint8Array } }> {
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(100); // Collect data every 100ms

    while (mediaRecorder.state !== "inactive") {
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (audioChunks.length > 0) {
        const chunk = audioChunks.shift();
        if (chunk) {
          const arrayBuffer = await chunk.arrayBuffer();
          const audioChunk = new Uint8Array(arrayBuffer);
          yield { AudioEvent: { AudioChunk: audioChunk } };
        }
      }
    }
  }

  stopTranscription(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

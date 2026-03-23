import axios from "axios";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export class IPFSService {
  private apiKey: string;
  private secretKey: string;
  private readonly baseUrl = "https://api.pinata.cloud";

  constructor() {
    this.apiKey = process.env.PINATA_API_KEY!;
    this.secretKey = process.env.PINATA_SECRET_API_KEY!;
  }

  private get headers() {
    return {
      pinata_api_key: this.apiKey,
      pinata_secret_api_key: this.secretKey,
    };
  }

  async uploadJSON(data: Record<string, unknown>): Promise<string> {
    const resp = await axios.post<PinataResponse>(
      `${this.baseUrl}/pinning/pinJSONToIPFS`,
      {
        pinataContent: data,
        pinataMetadata: {
          name: `pharmtrace-batch-${Date.now()}`,
        },
      },
      { headers: this.headers }
    );
    return resp.data.IpfsHash;
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType = "application/octet-stream"
  ): Promise<string> {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });
    form.append(
      "pinataMetadata",
      JSON.stringify({ name: fileName })
    );

    const resp = await axios.post<PinataResponse>(
      `${this.baseUrl}/pinning/pinFileToIPFS`,
      form,
      {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    return resp.data.IpfsHash;
  }

  async getJSON(ipfsHash: string): Promise<unknown> {
    const resp = await axios.get(
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    );
    return resp.data;
  }

  getGatewayUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}

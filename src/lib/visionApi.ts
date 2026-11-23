interface VisionApiResponse {
  responses: { fullTextAnnotation?: { text?: string }; textAnnotations?: { description: string }[] }[];
}

export async function callVisionTextDetection(
  imageBase64: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Vision API hatası: ${response.status}`);
  }
  const data: VisionApiResponse = await response.json();
  return data.responses[0]?.fullTextAnnotation?.text ?? '';
}

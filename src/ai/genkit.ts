/** Small, server-side Ollama adapter. The filename preserves existing flow imports. */
import {z} from 'zod';
type GenerationOptions<T> = {
  model?: string;
  system?: string;
  prompt?: string;
  messages?: {role: string; content: {text?: string; media?: {url:string; contentType?:string}}[]}[];
  config?: {num_ctx?: number; temperature?: number};
  onChunk?: () => void;
  output: {schema: z.ZodType<T>};
};
export async function buddIEGenerate<T>(options: GenerationOptions<T>): Promise<{output:T}> {
  if (typeof window !== 'undefined') throw new Error('AI generation requires the optional Ollama service.');
  const messages: {role:string; content:string; images?:string[]}[] = [];
  if (options.system) messages.push({role:'system',content:options.system});
  if (options.prompt) messages.push({role:'user',content:options.prompt});
  for (const message of options.messages || []) {
    const images: string[] = [];
    const texts: string[] = [];
    for (const part of message.content) {
      if (part.text) texts.push(part.text);
      if (part.media) {
        // PDFs require a text extractor; never pretend binary files are understood as plain text.
        const image = part.media.url.match(/^data:image\/(?:png|jpeg|webp);base64,([\s\S]+)$/);
        if (!image) throw new Error('Paste the document text or use a TXT export. This AI endpoint accepts text and supported images.');
        images.push(image[1]);
      }
    }
    messages.push({role:message.role,content:texts.join('\n'),...(images.length ? {images} : {})});
  }
  const base = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/,'');
  const response = await fetch(`${base}/api/chat`, {
    method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(60000),
    body:JSON.stringify({model:process.env.OLLAMA_MODEL || options.model?.replace(/^ollama\//,'') || 'budd-ie:latest', messages, stream:false, options:options.config, format:z.toJSONSchema(options.output.schema,{unrepresentable:'any'})}),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}. Check the configured model and service.`);
  const body = await response.json();
  const content = body.message?.content;
  if (typeof content !== 'string') throw new Error('Ollama returned no message.');
  return {output:options.output.schema.parse(JSON.parse(content))};
}
export const ai = {
  generate:buddIEGenerate,
  defineFlow<I,O>(config:{name:string; inputSchema:z.ZodType<I>; outputSchema:z.ZodType<O>}, handler:(input:I)=>Promise<O>) {
    return async (input:I) => config.outputSchema.parse(await handler(config.inputSchema.parse(input)));
  },
};
export default ai;

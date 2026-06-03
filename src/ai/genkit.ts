
// This file is safe for both Node and Browser.
// It will only initialize Genkit when running in a Node environment.

const createShim = () => {
  console.log("Genkit: Initializing browser shim.");

  const flowNoop = (config: any, fn: any) => {
    const implementation = typeof config === 'function' ? config : fn;
    const f = async (input: any) => {
      console.warn(`Genkit flow "${config?.name || 'unknown'}" called in browser environment.`);
      if (typeof implementation === 'function') {
        return await implementation(input);
      }
      return { assignments: [], announcements: [], discussions: [] };
    };
    // Genkit flows are callable and also have a .run method
    const flowObj = Object.assign(f, {
      run: f,
      config: config
    });
    return flowObj;
  };

  const promptNoop = (config: any) => {
    const p = async (input: any) => {
      console.warn(`Genkit prompt "${config?.name || 'unknown'}" called in browser environment.`);
      return { output: { assignments: [], announcements: [], discussions: [] } };
    };
    // Genkit prompts are callable and also have a .run method
    const promptObj = Object.assign(p, {
      run: p,
      config: config
    });
    return promptObj;
  };

  return {
    defineFlow: flowNoop,
    definePrompt: promptNoop,
    run: async (nameOrFn: any, fn?: any) => {
      const actualFn = typeof nameOrFn === 'function' ? nameOrFn : fn;
      if (typeof actualFn === 'function') return actualFn();
      return null;
    },
    act: async (nameOrFn: any, fn?: any) => {
      const actualFn = typeof nameOrFn === 'function' ? nameOrFn : fn;
      if (typeof actualFn === 'function') return actualFn();
      return null;
    },
    // Add other common Genkit methods if needed
    generate: async () => ({ text: () => "AI is not available in browser.", output: () => null }),
  };
};

let aiInstance: any;

if (typeof window === 'undefined') {
  try {
    // We are in Node.js (Build time or Server-side)
    // Using require instead of import to avoid bundling issues in browser
    const { genkit } = require('genkit');
    const { ollama } = require('genkitx-ollama');

    aiInstance = genkit({
      plugins: [
        ollama({
          models: [
            {name: 'genesisai-standalone:latest'}
          ],
          serverAddress: 'http://127.0.0.1:11434',
        }),
      ],
      model: 'ollama/genesisai-standalone:latest',
    });
    console.log("Genkit: Node.js instance initialized.");
  } catch (e) {
    console.error("Genkit: Node.js initialization failed, using shim.", e);
    aiInstance = createShim();
  }
} else {
  // Browser environment
  aiInstance = createShim();
}

export const ai = aiInstance;
export const buddIEGenerate = aiInstance.generate;
export default aiInstance;

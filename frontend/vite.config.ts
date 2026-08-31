import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
};

export default defineConfig(async ({ mode }) => {
  // Read server-only local credentials from the backend folder. Vite exposes
  // only VITE_-prefixed values to browser code; these keys remain server-side.
  const backendEnv = loadEnv(mode, '../backend', '');
  process.env.GEMINI_API_KEY ??= backendEnv.GEMINI_API_KEY;
  process.env.OPENAI_API_KEY ??= backendEnv.OPENAI_API_KEY;
  process.env.OPENAI_MODEL ??= backendEnv.OPENAI_MODEL;
  process.env.OPENAI_TTS_MODEL ??= backendEnv.OPENAI_TTS_MODEL;
  process.env.OPENAI_TTS_VOICE ??= backendEnv.OPENAI_TTS_VOICE;
  process.env.OCULAR_AI_PROVIDER ??= backendEnv.OCULAR_AI_PROVIDER;
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: {
          ...localBindingConfig,
          vars: {
            ...(backendEnv.GEMINI_API_KEY
              ? { GEMINI_API_KEY: backendEnv.GEMINI_API_KEY }
              : {}),
            ...(backendEnv.OPENAI_API_KEY
              ? { OPENAI_API_KEY: backendEnv.OPENAI_API_KEY }
              : {}),
            ...(backendEnv.OPENAI_MODEL
              ? { OPENAI_MODEL: backendEnv.OPENAI_MODEL }
              : {}),
            ...(backendEnv.OPENAI_TTS_MODEL
              ? { OPENAI_TTS_MODEL: backendEnv.OPENAI_TTS_MODEL }
              : {}),
            ...(backendEnv.OPENAI_TTS_VOICE
              ? { OPENAI_TTS_VOICE: backendEnv.OPENAI_TTS_VOICE }
              : {}),
            ...(backendEnv.OCULAR_AI_PROVIDER
              ? { OCULAR_AI_PROVIDER: backendEnv.OCULAR_AI_PROVIDER }
              : {}),
            OCULAR_RENDERER_URL:
              backendEnv.OCULAR_RENDERER_URL || 'http://127.0.0.1:8789',
          },
        },
      }),
    ],
  };
});

import type {NextConfig} from 'next';
import webpack from 'webpack';

const nextConfig: NextConfig = {
    output: 'export',
    trailingSlash: false,
    allowedDevOrigins: ['localhost', '127.0.0.1', '172.17.101.253', '192.168.137.1'],

    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },
    /*
    turbopack: {
      resolveAlias: {
        tls: false,
        net: false,
        dns: false,
        http2: false,
        fs: false,
        os: false,
        path: false,
        crypto: false,
        child_process: false,
        http: false,
        https: false,
        zlib: false,
        stream: false,
        url: false,
        util: false,
        buffer: false,
        querystring: false,
        async_hooks: false,
        readline: false,
        perf_hooks: false,
        dgram: false,
        worker_threads: false,
        'stream/web': false,
        process: false,
        genkit: false,
        'genkitx-ollama': false,
        'puppeteer-core': false,
      },
    },
    */
    webpack: (config, {isServer}) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                tls: false,
                net: false,
                dns: false,
                http2: false,
                fs: false,
                os: false,
                path: false,
                crypto: false,
                child_process: false,
                http: false,
                https: false,
                zlib: false,
                stream: false,
                url: false,
                util: false,
                buffer: false,
                querystring: false,
                async_hooks: false,
                readline: false,
                perf_hooks: false,
                dgram: false,
                worker_threads: false,
                'stream/web': false,
                process: false, // We'll use the plugin instead
                genkit: false,
                'genkitx-ollama': false,
                'puppeteer-core': false,
            };

            config.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser',
                    Buffer: ['buffer', 'Buffer'],
                }),
                new webpack.NormalModuleReplacementPlugin(
                    /^node:/,
                    (resource: { request: string }) => {
                        resource.request = resource.request.replace(/^node:/, "");
                    }
                )
            );
        }
        return config;
    },
};

export default nextConfig;

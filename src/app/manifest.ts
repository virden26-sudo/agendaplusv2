import {MetadataRoute} from 'next'

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Agenda+',
        short_name: 'Agenda+',
        description: 'A smart agenda for students.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fff',
        theme_color: '#fff',
        icons: [
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png"
            }
        ],
    }
}

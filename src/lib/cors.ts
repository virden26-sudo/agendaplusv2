import {NextResponse} from "next/server";

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function withCors<T extends NextResponse>(response: T): T {
    for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
    }

    return response;
}

export function corsOptions() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

import {NextResponse} from "next/server";
import {corsOptions, withCors} from "@/lib/cors";

export const dynamic = "force-static";
export const OPTIONS = corsOptions;

export function GET() {
    return withCors(NextResponse.json({ok: true}));
}

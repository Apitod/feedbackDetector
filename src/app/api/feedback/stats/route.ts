// app/api/feedback/stats/route.ts
import { NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export async function GET() {
    const stats = getStats();

    return NextResponse.json(
        { success: true, data: stats },
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
            },
        }
    );
}

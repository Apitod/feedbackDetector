// app/api/feedback/[id]/route.ts
// DELETE endpoint untuk menghapus item feedback berdasarkan ID
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
    req: NextRequest,
    context: any
) {
    // Await context.params in Next.js 14/15
    const params = await context.params;
    const id = params.id;

    if (!id) {
        return NextResponse.json({ success: false, message: "ID diperlukan" }, { status: 400 });
    }

    if (!global.feedbackStore) {
        return NextResponse.json({ success: false, message: "Store kosong" }, { status: 404 });
    }

    const beforeCount = global.feedbackStore.length;
    global.feedbackStore = global.feedbackStore.filter((f) => f.id !== id);
    const afterCount = global.feedbackStore.length;

    if (beforeCount === afterCount) {
        return NextResponse.json({ success: false, message: `Item dengan ID '${id}' tidak ditemukan` }, { status: 404 });
    }

    return NextResponse.json(
        { success: true, message: `Item '${id}' berhasil dihapus`, remaining: afterCount },
        { headers: { "Access-Control-Allow-Origin": "*" } }
    );
}

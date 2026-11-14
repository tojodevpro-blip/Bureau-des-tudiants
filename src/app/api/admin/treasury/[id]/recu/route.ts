import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api";
import { requireTreasuryApi } from "@/lib/auth/guard";
import { getBranding } from "@/lib/branding";
import { TREASURY_PAYMENT_LABELS } from "@/lib/treasury";
import { treasuryReceiptToPdf } from "@/lib/treasury-receipt";
import { getTreasuryReceipt } from "@/server/services/treasury";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireTreasuryApi();
    const { id } = await params;
    const [entry, branding] = await Promise.all([getTreasuryReceipt(id), getBranding()]);

    if (entry.type !== "RECETTE") {
      throw new ApiError(
        400,
        "Un reçu ne peut être généré que pour une recette.",
        "TYPE_OPERATION_INVALIDE",
      );
    }

    const pdf = await treasuryReceiptToPdf({
      id: entry.id,
      date: entry.date,
      libelle: entry.libelle,
      categorie: entry.categorie,
      montant: entry.montant,
      moyenPaiement: TREASURY_PAYMENT_LABELS[entry.moyenPaiement],
      reference: entry.reference,
      payeur: entry.payeur,
      note: entry.note,
      event: entry.event,
      createdBy: entry.createdBy,
      branding,
      generatedAt: new Date(),
    });

    const download = new URL(request.url).searchParams.get("download") === "1";
    const filename = `recu-${entry.id.slice(-8)}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { ok: false, error: { message: error.message, code: error.code } },
        { status: error.status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { ok: false, error: { message: "Erreur lors de la génération du reçu.", code: "RECU" } },
      { status: 500 },
    );
  }
}

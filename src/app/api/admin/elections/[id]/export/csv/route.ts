import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { getElectionResults } from "@/server/services/results";
import { resultsToCsv, slugify } from "@/lib/export";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const results = await getElectionResults(id);
    if (!results) throw new ApiError(404, "Élection introuvable.", "ELECTION_INTROUVABLE");
    if (!["CLOTUREE", "PUBLIEE"].includes(results.election.statut)) {
      throw new ApiError(
        409,
        "Les résultats ne sont disponibles qu’après la clôture du vote.",
        "RESULTATS_NON_DISPONIBLES",
      );
    }

    const csv = resultsToCsv(results);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="resultats-${slugify(results.election.titre)}-${date}.csv"`,
        "cache-control": "no-store",
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
      { ok: false, error: { message: "Erreur lors de l’export.", code: "EXPORT" } },
      { status: 500 },
    );
  }
}

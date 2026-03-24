import { NextResponse } from "next/server";
import { manager } from "@/lib/crawler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json([]);
    }

    const suggestions = manager.getSuggestions(query) || [];
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Suggestions API Error:", error);
    return NextResponse.json([]);
  }
}

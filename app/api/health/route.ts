import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "unknown"
  
  // Check database connection
  let databaseStatus = "DOWN"
  let databaseError: string | null = null
  
  try {
    // Simple query to test the database connection
    await sql`SELECT 1 as test`
    databaseStatus = "UP"
  } catch (error) {
    console.error("Health check - Database connection failed:", error)
    databaseError = error instanceof Error ? error.message : String(error)
  }

  const response = {
    status: "UP",
    database: databaseStatus,
    version: appVersion,
  }

  // If database is down, include error details and return 503
  if (databaseStatus === "DOWN") {
    return NextResponse.json(
      {
        ...response,
        databaseError,
      },
      { status: 503 }
    )
  }

  return NextResponse.json(response)
}

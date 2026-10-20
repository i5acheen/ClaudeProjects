import { NextResponse } from "next/server";

/**
 * Photos shared into the app are normally caught on the phone by the service
 * worker and never reach us. If it isn't running yet, we don't read or keep
 * anything here — just send the person back to try again.
 */
export function POST(request: Request) {
  return NextResponse.redirect(new URL("/book/write?shared=failed", request.url), 303);
}

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/book/write", request.url), 303);
}

import { getFrame } from "frames.js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const isPostRedirect =
    req.nextUrl.searchParams.get("postType") === "post_redirect";
  const postUrl = req.nextUrl.searchParams.get("postUrl")!;

  try {
    const r = await fetch(postUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      redirect: isPostRedirect ? "manual" : undefined,
      body: JSON.stringify(body),
    });

    if (r.status === 302) {
      return NextResponse.json(
        {
          location: r.headers.get("location"),
        },
        { status: 302 }
      );
    }

    const htmlString = await r.text();

    const { frame, errors } = getFrame({
      htmlString,
      url: body.untrustedData.url,
    });

    return NextResponse.json({ frame, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.error();
  }
}

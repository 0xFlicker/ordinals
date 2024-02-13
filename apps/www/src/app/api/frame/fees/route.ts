import { baseUrl } from "@/utils/config";
import { getFrameHtmlResponse } from "@coinbase/onchainkit";
import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
  const currentTimeMod30Seconds = Math.floor(Date.now() / 30000);
  return new NextResponse(
    getFrameHtmlResponse({
      image: `${baseUrl.get()}/api/meta/axolotl/fees?a=${currentTimeMod30Seconds}`,
      buttons: [
        {
          label: "CHECK AGAIN",
        },
      ],
      postUrl: `${baseUrl.get()}/api/frame/fees?a=${currentTimeMod30Seconds}`,
    })
  );
}

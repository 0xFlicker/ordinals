import { baseUrl } from "@/utils/config";
import { getFrameHtmlResponse } from "@coinbase/onchainkit";
import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
  return new NextResponse(
    getFrameHtmlResponse({
      image: `${baseUrl.get()}/api/meta/axolotl/fees`,
      buttons: [
        {
          label: "CHECK AGAIN",
        },
      ],
      postUrl: `${baseUrl.get()}/api/frame/fees`,
    })
  );
}

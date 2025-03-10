import { renderHtmlCanvas } from "@0xflick/assets";
import { operations, IAttributeMetadata } from "./traits.js";

declare global {
  interface Window {
    CBOR: any;
  }
}

function hexStringToArrayBuffer(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
    .buffer;
}

async function main() {
  // window URL will get us the inscription id via /content/:inscriptionId
  // but fllback to "dev" if no inscription id is found
  const localUrl = new URL(window.location.href);
  const inscriptionId = localUrl.pathname.split("/").pop() ?? "dev";
  // Fetch the metadata and decode with CBOR
  const { tokenId, revealedAt } = await fetch(`/r/metadata/${inscriptionId}`)
    .then((r) => r.json())
    .then((r) => window.CBOR.decode(hexStringToArrayBuffer(r)));

  const canvas = document.querySelector("canvas#main") as HTMLCanvasElement;

  function findSrcForPath(path: string) {
    return `/content/assets/${path}.webp`;
  }
  let currentMetadata: IAttributeMetadata | null = null;

  // use sha256(inscriptionId + tokenId) to get the seed
  const seed = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${inscriptionId}:${tokenId}`),
  );

  async function renderLayers(boxSeed: Uint8Array, revealSeed?: Uint8Array) {
    const { layers, metadata } = await operations({
      boxSeed,
      revealSeed,
      imageFetcher: (imagePath) => {
        const img = document.createElement("img");
        img.src = findSrcForPath(imagePath);
        img.crossOrigin = "anonymous";
        return new Promise((resolve) => {
          img.onload = () => resolve(img);
        });
      },
    });
    currentMetadata = metadata;
    const renderableCanvas = document.createElement("canvas");
    renderableCanvas.width = 720;
    renderableCanvas.height = 720;
    await renderHtmlCanvas(renderableCanvas, layers);
    // copy the image contents to the canvas
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(renderableCanvas, 0, 0);
  }

  function randomUint8ArrayOfLength(length: number) {
    const arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }

  async function getRevealedBlockHash(): Promise<ArrayBuffer | null> {
    let hash: string | null = null;
    try {
      const response = await fetch(`/r/blockhash/${revealedAt}`);
      hash = await response.json();
    } catch (e) {
      // nothing
      return null;
    }

    if (!hash) {
      try {
        const response = await fetch("/r/blockhash");
        if (response.status !== 200) {
          return randomUint8ArrayOfLength(32);
        }
        hash = await response.json();
      } catch (e) {
        return null;
      }
    }

    // use crypto to create a sha256 hash of the block hash + window.tokenId
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(hash + tokenId),
    );
    return hashBuffer;
  }

  async function getCurrentBlockHeight(): Promise<number | null> {
    try {
      return Number(await fetch("/r/blockheight").then((r) => r.json()));
    } catch (e) {
      return null;
    }
  }

  async function checkAndRenderLayers() {
    let isRevealed = false;
    const blockheight = await getCurrentBlockHeight();
    if (!blockheight || blockheight < revealedAt) {
      await renderLayers(new Uint8Array(seed));
      isRevealed = false;
    } else {
      const hashBuffer = await getRevealedBlockHash();
      let revealSeedBytes: Uint8Array;
      if (hashBuffer) {
        const hashArray = new Uint8Array(hashBuffer);
        revealSeedBytes = new Uint8Array(hashArray.slice(0, 32));
        isRevealed = true;
      } else {
        revealSeedBytes = randomUint8ArrayOfLength(32);
      }
      await renderLayers(new Uint8Array(seed), revealSeedBytes);
    }

    if (!isRevealed) {
      setTimeout(checkAndRenderLayers, 60000);
    }
  }
  checkAndRenderLayers();

  function resizeCanvas() {
    var scale = Math.min(window.innerWidth / 720, window.innerHeight / 720);
    canvas.style.width = 720 * scale + "px";
    canvas.style.height = 720 * scale + "px";
  }

  // Resize the canvas whenever the window size changes
  window.addEventListener("resize", resizeCanvas, false);

  // Initial canvas resize
  resizeCanvas();

  // Download image function
  const downloadImage = (e?: Event) => {
    if (e) e.preventDefault();
    const data = canvas.toDataURL("image/jpeg", 0.9);
    const a = document.createElement("a");
    a.href = data;
    a.download = `${tokenId}.jpg`;
    a.click();
  };

  // Desktop right click
  canvas.addEventListener("contextmenu", downloadImage);

  // Download button click
  document
    .getElementById("download-btn")
    ?.addEventListener("click", downloadImage);

  // Mobile long press
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const timer = setTimeout(downloadImage, 2000, e);
    canvas.addEventListener("touchend", () => clearTimeout(timer));
  });

  canvas.addEventListener("click", () => {
    checkAndRenderLayers();
  });

  // on press 'm', download the metadata
  window.addEventListener("keydown", (e) => {
    if (e.key === "m") {
      e.preventDefault();
      const data = JSON.stringify(
        {
          tokenId,
          ...currentMetadata,
        },
        null,
        2,
      );
      const a = document.createElement("a");
      a.href = "data:text/json;charset=utf-8," + encodeURIComponent(data);
      a.download = `${tokenId}.json`;
      a.click();
    }
  });

  const menuIcon = document.getElementById("menuIcon");
  const menuContent = document.getElementById("menuContent");

  menuIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    menuContent.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (!menuContent.contains(e.target as Node)) {
      menuContent.classList.remove("show");
    }
  });
}

main();

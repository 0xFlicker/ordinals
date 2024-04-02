export function openMenu({
  canvas,
  isRevealed,
}: {
  canvas: HTMLCanvasElement;
  isRevealed: boolean;
  onScreenshot: () => void;
  onToggleReveal: () => void;
}) {
  // Draw a menu in the top right corner of the canvas
  // Menu has the following options:
  //  - "screenshot" -- take a screenshot of the canvas
  //  - "unrevealed"/"revealed" -- if isRevealed is true, show "unrevealed" and vice versa
  //  - "close" -- close the menu
  //   Draw the menu using DOM elements (ul/li/buttons) using the canvas as a reference
  //   The menu should be styled with a white background and black text
  //   The menu should have a border around it
  //   The menu should have a drop shadow
  //   The menu should have a padding of 10px
  // const menu = document.createElement("ul");
  // menu.style.position = "absolute";
  // menu.style.top = "10px";
  // menu.style.right = "10px";
  // menu.style.backgroundColor = "white";
  // menu.style.color = "black";
  // menu.style.border = "1px solid black";
  // menu.style.boxShadow = "2px 2px 5px black";
  // menu.style.padding = "10px";
  // menu.style.listStyleType = "none";
  // menu.style.zIndex = "1000";
  // menu.style.cursor = "pointer";
  // const screenshotButton = document.createElement("li");
}

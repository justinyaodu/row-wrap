"use strict";

function getWidth(element) {
  const { left, right } = element.getBoundingClientRect();
  return right - left;
}

function makeSVG(width, height, contents) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${contents}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function makeBirdSVG(index) {
  const path = [
    "M 10 30 Q 25 0 50 30 Q 75 0 90 30",
    "M 10 40 Q 25 0 50 25 Q 75 0 90 40",
  ][index];
  return makeSVG(100, 50, [
    `<path d="${path}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`,
  ]);
}

function makeCoinSVG() {
  return makeSVG(100, 100, [
    `<circle r="50" cx="50" cy="50" fill="#fd0"/>`,
    `<circle r="30" cx="50" cy="50" fill="#cb0"/>`,
  ].join(""));
}

function makeFishSVG() {
  return makeSVG(100, 100, [
    `<path d="M 30 30 L 30 0 L 0 30 L 30 30 C 80 30, 100 60, 80 80 C 60 100, 30 80, 30 30" fill="#f66"/>`,
    `<circle r="4" cx="75" cy="65" fill="#000"/>`,
  ].join(""));
}

function makeIcebergSVG() {
  const path = ["M 0 0"];
  for (let x = 20; x <= 80; x += 20) {
    path.push(`L ${x} ${Math.random() * 6 + 3}`);
  }
  path.push("L 100 0", "L 100 25", "L 0 25", "Z");
  const digit = "cdef".charAt(Math.floor(Math.random() * 4));
  return makeSVG(100, 25, `<path d="${path.join(" ")}" fill="#${digit}${digit}f"/>`);
}

function make(className, ...children) {
  const element = document.createElement("div");
  element.className = className;
  for (const child of children) {
    element.appendChild(child);
  }
  return element;
}

function makeIceberg() {
  const iceberg = make("iceberg");
  iceberg.style["background-image"] = makeIcebergSVG();
  return make("tile", iceberg);
}

function makeFish() {
  return make("tile", make("fish"));
}

const distanceScore = document.getElementById("distance-score");
const fishScore = document.getElementById("fish-score");
const generatedStyles = document.getElementById("generated-styles");
const game = document.getElementById("game");
const controller = document.getElementById("controller");
const player = document.getElementById("player");
const playAgain = document.getElementById("play-again");
const rows = document.getElementById("rows");
const rowsContainer = document.getElementById("rows-container");

function generateStyles() {
  generatedStyles.textContent = `
#player {
  animation: 0.5s infinite player;
}

@keyframes player {
  0%, 100% {
    background-image: ${makeBirdSVG(0)};
  }

  50% {
    background-image: ${makeBirdSVG(1)};
  }
}

.fish {
  background-image: ${makeFishSVG()};
}
`;
}

const START_TEXT = "Click and drag to move 🡇";
const PAUSED_TEXT = "Click and drag to resume 🡇";
const GAME_OVER_TEXT = "Game over!"

let firstClickHappened = false;
let paused = true;
let dead = false;
let lastTimestamp = null;
let totalDistance = 0;
let fishCount = 0;
let rowCount = 0;
let lastOkWidth = 5;

function pause() {
  paused = true;
  controller.value = PAUSED_TEXT;
}

function resume() {
  paused = false;
  controller.value = "";
}

function die() {
  dead = true;
  paused = true;
  controller.value = GAME_OVER_TEXT;
  controller.style.resize = "none";
  playAgain.style.display = "initial";
}

function onResize() {
  const controllerWidth = getWidth(controller);
  const gameWidth = getWidth(game);
  const rowsContainerWidth = Math.max(0.2 * gameWidth, Math.min(controllerWidth, gameWidth));
  rowsContainer.style.width = `${rowsContainerWidth}px`;

  const vh = gameWidth / 80;

  const playerLeft = Math.max(0, Math.min(controllerWidth - 18 * vh, gameWidth - 4 * vh));
  player.style.left = `${playerLeft}px`;

  if (firstClickHappened && !dead) {
    resume();
  }
}

function generateRow() {
  rowCount++;

  switch (rowCount) {
    case 1:
      return "ffffffffff";
    case 2:
      return "ififififif";
  }

  while (true) {
    let arr = [];

    for (let i = 0; i < 10; i++) {
      arr.push(Math.random() > 0.5);
    }

    let ok = false;
    for (let width = 1; width <= 5; width++) {
      if (width === lastOkWidth) {
        continue;
      }
      let thisOk = true;
      for (let i = width - 1; i < 10; i += width) {
        thisOk = thisOk && arr[i];
      }
      ok = ok || thisOk;
    }
    if (!ok) {
      continue;
    }

    return arr.map((b) => b ? "f" : "i").join("");
  }
}

function makeRow() {
  const chars = generateRow();

  const row = make("row");
  for (let i = 0; i < chars.length; i++) {
    row.appendChild(chars[i] === "f" ? makeFish() : makeIceberg());
  }
  return row;
}

function getRowsTop() {
  return parseFloat((rows.style.top || "0vh").replace("vh", ""));
}

function setRowsTop(top) {
  rows.style.top = `${top}vh`;
}

function elementsUnderPlayer() {
  const { left, right, top, bottom } = player.getBoundingClientRect();
  const set = new Set();
  for (const x of [(left * 3 + right) / 4, (left + right * 3) / 4]) {
    for (const y of [(top + bottom) / 2]) {
      for (const element of document.elementsFromPoint(x, y)) {
        set.add(element);
      }
    }
  }
  return Array.from(set);
}

function tick(timestamp) {
  window.requestAnimationFrame(tick);

  fishScore.textContent = `${fishCount}`;
  distanceScore.textContent = `${Math.floor(totalDistance)}`;

  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
    return;
  }

  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (paused) {
    return;
  }

  const distance = delta * (10 + rowCount * 0.2);
  totalDistance += distance;

  setRowsTop(getRowsTop() + distance);
  while (getRowsTop() > 0) {
    rows.prepend(makeRow());
    setRowsTop(getRowsTop() - 40);
  }
  while (rows.children.length > 3) {
    rows.children[rows.children.length - 1].remove();
  }

  for (const touching of elementsUnderPlayer()) {
    if (touching.classList.contains("fish")) {
      touching.remove();
      fishCount++;
    } else if (touching.classList.contains("iceberg")) {
      die();
    }
  }
}

function main() {
  generateStyles();
  setRowsTop(40);

  controller.value = START_TEXT;
  controller.addEventListener("mousedown", () => {
    firstClickHappened = true;
  });
  document.addEventListener("mouseup", () => {
    if (!dead) {
      pause();
    }
  });

  playAgain.addEventListener("click", () => {
    location.reload();
  });

  new ResizeObserver(onResize).observe(controller);

  window.requestAnimationFrame(tick);
}

main();

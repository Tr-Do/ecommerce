const imageInput = document.getElementById("imageInput");
const angleOutput = document.getElementById("angleOutput");
const resetBtn = document.getElementById("resetBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const fileName = document.getElementById("fileName");
const uploadBigBtn = document.getElementById("uploadImg");
const UI = document.querySelectorAll(".UI");

let img = null;
let points = [];
let draggedPointIndex = -1;
let isDragging = false;

const POINT_RADIUS = 5;
const HIT_RADIUS = 12;

function clearMeasurement() {
  points = [];
  angleOutput.textContent = "";
  draggedPointIndex = -1;
  isDragging = false;
  redraw();
}

function angleFromThreePoints(A, B, C) {
  const v1x = A.x - B.x;
  const v1y = A.y - B.y;
  const v2x = C.x - B.x;
  const v2y = C.y - B.y;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);

  if (mag1 === 0 || mag2 === 0) return null;

  const dot = v1x * v2x + v1y * v2y;
  let cosTheta = dot / (mag1 * mag2);
  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(cosTheta) * (180 / Math.PI);
}

function drawPoint(point, label, isActive = false) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, POINT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? "orange" : "red";
  ctx.fill();

  ctx.font = "16px Arial";
  ctx.fillStyle = isActive ? "orange" : "red";
  ctx.fillText(label, point.x + 8, point.y - 8);
  ctx.restore();
}

function drawLine(p1, p2, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getCanvasCoordinates(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getPointAt(x, y) {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (Math.hypot(x - p.x, y - p.y) <= HIT_RADIUS) {
      return i;
    }
  }
  return -1;
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (img) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  for (let i = 0; i < points.length; i++) {
    drawPoint(points[i], String(i + 1), i === draggedPointIndex);
  }

  if (points.length >= 2) {
    drawLine(points[1], points[0], "blue");
  }

  if (points.length >= 3) {
    drawLine(points[1], points[2], "green");

    const angle = angleFromThreePoints(points[0], points[1], points[2]);

    if (angle === null || Number.isNaN(angle)) {
      angleOutput.textContent = "Invalid measurement";
      return;
    }

    const text = `Angle: ${angle.toFixed(2)}°`;
    angleOutput.textContent = text;

    ctx.save();
    ctx.font = "24px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(text, 20, 30);
    ctx.restore();
  }
}

function stopDragging() {
  if (!isDragging) return;

  isDragging = false;
  draggedPointIndex = -1;
  canvas.style.cursor = "crosshair";

  redraw();
}

imageInput.addEventListener("change", (e) => {
  uploadBigBtn.classList.add("d-none");
  UI.forEach((e) => e.classList.remove("d-none"));
  const file = e.target.files[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  const newImg = new Image();

  const MAX_WIDTH = 1000;
  const MAX_HEIGHT = 700;

  newImg.onerror = () => {
    URL.revokeObjectURL(objectUrl);
  };

  newImg.onload = () => {
    img = newImg;

    const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1);

    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    points = [];
    angleOutput.textContent = "";
    draggedPointIndex = -1;
    isDragging = false;

    redraw();
    URL.revokeObjectURL(objectUrl);
  };

  newImg.src = objectUrl;
});

canvas.addEventListener("pointerdown", (e) => {
  if (!img) return;

  const { x, y } = getCanvasCoordinates(e);
  const hitIndex = getPointAt(x, y);

  if (hitIndex !== -1) {
    draggedPointIndex = hitIndex;
    isDragging = true;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
    redraw();
    return;
  }

  if (points.length >= 3) return;

  const newPoint = { x, y };

  if (points.length >= 1 && distance(points[points.length - 1], newPoint) < 5) {
    return;
  }

  points.push(newPoint);

  redraw();
});

canvas.addEventListener("pointermove", (e) => {
  if (!img) return;

  const { x, y } = getCanvasCoordinates(e);

  if (isDragging && draggedPointIndex !== -1) {
    points[draggedPointIndex] = { x, y };
    canvas.style.cursor = "grabbing";
    redraw();
    return;
  }

  const hitIndex = getPointAt(x, y);
  canvas.style.cursor = hitIndex !== -1 ? "grab" : "crosshair";
});

imageInput.addEventListener("change", () => {
  if (!fileName) return;
  fileName.textContent = imageInput.files.length
    ? imageInput.files[0].name
    : "";
});

canvas.addEventListener("pointerup", stopDragging);
canvas.addEventListener("pointercancel", stopDragging);
resetBtn.addEventListener("click", clearMeasurement);

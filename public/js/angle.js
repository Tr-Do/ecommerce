const imageInput = document.getElementById("imageInput");
const statusEl = document.getElementById("status");
const angleOutput = document.getElementById("angleOutput");
const resetBtn = document.getElementById("resetBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let img = null;
let points = [];

function setStatus(message) {
  statusEl.textContent = message;
}

function clearMeasurement() {
  points = [];
  angleOutput.textContent = "";
  redraw();
  if (img) {
    setStatus("Click 3 points: 2 for line 1, 1 for line 2");
  } else {
    setStatus("Upload an image");
  }
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

  const angle = Math.acos(cosTheta) * (180 / Math.PI);

  return angle;
}

function drawPoint(point, label) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();

  ctx.font = "16px Arial";
  ctx.fillStyle = "red";
  ctx.fillText(label, point.x + 8, point.y - 8);
}

function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function drawLine(p1, p2, color) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
}
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (img) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  for (let i = 0; i < points.length; i++) {
    drawPoint(points[i], String(i + 1));
  }

  if (points.length >= 2) {
    drawLine(points[1], points[0], "blue");
  }

  if (points.length >= 3) {
    drawLine(points[1], points[2], "green");

    const angle = angleFromThreePoints(points[0], points[1], points[2]);

    console.log("points:", points);
    console.log("angle:", angle);
    console.log("angleOutput element:", angleOutput);

    if (angle === null || Number.isNaN(angle)) {
      angleOutput.textContent = "Invalid measurement";
      setStatus("One of the lines has zero length.");
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

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  const newImg = new Image();

  const MAX_WIDTH = 1000;
  const MAX_HEIGHT = 700;

  newImg.onerror = () => {
    setStatus("Failed to load image.");
    URL.revokeObjectURL(objectUrl);
  };

  newImg.onload = () => {
    img = newImg;

    const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1);

    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    points = [];
    angleOutput.textContent = "";
    setStatus("Click 3 points: 2 for line 1, 1 for line 2");
    redraw();
    URL.revokeObjectURL(objectUrl);
  };
  newImg.src = objectUrl;
});

canvas.addEventListener("click", (event) => {
  if (!img) return;
  if (points.length >= 3) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const newPoint = { x, y };

  if (points.length >= 1 && distance(points[points.length - 1], newPoint) < 5) {
    setStatus("Point is too close to the previous point");
    return;
  }

  points.push(newPoint);

  if (points.length < 3) {
    setStatus(`Point ${points.length} placed. ${3 - points.length} remaining.`);
  } else {
    setStatus("Measurement complete.");
  }

  redraw();
});

resetBtn.addEventListener("click", clearMeasurement);

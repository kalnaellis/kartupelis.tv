import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

const facts = [];
for (let r = 1; r <= 10; r++) {
  for (let c = 1; c <= 10; c++) facts.push({ r, c, value: r * c });
}

const steps = [
  { id: "diagnostic", title: "Warm-up check", text: "Start with a small pre-test. No drama. Just a baseline.", type: "quiz", count: 6, tip: "This first score is just your starting line." },
  { id: "map", title: "Meet the 10×10 map", text: "Each square is row × column. Click the exact fact.", type: "click", tasks: [{ r: 2, c: 4 }, { r: 5, c: 7 }, { r: 9, c: 3 }], tip: "Follow the row from the left and the column from the top. They meet at the answer." },
  { id: "twos", title: "Count by 2s", text: "The 2s row is full of doubles. Click the right facts.", type: "click", tasks: [{ r: 2, c: 3 }, { r: 2, c: 7 }, { r: 2, c: 9 }], tip: "2×7 is seven doubles: 2, 4, 6, 8, 10, 12, 14." },
  { id: "anchors", title: "Use 5s and 10s", text: "These are your anchor facts. They make harder ones easier.", type: "quiz", preset: [{ r: 5, c: 4 }, { r: 10, c: 6 }, { r: 5, c: 9 }, { r: 10, c: 3 }, { r: 5, c: 7 }], tip: "5s end with 0 or 5. 10s just add a zero." },
  { id: "squares", title: "Same × same", text: "Square facts live on the diagonal. Click the same-number facts.", type: "click", tasks: [{ r: 3, c: 3 }, { r: 6, c: 6 }, { r: 9, c: 9 }], tip: "If the row number equals the column number, it lands on the diagonal." },
  { id: "mirror", title: "Turn it around", text: "A fact and its flipped partner make the same answer.", type: "mirror", tasks: [{ from: { r: 3, c: 7 }, to: { r: 7, c: 3 } }, { from: { r: 4, c: 8 }, to: { r: 8, c: 4 } }, { from: { r: 2, c: 9 }, to: { r: 9, c: 2 } }], tip: "3×7 and 7×3 live in different places, but they match." },
  { id: "friends", title: "Easy-friend memory tricks", text: "Solve hard facts by leaning on easy neighbors.", type: "quiz", preset: [{ r: 6, c: 7, hint: "Think 5×7 + 1×7" }, { r: 8, c: 4, hint: "Think double of 4×4" }, { r: 9, c: 6, hint: "Think 10×6 − 1×6" }, { r: 7, c: 5, hint: "Use the 5s row" }], tip: "A clever shortcut is still a correct memory." },
  { id: "array", title: "Build rectangles", text: "Picture a rectangle from the top-left corner to the fact.", type: "click", tasks: [{ r: 4, c: 8 }, { r: 6, c: 3 }, { r: 7, c: 9 }, { r: 8, c: 4 }], tip: "The bottom-right corner of the rectangle tells the answer." },
  { id: "speed", title: "Speed practice", text: "Quick answers now. Beat the clock without panicking.", type: "quiz", count: 8, timed: 35, tip: "Use anchors first. Calm is faster than panic." },
  { id: "final", title: "Final check", text: "Time to compare the new score with the first score.", type: "quiz", count: 8, tip: "Same brain. Better map. Better result." }
];

const ui = {
  stepBadge: document.getElementById("stepBadge"),
  stageKicker: document.getElementById("stageKicker"),
  stageTitle: document.getElementById("stageTitle"),
  stageText: document.getElementById("stageText"),
  tipText: document.getElementById("tipText"),
  promptText: document.getElementById("promptText"),
  correctBadge: document.getElementById("correctBadge"),
  streakBadge: document.getElementById("streakBadge"),
  compareBadge: document.getElementById("compareBadge"),
  timerBadge: document.getElementById("timerBadge"),
  gridNote: document.getElementById("gridNote"),
  table: document.getElementById("table"),
  actionZone: document.getElementById("actionZone"),
  nextBtn: document.getElementById("nextBtn"),
  backBtn: document.getElementById("backBtn"),
  restartBtn: document.getElementById("restartBtn"),
  speakBtn: document.getElementById("speakBtn"),
  toast: document.getElementById("toast"),
  confetti: document.getElementById("confetti"),
  summaryModal: document.getElementById("summaryModal"),
  summaryTitle: document.getElementById("summaryTitle"),
  summaryScore: document.getElementById("summaryScore"),
  summaryCopy: document.getElementById("summaryCopy"),
  summaryBtn: document.getElementById("summaryBtn")
};

const state = {
  stepIndex: 0,
  totalCorrect: 0,
  totalAttempts: 0,
  streak: 0,
  preScore: 0,
  postScore: 0,
  questions: [],
  taskIndex: 0,
  stepCorrect: 0,
  stepDone: false,
  timerLeft: 0,
  timerId: null
};

const gridButtons = new Map();
const cubeMap = new Map();

function getKey(r, c) { return `${r}-${c}`; }
function getCell(r, c) { return gridButtons.get(getKey(r, c)); }
function fact(r, c) { return facts.find(f => f.r === r && f.c === c); }

function randomFact() {
  const pool = facts.filter(f => f.r >= 2 && f.c >= 2);
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeQuestion(base, hint = "") {
  const answer = base.value;
  const set = new Set([answer]);
  while (set.size < 4) {
    const delta = Math.floor(Math.random() * 9) - 4;
    const candidate = Math.max(1, Math.min(100, answer + delta * (Math.random() < 0.5 ? base.r : base.c)));
    if (candidate !== answer) set.add(candidate);
  }
  return {
    base,
    text: `${base.r} × ${base.c} = ?`,
    correct: answer,
    hint,
    options: [...set].sort(() => Math.random() - 0.5)
  };
}

function buildGrid() {
  ui.table.innerHTML = "";
  for (let r = 0; r <= 10; r++) {
    for (let c = 0; c <= 10; c++) {
      if (r === 0 && c === 0) {
        const d = document.createElement("div");
        d.className = "header-cell";
        d.textContent = "×";
        ui.table.appendChild(d);
        continue;
      }
      if (r === 0 || c === 0) {
        const d = document.createElement("div");
        d.className = "header-cell";
        d.textContent = r === 0 ? c : r;
        ui.table.appendChild(d);
        continue;
      }
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.textContent = r * c;
      btn.dataset.r = r;
      btn.dataset.c = c;
      btn.addEventListener("click", () => onGridClick(r, c));
      btn.addEventListener("mouseenter", () => onGridHover(r, c));
      btn.addEventListener("mouseleave", () => renderTask());
      ui.table.appendChild(btn);
      gridButtons.set(getKey(r, c), btn);
    }
  }
}

function clearGrid() {
  gridButtons.forEach(cell => cell.classList.remove("focus", "good", "bad", "dim", "rowcol", "rectangle", "diagonal"));
}

function pulse(el) {
  gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.22, ease: "back.out(1.8)" });
}

function showToast(text) {
  ui.toast.textContent = text;
  gsap.killTweensOf(ui.toast);
  gsap.set(ui.toast, { y: -8, opacity: 0 });
  gsap.to(ui.toast, { y: 0, opacity: 1, duration: 0.18 });
  gsap.to(ui.toast, { opacity: 0, duration: 0.35, delay: 0.9 });
}

function burst() {
  for (let i = 0; i < 16; i++) {
    const bit = document.createElement("div");
    bit.className = "bit";
    bit.style.left = `${45 + Math.random() * 10}%`;
    bit.style.top = `${44 + Math.random() * 8}%`;
    bit.style.background = ["#3559d8", "#3ca35d", "#efc94f", "#d95b55", "#9f7af1", "#56c7c2"][i % 6];
    ui.confetti.appendChild(bit);
    gsap.fromTo(bit, { x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }, {
      x: -130 + Math.random() * 260,
      y: -120 - Math.random() * 130,
      rotate: 180 + Math.random() * 180,
      scale: 1,
      opacity: 0,
      duration: 1,
      ease: "power2.out",
      onComplete: () => bit.remove()
    });
  }
}

function updateStats() {
  ui.correctBadge.textContent = `Correct ${state.totalCorrect} / ${state.totalAttempts}`;
  ui.streakBadge.textContent = `Streak ${state.streak}`;
  ui.compareBadge.textContent = `Before ${state.preScore} · After ${state.postScore}`;
}

function setStepMeta() {
  const step = steps[state.stepIndex];
  const level = state.stepIndex <= 2 ? 1 : state.stepIndex <= 6 ? 2 : 3;
  ui.stepBadge.textContent = `Step ${state.stepIndex + 1} / ${steps.length}`;
  ui.stageKicker.textContent = `Level ${level}`;
  ui.stageTitle.textContent = step.title;
  ui.stageText.textContent = step.text;
  ui.tipText.textContent = step.tip;
  ui.gridNote.textContent = step.type === "quiz" ? "Solve it, then see where it sits on the map" : "Click the right square in the 10×10 table";
}

function clearOptions() {
  ui.actionZone.innerHTML = "";
}

function rowColHighlight(r, c) {
  clearGrid();
  for (let i = 1; i <= 10; i++) {
    getCell(r, i)?.classList.add("rowcol");
    getCell(i, c)?.classList.add("rowcol");
  }
  getCell(r, c)?.classList.add("focus");
}

function rectangleHighlight(r, c) {
  clearGrid();
  for (let rr = 1; rr <= r; rr++) {
    for (let cc = 1; cc <= c; cc++) getCell(rr, cc)?.classList.add("rectangle");
  }
  getCell(r, c)?.classList.add("focus");
}

function diagonalHighlight() {
  clearGrid();
  for (let i = 1; i <= 10; i++) getCell(i, i)?.classList.add("diagonal");
}

function prepareQuiz() {
  const step = steps[state.stepIndex];
  state.questions = [];
  state.taskIndex = 0;
  state.stepCorrect = 0;
  const count = step.count || (step.preset ? step.preset.length : 0);
  if (step.preset) {
    step.preset.forEach(item => state.questions.push(makeQuestion(fact(item.r, item.c), item.hint || "")));
  } else {
    const seen = new Set();
    while (state.questions.length < count) {
      const q = randomFact();
      const key = getKey(q.r, q.c);
      if (seen.has(key)) continue;
      seen.add(key);
      state.questions.push(makeQuestion(q));
    }
  }
}

function renderQuiz() {
  const q = state.questions[state.taskIndex];
  clearOptions();
  rowColHighlight(q.base.r, q.base.c);
  scenePulse([[q.base.r, q.base.c]], 0xefc94f);
  ui.promptText.textContent = q.text;
  if (q.hint) ui.tipText.textContent = q.hint;
  q.options.forEach((value, index) => {
    const button = document.createElement("button");
    button.className = "option";
    button.innerHTML = `<div class="option-bar" style="background:${["#3559d8", "#3ca35d", "#efc94f", "#d95b55"][index % 4]}"></div><div class="option-word">${value}</div><div class="option-hint">option</div>`;
    button.addEventListener("click", () => answerQuiz(value, button));
    ui.actionZone.appendChild(button);
    gsap.fromTo(button, { y: 34, opacity: 0, rotate: index % 2 ? 3 : -3 }, { y: 0, opacity: 1, rotate: 0, duration: 0.28, delay: index * 0.04, ease: "back.out(1.7)" });
  });
}

function answerQuiz(value, button) {
  if (state.stepDone) return;
  const q = state.questions[state.taskIndex];
  state.totalAttempts++;
  if (value === q.correct) {
    state.stepCorrect++;
    state.totalCorrect++;
    state.streak++;
    button.classList.add("ok");
    getCell(q.base.r, q.base.c)?.classList.add("good");
    scenePulse([[q.base.r, q.base.c]], 0x3ca35d);
    burst();
    showToast("Correct!");
  } else {
    state.streak = 0;
    button.classList.add("no");
    getCell(q.base.r, q.base.c)?.classList.add("bad");
    scenePulse([[q.base.r, q.base.c]], 0xd95b55);
    showToast("Try again.");
    gsap.fromTo(button, { x: 0 }, { x: -6, duration: 0.05, repeat: 5, yoyo: true });
    [...ui.actionZone.children].forEach(el => {
      if (Number(el.querySelector(".option-word").textContent) === q.correct) el.classList.add("ok");
    });
  }
  updateStats();
  [...ui.actionZone.children].forEach(el => { if (el !== button && !el.classList.contains("ok")) el.classList.add("dim"); });
  setTimeout(() => {
    state.taskIndex++;
    if (state.taskIndex >= state.questions.length) completeStep();
    else renderQuiz();
  }, 700);
}

function renderClickTask() {
  const step = steps[state.stepIndex];
  const task = step.tasks[state.taskIndex];
  clearOptions();
  if (step.type === "mirror") {
    ui.promptText.textContent = `The highlighted fact is ${task.from.r} × ${task.from.c}. Click the flipped partner.`;
    rowColHighlight(task.from.r, task.from.c);
    getCell(task.from.r, task.from.c)?.classList.add("good");
    getCell(task.to.r, task.to.c)?.classList.add("focus");
    scenePulse([[task.from.r, task.from.c], [task.to.r, task.to.c]], 0x9f7af1);
  } else {
    ui.promptText.textContent = `Click the cell for ${task.r} × ${task.c}.`;
    if (step.id === "squares") {
      diagonalHighlight();
      getCell(task.r, task.c)?.classList.add("focus");
      scenePulse([[task.r, task.c]], 0x9f7af1);
    } else if (step.id === "array") {
      rectangleHighlight(task.r, task.c);
      scenePulse([[task.r, task.c]], 0x56c7c2);
    } else {
      rowColHighlight(task.r, task.c);
      scenePulse([[task.r, task.c]], 0xefc94f);
    }
  }
}

function onGridClick(r, c) {
  const step = steps[state.stepIndex];
  if (step.type === "quiz" || state.stepDone) return;
  const task = step.tasks[state.taskIndex];
  state.totalAttempts++;
  const correct = step.type === "mirror" ? (r === task.to.r && c === task.to.c) : (r === task.r && c === task.c);
  if (correct) {
    state.stepCorrect++;
    state.totalCorrect++;
    state.streak++;
    getCell(r, c)?.classList.add("good");
    if (step.id === "array") rectangleHighlight(task.r, task.c);
    scenePulse([[r, c]], 0x3ca35d);
    burst();
    showToast("Yes!");
  } else {
    state.streak = 0;
    getCell(r, c)?.classList.add("bad");
    scenePulse([[r, c]], 0xd95b55);
    showToast("Not that square.");
  }
  updateStats();
  setTimeout(() => {
    state.taskIndex++;
    if (state.taskIndex >= step.tasks.length) completeStep();
    else renderClickTask();
  }, 650);
}

function onGridHover(r, c) {
  const step = steps[state.stepIndex];
  if (step.type === "quiz" || state.stepDone || step.id === "array" || step.id === "squares") return;
  for (let i = 1; i <= 10; i++) {
    getCell(r, i)?.classList.add("rowcol");
    getCell(i, c)?.classList.add("rowcol");
  }
}

function startTimer(seconds) {
  stopTimer();
  state.timerLeft = seconds;
  ui.timerBadge.textContent = `Timer ${state.timerLeft}s`;
  state.timerId = setInterval(() => {
    state.timerLeft--;
    ui.timerBadge.textContent = `Timer ${state.timerLeft}s`;
    ui.timerBadge.classList.toggle("warn", state.timerLeft <= 10);
    if (state.timerLeft <= 0) {
      stopTimer();
      completeStep();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
  ui.timerBadge.textContent = "Timer —";
  ui.timerBadge.classList.remove("warn");
}

function renderTask() {
  const step = steps[state.stepIndex];
  if (step.type === "quiz") renderQuiz();
  else renderClickTask();
}

function completeStep() {
  state.stepDone = true;
  stopTimer();
  ui.nextBtn.disabled = state.stepIndex >= steps.length - 1;
  if (steps[state.stepIndex].id === "diagnostic") state.preScore = state.stepCorrect;
  if (steps[state.stepIndex].id === "final") state.postScore = state.stepCorrect;
  updateStats();
  gsap.fromTo(ui.nextBtn, { scale: 1 }, { scale: 1.08, duration: 0.3, yoyo: true, repeat: 3 });
  showToast("Step complete!");
  if (steps[state.stepIndex].id === "final") {
    setTimeout(showSummary, 700);
  }
}

function showSummary() {
  const diff = state.postScore - state.preScore;
  ui.summaryTitle.textContent = "Course complete!";
  ui.summaryScore.textContent = `Start score ${state.preScore} · Final score ${state.postScore}`;
  ui.summaryCopy.textContent = diff > 0 ? `You improved by ${diff} points. The map trick worked.` : "You found the facts that still need work. Useful, irritating, effective.";
  ui.summaryModal.classList.remove("hidden");
  gsap.fromTo(".modal", { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.7)" });
}

function startStep(index) {
  stopTimer();
  state.stepIndex = index;
  state.taskIndex = 0;
  state.stepCorrect = 0;
  state.stepDone = false;
  ui.nextBtn.disabled = true;
  ui.backBtn.disabled = index === 0;
  setStepMeta();
  clearGrid();
  clearOptions();
  resetSceneHighlights();
  if (steps[index].type === "quiz") prepareQuiz();
  if (steps[index].timed) startTimer(steps[index].timed);
  renderTask();
  gsap.fromTo(".left-panel", { x: -18, opacity: 0.6 }, { x: 0, opacity: 1, duration: 0.25, ease: "back.out(1.4)" });
}

function restartCourse() {
  state.totalCorrect = 0;
  state.totalAttempts = 0;
  state.streak = 0;
  state.preScore = 0;
  state.postScore = 0;
  updateStats();
  ui.summaryModal.classList.add("hidden");
  startStep(0);
}

ui.nextBtn.addEventListener("click", () => {
  if (state.stepIndex < steps.length - 1) startStep(state.stepIndex + 1);
});
ui.backBtn.addEventListener("click", () => {
  if (state.stepIndex > 0) startStep(state.stepIndex - 1);
});
ui.restartBtn.addEventListener("click", restartCourse);
ui.summaryBtn.addEventListener("click", restartCourse);
ui.speakBtn.addEventListener("click", () => {
  const step = steps[state.stepIndex];
  if (step.type === "quiz") {
    const q = state.questions[state.taskIndex];
    speak(`${q.base.r} times ${q.base.c}`, "en-US");
  } else if (step.type === "mirror") {
    const t = step.tasks[state.taskIndex];
    speak(`${t.from.r} times ${t.from.c}. Find ${t.to.r} times ${t.to.c}.`, "en-US");
  } else {
    const t = step.tasks[state.taskIndex];
    speak(`${t.r} times ${t.c}`, "en-US");
  }
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe8ff);
scene.fog = new THREE.Fog(0xcfe8ff, 10, 28);

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3.5, 14);
scene.add(new THREE.AmbientLight(0xffffff, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(4, 8, 5);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffefc4, 0.6);
fill.position.set(-6, 4, 2);
scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: 0xf0d7a3, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -4.6;
scene.add(floor);
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);
const baseColor = new THREE.Color(0x5ea8f5);
for (let r = 1; r <= 10; r++) {
  for (let c = 1; c <= 10; c++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.52, 0.52),
      new THREE.MeshStandardMaterial({
        color: baseColor.clone().offsetHSL(0, 0, (r + c) % 2 === 0 ? 0.02 : -0.02),
        roughness: 0.7,
        metalness: 0.06,
        emissive: 0x000000
      })
    );
    cube.position.set((c - 5.5) * 0.66, (5.5 - r) * 0.66, -1.8);
    cube.userData = { baseY: cube.position.y };
    cubeGroup.add(cube);
    cubeMap.set(getKey(r, c), cube);
  }
}

function resetSceneHighlights() {
  cubeMap.forEach(cube => {
    gsap.to(cube.scale, { x: 1, y: 1, z: 1, duration: 0.18 });
    gsap.to(cube.position, { z: -1.8, duration: 0.2 });
    cube.material.emissive.setHex(0x000000);
  });
}

function scenePulse(cells, color = 0xefc94f) {
  resetSceneHighlights();
  cells.forEach(([r, c]) => {
    const cube = cubeMap.get(getKey(r, c));
    if (!cube) return;
    cube.material.emissive.setHex(color);
    gsap.to(cube.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 0.18, yoyo: true, repeat: 1 });
    gsap.to(cube.position, { z: -1.2, duration: 0.2, yoyo: true, repeat: 1 });
  });
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  cubeGroup.rotation.y = Math.sin(t * 0.28) * 0.16;
  cubeGroup.rotation.x = Math.sin(t * 0.16) * 0.05;
  cubeMap.forEach(cube => {
    cube.position.y = cube.userData.baseY + Math.sin(t * 1.1 + cube.position.x * 0.7) * 0.03;
  });
  camera.position.x = Math.sin(t * 0.18) * 0.4;
  camera.lookAt(0, 0, -1.8);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

buildGrid();
updateStats();
startStep(0);
animate();

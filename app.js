/* ============================================================
   Root Quest — 語源で覚える英単語クイズ
   ============================================================ */

const STORAGE_KEY = "rootquest.progress.v1";
const MASTER_THRESHOLD = 100; // この正答率(%)以上で語根マスター

/* ---------- ローカルストレージ ---------- */

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data = JSON.parse(raw);
    return { ...defaultProgress(), ...data, roots: data.roots || {} };
  } catch (e) {
    return defaultProgress();
  }
}

function defaultProgress() {
  return {
    played: 0, // 総プレイ回数
    bestPercent: 0, // 全体での最高正答率
    roots: {}, // 語根ごとの記録 { [root]: { bestPercent, plays, mastered } }
  };
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    /* ストレージ不可でもゲームは継続 */
  }
}

let progress = loadProgress();

/* ---------- ユーティリティ ---------- */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  ["home", "quiz", "result"].forEach((s) => {
    $("screen-" + s).classList.toggle("hidden", s !== name);
  });
  window.scrollTo(0, 0);
}

/* ---------- 選択肢（誤答）の生成 ---------- */
// 同じ語根内の他の意味を優先して誤答に使い、足りなければ全体から補う
function buildChoices(group, correctWord) {
  const distractors = group.words
    .filter((w) => w.word !== correctWord.word && w.meaning !== correctWord.meaning)
    .map((w) => w.meaning);

  let pool = shuffle(distractors).slice(0, 3);

  if (pool.length < 3) {
    const others = [];
    VOCAB_DATA.forEach((g) => {
      g.words.forEach((w) => {
        if (
          w.meaning !== correctWord.meaning &&
          !pool.includes(w.meaning) &&
          !others.includes(w.meaning)
        ) {
          others.push(w.meaning);
        }
      });
    });
    pool = pool.concat(shuffle(others).slice(0, 3 - pool.length));
  }

  return shuffle([correctWord.meaning, ...pool]);
}

/* ---------- ホーム画面の描画 ---------- */

function renderHome() {
  progress = loadProgress();

  const masteredCount = Object.values(progress.roots).filter(
    (r) => r.mastered
  ).length;

  $("stat-played").textContent = progress.played;
  $("stat-best").textContent = progress.bestPercent + "%";
  $("stat-mastered").textContent = masteredCount;

  const list = $("root-list");
  list.innerHTML = "";

  VOCAB_DATA.forEach((group, index) => {
    const rec = progress.roots[group.root];
    const btn = document.createElement("button");
    btn.className = "root-item" + (rec && rec.mastered ? " mastered" : "");
    btn.innerHTML = `
      <span class="ri-root">${group.root}</span>
      <span class="ri-meaning">${group.rootMeaning}</span>
      <span class="ri-best">${
        rec ? "最高 " + rec.bestPercent + "%" : "未挑戦"
      }</span>
    `;
    btn.addEventListener("click", () => startQuiz(index));
    list.appendChild(btn);
  });
}

/* ---------- クイズ状態 ---------- */

let quiz = null;

function startQuiz(groupIndex) {
  const group = VOCAB_DATA[groupIndex];
  const questions = shuffle(group.words);

  quiz = {
    groupIndex,
    group,
    questions,
    current: 0,
    correct: 0,
    answers: [], // { word, meaning, note, chosen, isCorrect }
  };

  $("quiz-root").textContent = group.root;
  $("quiz-root-meaning").textContent = group.rootMeaning;
  $("quiz-root-origin").textContent = "語源: " + group.origin;
  $("quiz-root-label").textContent = `語根「${group.root}」`;
  $("q-total").textContent = questions.length;

  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const { questions, current, group } = quiz;
  const q = questions[current];

  $("q-current").textContent = current + 1;
  $("progress-fill").style.width =
    ((current) / questions.length) * 100 + "%";

  $("question-word").textContent = q.word;
  const noteEl = $("question-note");
  noteEl.textContent = "";
  noteEl.classList.remove("show");

  $("btn-next").classList.add("hidden");

  const choicesEl = $("choices");
  choicesEl.innerHTML = "";

  const choices = buildChoices(group, q);
  choices.forEach((meaning) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = meaning;
    btn.addEventListener("click", () => handleAnswer(btn, meaning, q));
    choicesEl.appendChild(btn);
  });
}

function handleAnswer(btn, chosenMeaning, question) {
  const isCorrect = chosenMeaning === question.meaning;
  const buttons = document.querySelectorAll(".choice");

  buttons.forEach((b) => {
    b.disabled = true;
    if (b.textContent === question.meaning) {
      b.classList.add("correct");
      b.innerHTML += '<span class="mark">✓</span>';
    } else if (b === btn && !isCorrect) {
      b.classList.add("wrong");
      b.innerHTML += '<span class="mark">✗</span>';
    }
  });

  // 語根の成り立ちを表示（学習効果アップ）
  const noteEl = $("question-note");
  noteEl.textContent = question.note || "";
  noteEl.classList.add("show");

  if (isCorrect) quiz.correct++;

  quiz.answers.push({
    word: question.word,
    meaning: question.meaning,
    note: question.note,
    chosen: chosenMeaning,
    isCorrect,
  });

  $("progress-fill").style.width =
    ((quiz.current + 1) / quiz.questions.length) * 100 + "%";

  const nextBtn = $("btn-next");
  nextBtn.textContent =
    quiz.current + 1 >= quiz.questions.length ? "結果を見る →" : "次へ →";
  nextBtn.classList.remove("hidden");
}

function nextQuestion() {
  quiz.current++;
  if (quiz.current >= quiz.questions.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

/* ---------- 結果と記録 ---------- */

function finishQuiz() {
  const total = quiz.questions.length;
  const correct = quiz.correct;
  const percent = Math.round((correct / total) * 100);

  // 記録更新
  progress.played += 1;
  if (percent > progress.bestPercent) progress.bestPercent = percent;

  const rootKey = quiz.group.root;
  const prevRec = progress.roots[rootKey] || {
    bestPercent: 0,
    plays: 0,
    mastered: false,
  };
  const newBest = Math.max(prevRec.bestPercent, percent);
  progress.roots[rootKey] = {
    bestPercent: newBest,
    plays: prevRec.plays + 1,
    mastered: prevRec.mastered || percent >= MASTER_THRESHOLD,
  };
  const justMastered = !prevRec.mastered && percent >= MASTER_THRESHOLD;

  saveProgress(progress);

  // 描画
  $("result-correct").textContent = correct;
  $("result-total").textContent = total;
  $("result-percent").textContent = `(${percent}%)`;

  let emoji, title, message;
  if (percent === 100) {
    emoji = "🏆";
    title = "パーフェクト！";
    message = "全問正解です。この語根はバッチリですね。";
  } else if (percent >= 60) {
    emoji = "🎉";
    title = "よくできました！";
    message = "もう少しで全問正解。間違えた単語を復習しましょう。";
  } else {
    emoji = "💪";
    title = "これから！";
    message = "語根のイメージを意識して、もう一度挑戦してみましょう。";
  }
  $("result-emoji").textContent = emoji;
  $("result-title").textContent = title;
  $("result-message").textContent = message;
  $("result-badge").classList.toggle("hidden", !justMastered);

  // 復習リスト
  const reviewEl = $("review-list");
  reviewEl.innerHTML = "";
  quiz.answers.forEach((a) => {
    const item = document.createElement("div");
    item.className = "review-item " + (a.isCorrect ? "ok" : "ng");
    item.innerHTML = `
      <div class="review-word">${a.word}
        <span class="ri-mark">${a.isCorrect ? "✓" : "✗"}</span>
      </div>
      <div class="review-meaning">${a.meaning}</div>
      <div class="review-note">${a.note || ""}</div>
    `;
    reviewEl.appendChild(item);
  });

  showScreen("result");
}

/* ---------- イベント登録 ---------- */

function init() {
  renderHome();

  $("btn-random").addEventListener("click", () => {
    const idx = Math.floor(Math.random() * VOCAB_DATA.length);
    startQuiz(idx);
  });

  $("btn-reset").addEventListener("click", () => {
    if (confirm("学習記録をすべて削除します。よろしいですか？")) {
      localStorage.removeItem(STORAGE_KEY);
      progress = defaultProgress();
      renderHome();
    }
  });

  $("btn-next").addEventListener("click", nextQuestion);

  $("btn-quit").addEventListener("click", () => {
    showScreen("home");
    renderHome();
  });

  $("btn-retry").addEventListener("click", () => {
    startQuiz(quiz.groupIndex);
  });

  $("btn-home").addEventListener("click", () => {
    showScreen("home");
    renderHome();
  });
}

document.addEventListener("DOMContentLoaded", init);

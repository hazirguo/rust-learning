'use strict';

/* Rust 自学站：纯静态前端，数据来自 data/lessons.json，进度存 localStorage */

var TOTAL_DAYS = 84;
var START = { y: 2026, m: 9, d: 26 }; // 2026-10-26 为第 1 天（m 为 0 起）
var LS_CHECKLIST = 'rust-learning.checklist.v1';
var LS_COMPLETED = 'rust-learning.completed.v1';

var DATA = null;
var codeSnippets = []; // 当前课程页的代码块原文，供复制按钮按序号取用

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* 轻量行内格式：先转义，再处理 **粗体** 与 `代码` */
function inline(s) {
  var t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

function readJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 忽略隐私模式等写入失败 */ }
}

function getChecklistState() { return readJSON(LS_CHECKLIST, {}); }
function getCompletedState() { return readJSON(LS_COMPLETED, {}); }

function expectedDay() {
  var start = new Date(START.y, START.m, START.d);
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var diff = Math.round((today - start) / 86400000) + 1;
  if (diff < 0) return 0;
  if (diff > TOTAL_DAYS) return TOTAL_DAYS;
  return diff;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function sortedLessons() {
  return DATA.lessons.slice().sort(function (a, b) { return a.dayNumber - b.dayNumber; });
}

function lessonByDay(day) {
  for (var i = 0; i < DATA.lessons.length; i++) {
    if (DATA.lessons[i].dayNumber === day) return DATA.lessons[i];
  }
  return null;
}

function weekByNumber(n) {
  for (var i = 0; i < DATA.weeks.length; i++) {
    if (DATA.weeks[i].weekNumber === n) return DATA.weeks[i];
  }
  return null;
}

/* ---------- 内容块渲染 ---------- */

function renderBlock(block) {
  switch (block.kind) {
    case 'heading':
      return '<h3>' + inline(block.text) + '</h3>';
    case 'paragraph':
      return '<p>' + inline(block.text) + '</p>';
    case 'bullets':
      return '<ul>' + block.items.map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + '</ul>';
    case 'callout':
      return '<aside class="callout">' + inline(block.text) + '</aside>';
    case 'code': {
      var idx = codeSnippets.length;
      codeSnippets.push(block.code || '');
      var caption = block.caption ? '<span>' + esc(block.caption) + '</span>' : '<span>' + esc(block.lang || 'code') + '</span>';
      return '<div class="codeblock"><div class="codeblock-head">' + caption +
        '<button type="button" class="copy-btn" data-code-idx="' + idx + '">复制</button></div>' +
        '<pre><code>' + esc(block.code) + '</code></pre></div>';
    }
    case 'timeTable': {
      var rows = block.rows.map(function (r) {
        return '<tr><td>' + inline(r.label) + '</td><td class="minutes">' + inline(r.minutes) + '</td><td>' + inline(r.detail) + '</td></tr>';
      }).join('');
      return '<div class="table-wrap"><table class="tt"><thead><tr><th>环节</th><th>时间</th><th>做什么</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    case 'practice': {
      var steps = block.steps.map(function (s) { return '<li>' + inline(s) + '</li>'; }).join('');
      var verify = block.verification ? '<p class="verify"><b>验收方式：</b>' + inline(block.verification) + '</p>' : '';
      return '<section class="practice"><h3>跟练任务</h3><ol>' + steps + '</ol>' + verify + '</section>';
    }
    default:
      return '';
  }
}

/* ---------- 首页 ---------- */

function renderHome(app) {
  var lessons = sortedLessons();
  var published = lessons.length;
  var exp = expectedDay();
  var completedMap = getCompletedState();
  var completedCount = lessons.filter(function (l) { return completedMap[l.dayNumber]; }).length;
  var pct = Math.round((published / TOTAL_DAYS) * 100);

  var todayLesson = exp >= 1 ? lessonByDay(exp) : null;
  if (!todayLesson && lessons.length) todayLesson = lessons[lessons.length - 1];
  var todayBtn = todayLesson
    ? '<a class="btn" href="#/day/' + todayLesson.dayNumber + '">开始今天这一课：第 ' + todayLesson.dayNumber + ' 天 · ' + esc(todayLesson.title) + '</a>'
    : '';

  var heroDay = exp >= 1 ? exp : (published ? lessons[lessons.length - 1].dayNumber : 0);

  var html = '';
  html += '<section class="hero">';
  html += '<p class="hero-day">' + pad2(heroDay) + '<span class="of"> / ' + TOTAL_DAYS + ' 天</span></p>';
  html += '<p class="hero-sub">按每天约 1 小时的节奏，从所有权一路学到能读 Firecracker / Cloud Hypervisor 源码、能写 async 网关和极简 Agent 沙箱运行器。</p>';
  html += '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
  html += '<p class="progress-note">已发布 ' + published + ' / ' + TOTAL_DAYS + ' 课 · 按计划今天应学第 ' + exp + ' 天 · 已标记完成 ' + completedCount + ' 课</p>';
  html += todayBtn;
  html += '</section>';

  /* 按周分组的课程列表 */
  html += '<h2 class="section-title">全部课程</h2>';
  if (!lessons.length) html += '<p>还没有已发布的课程。</p>';
  var weeksWithLessons = DATA.weeks.filter(function (w) {
    return lessons.some(function (l) { return l.weekNumber === w.weekNumber; });
  });
  weeksWithLessons.forEach(function (w) {
    html += '<div class="week-group"><h3>第 ' + w.weekNumber + ' 周 · ' + esc(w.title) + '<span>' + esc(w.dateRange) + '</span></h3>';
    lessons.filter(function (l) { return l.weekNumber === w.weekNumber; }).forEach(function (l) {
      var done = !!completedMap[l.dayNumber];
      html += '<a class="lesson-card" href="#/day/' + l.dayNumber + '">' +
        '<span class="day-badge"><b>' + l.dayNumber + '</b><small>DAY</small></span>' +
        '<span class="lc-main"><span class="lc-title">' + esc(l.title) + '</span>' +
        '<span class="lc-sum" style="display:block">' + esc(l.summary || '') + '</span></span>' +
        '<span class="lc-state' + (done ? '' : ' todo') + '">' + (done ? '已完成' : '未完成') + '</span></a>';
    });
    html += '</div>';
  });

  /* 12 周路线图 */
  html += '<h2 class="section-title">12 周路线图</h2><div class="roadmap">';
  DATA.weeks.forEach(function (w) {
    html += '<article class="week-card"><h3>第 ' + w.weekNumber + ' 周 · ' + esc(w.title) + '</h3>' +
      '<p class="wk-range">' + esc(w.dateRange) + '</p><ul>' +
      w.topics.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') +
      '</ul>' +
      (w.project ? '<p class="wk-line"><b>项目：</b>' + inline(w.project) + '</p>' : '') +
      (w.acceptance ? '<p class="wk-line"><b>验收：</b>' + inline(w.acceptance) + '</p>' : '') +
      '</article>';
  });
  html += '</div>';

  app.innerHTML = html;
  updateHeaderProgress(published, completedCount);
}

function updateHeaderProgress(published, completedCount) {
  var el = document.getElementById('header-progress');
  if (el) el.textContent = '已发布 ' + published + ' / ' + TOTAL_DAYS + ' 课 · 已完成 ' + completedCount + ' 课';
}

/* ---------- 课程页 ---------- */

function renderLesson(app, day) {
  var lesson = lessonByDay(day);
  if (!lesson) {
    app.innerHTML = '<p class="back-link"><a href="#/">← 回到首页</a></p><p class="error-box">第 ' + day + ' 天的课程还没有发布。</p>';
    return;
  }
  codeSnippets = [];
  var week = weekByNumber(lesson.weekNumber);
  var completedMap = getCompletedState();
  var done = !!completedMap[lesson.dayNumber];
  var checkState = getChecklistState()[lesson.dayNumber] || [];

  var html = '';
  html += '<a class="back-link" href="#/">← 全部课程</a>';
  html += '<section class="lesson-head">';
  html += '<p class="lesson-meta">第 ' + lesson.dayNumber + ' 天 / 共 ' + TOTAL_DAYS + ' 天 · 第 ' + lesson.weekNumber + ' 周' +
    (week ? ' · ' + esc(week.title) : '') + ' · ' + esc(lesson.lessonDate) + '</p>';
  html += '<h1>' + esc(lesson.title) + '</h1>';
  if (lesson.summary) html += '<p class="hero-sub">' + esc(lesson.summary) + '</p>';
  if (lesson.goal) html += '<div class="lesson-goal"><b>今日目标：</b>' + inline(lesson.goal) + '</div>';
  html += '</section>';

  html += '<div class="lesson-body">';
  html += (lesson.body || []).map(renderBlock).join('');
  html += '</div>';

  /* 自测题 */
  if (lesson.quiz && lesson.quiz.length) {
    html += '<h2 class="section-title">自测题</h2>';
    lesson.quiz.forEach(function (item, i) {
      html += '<div class="quiz-item" id="quiz-' + i + '"><p class="q">' + (i + 1) + '. ' + inline(item.q) + '</p>' +
        '<button type="button" class="quiz-toggle" data-quiz="' + i + '">查看答案</button>' +
        '<div class="a">' + inline(item.a) + '</div></div>';
    });
  }

  /* 验收清单 */
  if (lesson.checklist && lesson.checklist.length) {
    html += '<h2 class="section-title">今日验收清单</h2><ul class="check-list">';
    lesson.checklist.forEach(function (text, i) {
      var checked = !!checkState[i];
      html += '<li><label><input type="checkbox" data-check="' + i + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="' + (checked ? 'done-text' : '') + '">' + inline(text) + '</span></label></li>';
    });
    html += '</ul>';
  }

  html += '<div class="complete-row"><button type="button" class="btn' + (done ? ' ghost' : '') + '" id="complete-btn">' +
    (done ? '取消标记完成' : '标记本课完成') + '</button>' +
    (done ? '<span class="complete-note">本课已完成 ✓</span>' : '') + '</div>';

  /* 上一课 / 下一课 */
  var lessons = sortedLessons();
  var idx = -1;
  lessons.forEach(function (l, i) { if (l.dayNumber === day) idx = i; });
  var prev = idx > 0 ? lessons[idx - 1] : null;
  var next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
  html += '<nav class="lesson-nav">';
  html += prev
    ? '<a class="btn ghost" href="#/day/' + prev.dayNumber + '">← 上一课：第 ' + prev.dayNumber + ' 天</a>'
    : '<button type="button" class="btn ghost" disabled>← 上一课</button>';
  html += next
    ? '<a class="btn ghost" href="#/day/' + next.dayNumber + '">下一课：第 ' + next.dayNumber + ' 天 →</a>'
    : '<button type="button" class="btn ghost" disabled>下一课 →</button>';
  html += '</nav>';

  app.innerHTML = html;
  bindLessonEvents(lesson);
  window.scrollTo(0, 0);
}

function bindLessonEvents(lesson) {
  /* 复制按钮 */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = codeSnippets[Number(btn.getAttribute('data-code-idx'))] || '';
      function done() {
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = '复制'; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done, function () { fallbackCopy(code); done(); });
      } else {
        fallbackCopy(code); done();
      }
    });
  });

  /* 自测题答案展开 */
  document.querySelectorAll('.quiz-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = document.getElementById('quiz-' + btn.getAttribute('data-quiz'));
      if (!item) return;
      var open = item.classList.toggle('open');
      btn.textContent = open ? '收起答案' : '查看答案';
    });
  });

  /* 验收清单勾选 */
  document.querySelectorAll('[data-check]').forEach(function (box) {
    box.addEventListener('change', function () {
      var all = getChecklistState();
      var arr = all[lesson.dayNumber] || [];
      arr[Number(box.getAttribute('data-check'))] = box.checked;
      all[lesson.dayNumber] = arr;
      writeJSON(LS_CHECKLIST, all);
      var span = box.parentElement.querySelector('span');
      if (span) span.className = box.checked ? 'done-text' : '';
    });
  });

  /* 标记完成 */
  var completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', function () {
      var all = getCompletedState();
      if (all[lesson.dayNumber]) delete all[lesson.dayNumber];
      else all[lesson.dayNumber] = true;
      writeJSON(LS_COMPLETED, all);
      render(); // 重新渲染当前视图，刷新状态
    });
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
  document.body.removeChild(ta);
}

/* ---------- 路由与启动 ---------- */

function render() {
  var app = document.getElementById('app');
  if (!DATA) return;
  var hash = window.location.hash || '#/';
  var m = hash.match(/^#\/day\/(\d+)$/);
  if (m) renderLesson(app, Number(m[1]));
  else renderHome(app);
}

function boot() {
  var app = document.getElementById('app');
  fetch('data/lessons.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      DATA = data;
      render();
    })
    .catch(function (err) {
      app.innerHTML = '<p class="error-box">课程数据加载失败（' + esc(err.message) + '）。请通过本地服务器或 GitHub Pages 打开本页，直接双击文件时浏览器会拦截数据读取。</p>';
    });
}

window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', boot);

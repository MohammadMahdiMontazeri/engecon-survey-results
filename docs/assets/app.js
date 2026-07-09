
const fmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Cannot load ${path}`);
  return await res.json();
}

function byId(id) {
  return document.getElementById(id);
}

function groupLabel(g) {
  return "گروه " + fmt.format(Number(String(g).replace("G", "")));
}

function val(x) {
  return x === null || x === undefined || x === "" ? "—" : fmt.format(x);
}

function shortTopic(topic) {
  return topic && topic.trim() ? topic : "بدون عنوان";
}

function setupLogo() {
  const logoBox = document.querySelector(".logo");
  if (!logoBox) return;

  const img = new Image();
  img.onload = () => {
    logoBox.innerHTML = "";
    logoBox.appendChild(img);
  };
  img.onerror = () => {};
  img.src = "assets/logo.png";
}

async function initHome() {
  setupLogo();
  const config = await loadJSON("data/site_config.json");

  byId("siteTitle").textContent = config.site_title;
  byId("courseName").textContent = config.course_name;
  byId("term").textContent = config.term;
  byId("university").textContent = config.university;
  byId("faculty").textContent = config.faculty;
  byId("instructor").textContent = config.instructor;
  byId("projectManager").textContent = config.project_manager;
  byId("description").textContent = config.description;
}

function participationCell(row, g) {
  if (row.own_group === g) {
    return `<span class="badge own">گروه خود فرد</span>`;
  }

  return Number(row.groups[g]) === 1
    ? `<span class="badge ok">ثبت شده</span>`
    : `<span class="badge no">ثبت نشده</span>`;
}

async function initIndividual() {
  setupLogo();

  const db = await loadJSON("data/individual_participation.json");
  const rows = db.rows || [];
  const groups = db.groups || [];

  const tbody = byId("individualBody");
  const input = byId("studentSearch");

  function render(filteredRows) {
    tbody.innerHTML = "";

    if (!filteredRows.length) {
      tbody.innerHTML = `<tr><td colspan="${groups.length + 5}" class="empty">موردی پیدا نشد.</td></tr>`;
      return;
    }

    for (const row of filteredRows) {
      const gCells = groups.map(g => `<td>${participationCell(row, g)}</td>`).join("");

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td><strong>${row.student_id}</strong></td>
          <td>${row.own_group || "—"}</td>
          ${gCells}
          <td><strong>${fmt.format(row.participation_count)}</strong></td>
          <td><span class="grade-pill">${fmt.format(row.participation_grade_percent)}</span></td>
        </tr>
      `);
    }
  }

  const header = byId("individualHeader");
  header.innerHTML = `
    <tr>
      <th>شماره دانشجویی</th>
      <th>گروه فرد</th>
      ${groups.map(g => `<th>${g}</th>`).join("")}
      <th>تعداد مشارکت</th>
      <th>نمره مشارکت از ۳۰</th>
    </tr>
  `;

  function applySearch() {
    const q = input.value.trim();
    const filtered = q
      ? rows.filter(r => String(r.student_id).includes(q))
      : rows;
    render(filtered);
  }

  input.addEventListener("input", applySearch);
  render(rows);
}

function statBlock(indicator) {
  return `
    <div class="stat-cell">
      <div class="stat-main">میانگین: ${val(indicator.mean)}</div>
      <div class="stat-sub">انحراف معیار: ${val(indicator.std)}</div>
    </div>
  `;
}

async function initGroupStats() {
  setupLogo();

  const db = await loadJSON("data/group_statistics.json");
  const rows = db.rows || [];
  const tbody = byId("statsBody");

  for (const row of rows) {
    const i1 = row.indicators.data_real;
    const i2 = row.indicators.presentation_quality;
    const i3 = row.indicators.persuasion;

    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>
          <strong>${groupLabel(row.group)}</strong>
          <br>
          <small>${shortTopic(row.topic)}</small>
        </td>
        <td class="indicator-col">${statBlock(i1)}</td>
        <td class="indicator-col">${statBlock(i2)}</td>
        <td class="indicator-col">${statBlock(i3)}</td>
      </tr>
    `);
  }
}

async function initComments() {
  setupLogo();

  const db = await loadJSON("data/group_comments.json");
  const rows = db.rows || [];
  const groupGrid = byId("groupGrid");
  const detail = byId("commentDetail");

  for (const row of rows) {
    const btn = document.createElement("button");
    btn.className = "group-button";
    btn.innerHTML = `<strong>${groupLabel(row.group)}</strong><span>${shortTopic(row.topic)}</span>`;
    btn.addEventListener("click", () => renderGroup(row.group));
    groupGrid.appendChild(btn);
  }

  function renderGroup(groupId) {
    const row = rows.find(r => r.group === groupId);
    if (!row) return;

    let commentsHTML = "";

    if (!row.comments || !row.comments.length) {
      commentsHTML = `<div class="empty">نظری ثبت نشده است.</div>`;
    } else {
      commentsHTML = row.comments.map((c, i) => `
        <div class="comment-row">
          <div class="comment-index">نظر ${fmt.format(i + 1)}</div>

          <div class="comment-box">
            <div class="comment-title">نقطه قوت</div>
            ${c.strength && c.strength.trim() ? c.strength : "—"}
          </div>

          <div class="comment-box">
            <div class="comment-title">نقطه ضعف</div>
            ${c.weakness && c.weakness.trim() ? c.weakness : "—"}
          </div>
        </div>
      `).join("");
    }

    detail.innerHTML = `
      <div class="card">
        <h2>${groupLabel(row.group)}</h2>
        <p class="lead">${shortTopic(row.topic)}</p>
      </div>

      <div class="card privacy-note-card">
        <p>
          در راستای حفظ حریم شخصی شرکت‌کنندگان، ترتیب نظرات به‌صورت کاملاً به‌هم‌ریخته نمایش داده شده است
          و هیچ ارتباطی با ترتیب نام، شماره دانشجویی یا ترتیب ثبت پاسخ افراد ندارد.
        </p>
      </div>

      <div class="card">
        <div class="comments-table">
          ${commentsHTML}
        </div>
      </div>
    `;

    history.replaceState(null, "", `comments.html?group=${groupId}`);
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const params = new URLSearchParams(location.search);
  const groupParam = params.get("group");

  if (groupParam && rows.some(r => r.group === groupParam)) {
    renderGroup(groupParam);
  }
}

// PATCH_V2_START

function normalizeSearchDigitsV2(value) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  let s = String(value ?? "");

  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(fa[i], String(i));
    s = s.replaceAll(ar[i], String(i));
  }

  return s.trim();
}

function participationCellV2(row, g) {
  if (row.own_group === g) {
    return `<span class="badge own">گروه خود فرد</span>`;
  }

  return Number(row.groups[g]) === 1
    ? `<span class="badge ok">ثبت شده</span>`
    : `<span class="badge no">ثبت نشده</span>`;
}

/* نسخه اصلاح‌شده صفحه نمرات فردی:
   - سرچ با اعداد فارسی و انگلیسی
   - گروه خود فرد با متن جداگانه
*/
async function initIndividual() {
  setupLogo();

  const db = await loadJSON("data/individual_participation.json");
  const rows = db.rows || [];
  const groups = db.groups || [];

  const tbody = byId("individualBody");
  const input = byId("studentSearch");

  function render(filteredRows) {
    tbody.innerHTML = "";

    if (!filteredRows.length) {
      tbody.innerHTML = `<tr><td colspan="${groups.length + 5}" class="empty">موردی پیدا نشد.</td></tr>`;
      return;
    }

    for (const row of filteredRows) {
      const gCells = groups.map(g => `<td>${participationCellV2(row, g)}</td>`).join("");

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td><strong>${row.student_id}</strong></td>
          <td>${row.own_group || "—"}</td>
          ${gCells}
          <td><strong>${fmt.format(row.participation_count)}</strong></td>
          <td><span class="grade-pill">${fmt.format(row.participation_grade_percent)}</span></td>
        </tr>
      `);
    }
  }

  const header = byId("individualHeader");
  header.innerHTML = `
    <tr>
      <th>شماره دانشجویی</th>
      <th>گروه فرد</th>
      ${groups.map(g => `<th>${g}</th>`).join("")}
      <th>تعداد مشارکت</th>
      <th>نمره مشارکت از ۳۰</th>
    </tr>
  `;

  function applySearch() {
    const q = normalizeSearchDigitsV2(input.value);
    const filtered = q
      ? rows.filter(r => normalizeSearchDigitsV2(r.student_id).includes(q))
      : rows;

    render(filtered);
  }

  input.addEventListener("input", applySearch);
  render(rows);
}

function statBlockV2(indicator) {
  return `
    <div class="stat-cell">
      <div class="stat-main">میانگین: ${val(indicator.mean)}</div>
      <div class="stat-sub">انحراف معیار: ${val(indicator.std)}</div>
    </div>
  `;
}

function getMetricMeanV2(row, metricKey) {
  const v = row?.indicators?.[metricKey]?.mean;
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function getMetricStdV2(row, metricKey) {
  const v = row?.indicators?.[metricKey]?.std;
  return v === null || v === undefined || v === "" ? null : Number(v);
}

/* نسخه اصلاح‌شده صفحه نمرات گروهی:
   - سورت پیش‌فرض بر اساس شماره گروه
   - سورت هر معیار بر اساس میانگین بیشتر
   - اگر میانگین برابر بود، انحراف معیار کمتر بهتر است
*/
async function initGroupStats() {
  setupLogo();

  const db = await loadJSON("data/group_statistics.json");
  const originalRows = db.rows || [];
  const tbody = byId("statsBody");

  const table = tbody.closest("table");
  if (table) {
    table.classList.add("group-stats-table");

    const thead = table.querySelector("thead");
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>
            <button class="sort-head active" data-sort="group">
              گروه <span class="sort-icon">↑</span>
            </button>
          </th>
          <th>
            <button class="sort-head" data-sort="data_real">
              اتکا به داده‌های واقعی <span class="sort-icon">↕</span>
            </button>
          </th>
          <th>
            <button class="sort-head" data-sort="presentation_quality">
              کیفیت ارائه و کار تیمی <span class="sort-icon">↕</span>
            </button>
          </th>
          <th>
            <button class="sort-head" data-sort="persuasion">
              قدرت متقاعدسازی و ارزیابی کلی <span class="sort-icon">↕</span>
            </button>
          </th>
        </tr>
      `;
    }
  }

  let sortKey = "group";

  function sortRows(rows) {
    const copied = [...rows];

    if (sortKey === "group") {
      copied.sort((a, b) => Number(a.group_number) - Number(b.group_number));
      return copied;
    }

    copied.sort((a, b) => {
      const meanA = getMetricMeanV2(a, sortKey);
      const meanB = getMetricMeanV2(b, sortKey);

      if (meanA === null && meanB !== null) return 1;
      if (meanA !== null && meanB === null) return -1;
      if (meanA !== null && meanB !== null && meanB !== meanA) {
        return meanB - meanA;
      }

      const stdA = getMetricStdV2(a, sortKey);
      const stdB = getMetricStdV2(b, sortKey);

      if (stdA === null && stdB !== null) return 1;
      if (stdA !== null && stdB === null) return -1;
      if (stdA !== null && stdB !== null && stdA !== stdB) {
        return stdA - stdB;
      }

      return Number(a.group_number) - Number(b.group_number);
    });

    return copied;
  }

  function updateHeaderState() {
    document.querySelectorAll(".sort-head").forEach(btn => {
      const key = btn.dataset.sort;
      btn.classList.toggle("active", key === sortKey);

      const icon = btn.querySelector(".sort-icon");
      if (!icon) return;

      if (key === sortKey) {
        icon.textContent = key === "group" ? "↑" : "↓";
      } else {
        icon.textContent = "↕";
      }
    });
  }

  function render() {
    const rows = sortRows(originalRows);
    tbody.innerHTML = "";

    for (const row of rows) {
      const i1 = row.indicators.data_real;
      const i2 = row.indicators.presentation_quality;
      const i3 = row.indicators.persuasion;

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>
            <strong>${groupLabel(row.group)}</strong>
            <br>
            <small>${shortTopic(row.topic)}</small>
          </td>
          <td class="indicator-col">${statBlockV2(i1)}</td>
          <td class="indicator-col">${statBlockV2(i2)}</td>
          <td class="indicator-col">${statBlockV2(i3)}</td>
        </tr>
      `);
    }

    updateHeaderState();
  }

  document.querySelectorAll(".sort-head").forEach(btn => {
    btn.addEventListener("click", () => {
      sortKey = btn.dataset.sort;
      render();
    });
  });

  render();
}

// PATCH_V2_END

// PATCH_V4_FLOATING_HEADERS_START

function setupFloatingTableHeadersV4() {
  document.querySelectorAll(".floating-table-header").forEach(x => x.remove());

  const nav = document.querySelector(".nav");
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;

  const wrappers = Array.from(document.querySelectorAll(".table-wrap"));

  const instances = wrappers.map((wrap) => {
    const table = wrap.querySelector("table");
    const thead = table ? table.querySelector("thead") : null;

    if (!table || !thead) return null;

    const floating = document.createElement("div");
    floating.className = "floating-table-header";

    const clonedTable = document.createElement("table");
    const clonedThead = thead.cloneNode(true);

    clonedTable.appendChild(clonedThead);
    floating.appendChild(clonedTable);
    document.body.appendChild(floating);

    function syncWidths() {
      const originalCells = Array.from(thead.querySelectorAll("th"));
      const clonedCells = Array.from(clonedThead.querySelectorAll("th"));

      clonedTable.style.width = `${table.getBoundingClientRect().width}px`;

      originalCells.forEach((cell, i) => {
        if (!clonedCells[i]) return;
        const w = cell.getBoundingClientRect().width;
        clonedCells[i].style.width = `${w}px`;
        clonedCells[i].style.minWidth = `${w}px`;
        clonedCells[i].style.maxWidth = `${w}px`;
      });
    }

    function update() {
      const wrapRect = wrap.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const theadRect = thead.getBoundingClientRect();

      const topOffset = navHeight;
      const shouldShow =
        tableRect.top < topOffset &&
        tableRect.bottom > topOffset + theadRect.height + 12 &&
        wrapRect.bottom > topOffset + theadRect.height + 12;

      if (!shouldShow) {
        floating.style.display = "none";
        return;
      }

      syncWidths();

      floating.style.display = "block";
      floating.style.top = `${topOffset}px`;
      floating.style.left = `${wrapRect.left}px`;
      floating.style.width = `${wrapRect.width}px`;

      clonedTable.style.transform = `translateX(${-wrap.scrollLeft}px)`;
      clonedTable.style.transformOrigin = "top left";
    }

    wrap.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    setTimeout(update, 50);
    setTimeout(update, 300);

    return { wrap, table, thead, floating, update };
  }).filter(Boolean);

  window.__floatingTableHeaderInstancesV4 = instances;

  requestAnimationFrame(() => {
    instances.forEach(i => i.update());
  });
}

/* 
  تابع‌های قبلی را wrap می‌کنیم تا بعد از render شدن جدول‌ها،
  هدر شناور ساخته شود.
*/
if (typeof initIndividual === "function" && !window.__wrappedInitIndividualV4) {
  const oldInitIndividualV4 = initIndividual;
  window.__wrappedInitIndividualV4 = true;

  initIndividual = async function() {
    await oldInitIndividualV4();
    setTimeout(setupFloatingTableHeadersV4, 100);
  };
}

if (typeof initGroupStats === "function" && !window.__wrappedInitGroupStatsV4) {
  const oldInitGroupStatsV4 = initGroupStats;
  window.__wrappedInitGroupStatsV4 = true;

  initGroupStats = async function() {
    await oldInitGroupStatsV4();
    setTimeout(setupFloatingTableHeadersV4, 100);
  };
}

window.addEventListener("load", () => {
  setTimeout(setupFloatingTableHeadersV4, 250);
});

// PATCH_V4_FLOATING_HEADERS_END

// PATCH_V7_GROUP_FINAL_LAYOUT_START

function groupAwardHTMLV7(row) {
  const level = row.award_level || "basic";

  if (level === "gold") {
    return `<span class="award-icon-only award-gold" title="جایگاه اول">🏆</span>`;
  }

  if (level === "silver") {
    return `<span class="award-icon-only award-silver" title="جایگاه دوم">🥈</span>`;
  }

  if (level === "bronze") {
    return `<span class="award-icon-only award-bronze" title="جایگاه سوم">🥉</span>`;
  }

  return `<span class="award-empty"></span>`;
}

function groupGradeHTMLV7(row) {
  const grade = row.group_grade_percent;

  if (grade === null || grade === undefined || grade === "") {
    return `<span class="final-grade-pill">—</span>`;
  }

  return `<span class="final-grade-pill">${fmt.format(Number(grade))}</span>`;
}

function getMetricMeanV7(row, metricKey) {
  const v = row?.indicators?.[metricKey]?.mean;
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function getMetricStdV7(row, metricKey) {
  const v = row?.indicators?.[metricKey]?.std;
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function getFinalRankV7(row) {
  const v = row?.final_rank_order;
  return v === null || v === undefined || v === "" ? 999999 : Number(v);
}

function statBlockV7(indicator) {
  return `
    <div class="stat-cell">
      <div class="stat-main">میانگین: ${val(indicator.mean)}</div>
      <div class="stat-sub">انحراف معیار: ${val(indicator.std)}</div>
    </div>
  `;
}

async function initGroupStats() {
  setupLogo();

  const db = await loadJSON("data/group_statistics.json");
  const originalRows = db.rows || [];
  const tbody = byId("statsBody");

  const table = tbody.closest("table");

  if (table) {
    table.classList.add("group-stats-table");
    table.classList.add("group-final-table");
    table.classList.add("group-final-table-v7");

    const thead = table.querySelector("thead");

    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>
            <button class="sort-head active" data-sort="group">
              گروه <span class="sort-icon">↑</span>
            </button>
          </th>

          <th>
            <button class="sort-head" data-sort="data_real">
              اتکا به داده‌های واقعی <span class="sort-icon">↕</span>
            </button>
          </th>

          <th>
            <button class="sort-head" data-sort="presentation_quality">
              کیفیت ارائه و کار تیمی <span class="sort-icon">↕</span>
            </button>
          </th>

          <th>
            <button class="sort-head" data-sort="persuasion">
              قدرت متقاعدسازی و ارزیابی کلی <span class="sort-icon">↕</span>
            </button>
          </th>

          <th>
            <button class="sort-head" data-sort="final_rank">
              جایگاه <span class="sort-icon">↕</span>
            </button>
          </th>

          <th>
            <button class="sort-head" data-sort="final_grade">
              نمره گروهی از ۲۵ <span class="sort-icon">↕</span>
            </button>
          </th>
        </tr>
      `;
    }
  }

  let sortKey = "group";

  function sortRows(rows) {
    const copied = [...rows];

    if (sortKey === "group") {
      copied.sort((a, b) => Number(a.group_number) - Number(b.group_number));
      return copied;
    }

    if (sortKey === "final_rank" || sortKey === "final_grade") {
      copied.sort((a, b) => {
        const rankA = getFinalRankV7(a);
        const rankB = getFinalRankV7(b);

        if (rankA !== rankB) {
          return rankA - rankB;
        }

        return Number(a.group_number) - Number(b.group_number);
      });

      return copied;
    }

    copied.sort((a, b) => {
      const meanA = getMetricMeanV7(a, sortKey);
      const meanB = getMetricMeanV7(b, sortKey);

      if (meanA === null && meanB !== null) return 1;
      if (meanA !== null && meanB === null) return -1;

      if (meanA !== null && meanB !== null && meanB !== meanA) {
        return meanB - meanA;
      }

      const stdA = getMetricStdV7(a, sortKey);
      const stdB = getMetricStdV7(b, sortKey);

      if (stdA === null && stdB !== null) return 1;
      if (stdA !== null && stdB === null) return -1;

      if (stdA !== null && stdB !== null && stdA !== stdB) {
        return stdA - stdB;
      }

      return Number(a.group_number) - Number(b.group_number);
    });

    return copied;
  }

  function updateHeaderState() {
    document.querySelectorAll(".sort-head").forEach(btn => {
      const key = btn.dataset.sort;
      btn.classList.toggle("active", key === sortKey);

      const icon = btn.querySelector(".sort-icon");

      if (!icon) return;

      if (key === sortKey) {
        icon.textContent = key === "group" ? "↑" : "↓";
      } else {
        icon.textContent = "↕";
      }
    });
  }

  function render() {
    const rows = sortRows(originalRows);
    tbody.innerHTML = "";

    for (const row of rows) {
      const i1 = row.indicators.data_real;
      const i2 = row.indicators.presentation_quality;
      const i3 = row.indicators.persuasion;

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td class="group-name-cell">
            <strong>${groupLabel(row.group)}</strong>
            <br>
            <small>${shortTopic(row.topic)}</small>
          </td>

          <td class="indicator-col">${statBlockV7(i1)}</td>
          <td class="indicator-col">${statBlockV7(i2)}</td>
          <td class="indicator-col">${statBlockV7(i3)}</td>

          <td class="award-cell">
            ${groupAwardHTMLV7(row)}
          </td>

          <td class="group-grade-cell">
            ${groupGradeHTMLV7(row)}
          </td>
        </tr>
      `);
    }

    updateHeaderState();

    if (typeof setupFloatingTableHeadersV4 === "function") {
      setTimeout(setupFloatingTableHeadersV4, 80);
    }
  }

  document.querySelectorAll(".sort-head").forEach(btn => {
    btn.addEventListener("click", () => {
      sortKey = btn.dataset.sort;
      render();
    });
  });

  render();
}
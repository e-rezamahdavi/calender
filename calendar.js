"use strict";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

function toFa(value) {
  return String(value).replace(/[0-9]/g, (digit) => persianDigits[Number(digit)]);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

async function loadCalendarData() {
  if (window.CALENDAR_1405_DATA) {
    return window.CALENDAR_1405_DATA;
  }

  const response = await fetch("./events-1405.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Cannot load events-1405.json: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || data.schema_version !== 2 || !Array.isArray(data.months) || !Array.isArray(data.days)) {
    throw new Error("events-1405.json must use schema_version 2 with months and days arrays.");
  }
  return data;
}

function groupDaysByMonth(days) {
  const groups = new Map();
  for (const day of days) {
    const monthNumber = Number(day.solar.month);
    if (!groups.has(monthNumber)) {
      groups.set(monthNumber, []);
    }
    groups.get(monthNumber).push(day);
  }

  for (const monthDays of groups.values()) {
    monthDays.sort((a, b) => Number(a.solar.day) - Number(b.solar.day));
  }
  return groups;
}

function renderDayCell(day) {
  const classes = ["day-cell"];
  if (day.is_friday) {
    classes.push("friday");
  }
  if (day.is_holiday) {
    classes.push("holiday");
  }

  const cell = element("article", classes.join(" "));
  cell.setAttribute("aria-label", day.solar.label);

  const solarRow = element("div", "solar-row");
  solarRow.append(element("span", "weekday-full", day.weekday.name));
  solarRow.append(element("span", "day-number", toFa(day.solar.day)));

  const dateStack = element("div", "date-stack");
  dateStack.append(element("span", "hijri-date", day.hijri.label));
  dateStack.append(element("span", "gregorian-date", day.gregorian.label));

  const eventBox = element("div", "event-text");
  for (const eventName of day.display_events.slice(0, 3)) {
    eventBox.append(element("span", "event-line", eventName));
  }

  cell.append(solarRow, dateStack, eventBox);

  return cell;
}

function renderBlankCell(slotNumber) {
  const cell = element("div", "day-cell blank");
  cell.setAttribute("aria-label", `روز ${toFa(slotNumber)} ندارد`);
  return cell;
}

function renderMonthPanel(month) {
  const panel = element("aside", "month-panel");
  panel.style.setProperty("--month-color", month.color);

  panel.append(element("span", "month-index", toFa(pad2(month.number))));
  panel.append(element("strong", "month-name", month.name));

  const details = element("div", "month-details");
  details.append(element("b", "", month.latin.toUpperCase()));
  details.append(element("span", "", month.gregorian_range));
  panel.append(details);

  return panel;
}

function renderCalendar(data) {
  const calendarGrid = document.getElementById("calendarGrid");
  const dayColumns = Number(data.layout.day_columns);

  const groupedDays = groupDaysByMonth(data.days);
  calendarGrid.textContent = "";
  calendarGrid.append(element("aside", "side-title", "تقویم 1405 - notesofmyroad.ir"));

  for (const month of data.months) {
    const row = element("article", "month-row");
    row.style.setProperty("--month-color", month.color);

    const dayGrid = element("div", "day-grid");
    const monthDays = groupedDays.get(Number(month.number)) || [];
    const dayMap = new Map(monthDays.map((day) => [Number(day.solar.day), day]));

    for (let slot = 1; slot <= dayColumns; slot += 1) {
      const day = dayMap.get(slot);
      dayGrid.append(day ? renderDayCell(day) : renderBlankCell(slot));
    }

    row.append(dayGrid, renderMonthPanel(month));
    calendarGrid.append(row);
  }
}

function updatePrintSize(size) {
  document.body.dataset.printSize = size;
  updatePrintPageStyle(size);
  for (const option of document.querySelectorAll(".size-option")) {
    const active = option.dataset.printSize === size;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-pressed", String(active));
  }
}

function updatePrintPageStyle(size) {
  const pageSizes = {
    a1: "841mm 594mm",
    a2: "594mm 420mm",
    a3: "420mm 297mm",
  };
  const pageSize = pageSizes[size] || pageSizes.a1;
  let style = document.getElementById("dynamicPrintPage");
  if (!style) {
    style = document.createElement("style");
    style.id = "dynamicPrintPage";
    document.head.append(style);
  }
  style.textContent = `@page { size: ${pageSize}; margin: 0; }`;
}

function fitSheet() {
  const stage = document.getElementById("stage");
  const wrap = document.getElementById("sheetWrap");
  const sheet = document.getElementById("calendarSheet");
  if (!stage || !wrap || !sheet || window.matchMedia("print").matches) {
    return;
  }

  const availableWidth = Math.max(320, stage.clientWidth - 8);
  const scale = Math.min(1, availableWidth / sheet.offsetWidth);
  document.documentElement.style.setProperty("--sheet-scale", String(scale));
  wrap.style.width = `${sheet.offsetWidth * scale}px`;
  wrap.style.height = `${sheet.offsetHeight * scale}px`;
}

async function init() {
  const data = await loadCalendarData();
  renderCalendar(data);
  updatePrintPageStyle(document.body.dataset.printSize || "a1");
  fitSheet();

  document.getElementById("printButton").addEventListener("click", () => window.print());
  for (const option of document.querySelectorAll(".size-option")) {
    option.addEventListener("click", () => {
      updatePrintSize(option.dataset.printSize);
      fitSheet();
    });
  }
  window.addEventListener("resize", fitSheet);
  window.addEventListener("load", fitSheet);
}

init().catch((error) => {
  console.error(error);
  const calendarGrid = document.getElementById("calendarGrid");
  if (calendarGrid) {
    calendarGrid.textContent = "خطا در بارگذاری events-1405.json";
  }
});

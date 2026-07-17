"use strict";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const gregorianMonths = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const seasons = [
  { name: "SPRING", fa: "بهار", startMonth: 1, color: "#199B62" },
  { name: "SUMMER", fa: "تابستان", startMonth: 4, color: "#E99A00" },
  { name: "AUTUMN", fa: "پاییز", startMonth: 7, color: "#B84A32" },
  { name: "WINTER", fa: "زمستان", startMonth: 10, color: "#3568A8" },
];

function toFa(value) {
  return String(value).replace(/[0-9]/g, (digit) => persianDigits[Number(digit)]);
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

function rangeLabel(values) {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length <= 1) {
    return unique[0] || "";
  }
  return `${unique[0]} — ${unique[unique.length - 1]}`;
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
  const dayCalendarDates = element("div", "day-calendar-dates");
  dayCalendarDates.append(element("span", "weekday-full", day.weekday.name));

  const dateStack = element("div", "date-stack");
  dateStack.append(
    element("span", "hijri-date", `${toFa(day.hijri.day)} ${day.hijri.month_name}`),
  );
  dateStack.append(
    element(
      "span",
      "gregorian-date",
      `${day.gregorian.day} ${gregorianMonths[day.gregorian.month]}`,
    ),
  );
  dayCalendarDates.append(dateStack);

  const dayIdentity = element("div", "day-identity");
  dayIdentity.append(element("span", "day-number", toFa(day.solar.day)));
  dayIdentity.append(element("span", "solar-label", day.solar.month_name));
  if (day.is_holiday) {
    dayIdentity.append(element("span", "holiday-badge", "تعطیل رسمی"));
  } else if (day.is_friday) {
    dayIdentity.append(
      element("span", "holiday-badge friday-holiday-badge", "تعطیل"),
    );
  }
  solarRow.append(dayCalendarDates, dayIdentity);

  const eventBox = element("div", "event-text");
  for (const eventName of day.display_events.slice(0, 3)) {
    eventBox.append(element("span", "event-line", eventName));
  }

  cell.append(solarRow, eventBox);

  return cell;
}

function renderBlankCell(slotNumber, month) {
  const classes = ["day-cell", "blank", `blank-slot-${slotNumber}`];
  if (month.number >= 7) {
    classes.push("merged-blank");
  }
  if (month.number === 7 && slotNumber === 31) {
    classes.push("merged-start");
  }
  if (month.number === 12) {
    classes.push("merged-end");
  }
  const cell = element("div", classes.join(" "));
  cell.setAttribute("aria-label", `روز ${toFa(slotNumber)} ندارد`);
  return cell;
}

function renderMonthPanel(month, monthDays) {
  const panel = element("aside", "month-panel");
  panel.style.setProperty("--month-color", month.color);

  const title = element("div", "month-title");
  title.append(element("strong", "month-name", month.name));
  title.append(element("span", "month-latin", month.latin));

  const details = element("div", "month-details");
  const gregorianRange = rangeLabel(
    monthDays.map((day) => gregorianMonths[day.gregorian.month]),
  );
  const hijriRange = rangeLabel(monthDays.map((day) => day.hijri.month_name));
  const gregorianLine = element("span", "month-calendar-range gregorian-range");
  gregorianLine.setAttribute("aria-label", `ماه‌های میلادی: ${gregorianRange}`);
  gregorianLine.append(element("span", "", gregorianRange));
  const hijriLine = element("span", "month-calendar-range hijri-range");
  hijriLine.setAttribute("aria-label", `ماه‌های قمری: ${hijriRange}`);
  hijriLine.append(element("span", "", hijriRange));
  details.append(gregorianLine, hijriLine);
  panel.append(title, details);

  return panel;
}

function renderSeasonPanels(calendarGrid) {
  for (const season of seasons) {
    const panel = element("aside", "season-panel");
    panel.style.setProperty("--season-color", season.color);
    panel.style.gridRow = `${season.startMonth} / span 3`;
    panel.setAttribute("aria-label", season.name);

    const word = element("span", "season-word");
    for (const letter of season.name) {
      word.append(element("span", "season-letter", letter));
    }
    panel.append(word);
    calendarGrid.append(panel);
  }
}

function renderMergedBrand(calendarGrid) {
  const brand = element("aside", "merged-brand");
  brand.setAttribute("aria-label", "c.notesofmyroad.ir");

  const siteName = element("span", "site-word");
  for (const letter of "C.NOTESOFMYROAD.IR") {
    siteName.append(element("span", "site-letter", letter));
  }

  const qr = element("img", "site-qr");
  qr.src = "./qr-notesofmyroad.svg";
  qr.alt = "QR c.notesofmyroad.ir";
  brand.append(siteName, qr);
  calendarGrid.append(brand);
}

function renderCalendar(data) {
  const calendarGrid = document.getElementById("calendarGrid");
  const dayColumns = Number(data.layout.day_columns);

  const groupedDays = groupDaysByMonth(data.days);
  calendarGrid.textContent = "";
  renderSeasonPanels(calendarGrid);
  renderMergedBrand(calendarGrid);

  for (const month of data.months) {
    const row = element("article", "month-row");
    row.style.setProperty("--month-color", month.color);

    const dayGrid = element("div", "day-grid");
    const monthDays = groupedDays.get(Number(month.number)) || [];
    const dayMap = new Map(monthDays.map((day) => [Number(day.solar.day), day]));

    for (let slot = 1; slot <= dayColumns; slot += 1) {
      const day = dayMap.get(slot);
      dayGrid.append(day ? renderDayCell(day) : renderBlankCell(slot, month));
    }

    row.append(dayGrid, renderMonthPanel(month, monthDays));
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
    poster: "930mm 500mm",
    a1: "841mm 594mm",
    a2: "594mm 420mm",
    a3: "420mm 297mm",
  };
  const pageSize = pageSizes[size] || pageSizes.poster;
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
  updatePrintPageStyle(document.body.dataset.printSize || "poster");
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

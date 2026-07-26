(function () {
  'use strict';

  const STORAGE_KEY = 'agendaEvents';
  const WEEKDAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  let events = loadEvents();
  let today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-11
  let selectedDay = today.getDate();
  let selectedMonth = viewMonth;
  let selectedYear = viewYear;
  let editingEventId = null;

  // ---------- Storage ----------

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  // ---------- DOM refs ----------

  const el = {
    calMonthLabel: document.getElementById('cal-month-label'),
    calGrid: document.getElementById('cal-grid'),
    btnPrevMonth: document.getElementById('btn-prev-month'),
    btnNextMonth: document.getElementById('btn-next-month'),
    selectedDateLabel: document.getElementById('selected-date-label'),
    timeline: document.getElementById('timeline'),
    btnAdd: document.getElementById('btn-add'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    inputDate: document.getElementById('input-date'),
    inputTime: document.getElementById('input-time'),
    inputDesc: document.getElementById('input-desc'),
    inputAlert: document.getElementById('input-alert'),
    btnCancel: document.getElementById('btn-cancel'),
    btnSave: document.getElementById('btn-save'),
    toast: document.getElementById('toast'),
  };

  // ---------- Mini calendar ----------

  function renderCalendar() {
    el.calMonthLabel.textContent = `${MONTH_NAMES[viewMonth]} de ${viewYear}`;
    el.calGrid.innerHTML = '';

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = domingo
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day, month: m, year: y, outside: true });
    }

    // days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, month: viewMonth, year: viewYear, outside: false });
    }

    // trailing days from next month to fill 6 rows (42 cells)
    while (cells.length < 42) {
      const idx = cells.length - (startWeekday + daysInMonth);
      const day = idx + 1;
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day, month: m, year: y, outside: true });
    }

    cells.forEach((cell) => {
      const btn = document.createElement('div');
      btn.className = 'cal-day';
      if (cell.outside) btn.classList.add('outside');

      const isToday = cell.day === today.getDate() && cell.month === today.getMonth() && cell.year === today.getFullYear();
      const isSelected = cell.day === selectedDay && cell.month === selectedMonth && cell.year === selectedYear;

      if (isToday) btn.classList.add('today');
      if (isSelected) btn.classList.add('selected');

      const num = document.createElement('span');
      num.textContent = cell.day;
      btn.appendChild(num);

      if (hasEventsOn(cell.day, cell.month, cell.year)) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        btn.appendChild(dot);
      }

      btn.addEventListener('click', () => {
        selectedDay = cell.day;
        selectedMonth = cell.month;
        selectedYear = cell.year;
        if (cell.outside) {
          viewMonth = cell.month;
          viewYear = cell.year;
        }
        renderCalendar();
        renderTimeline();
      });

      el.calGrid.appendChild(btn);
    });
  }

  function hasEventsOn(day, month, year) {
    return events.some((ev) => ev.day === day && ev.month === month + 1 && ev.year === year);
  }

  el.btnPrevMonth.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  });

  el.btnNextMonth.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
  });

  // ---------- Timeline ----------

  function renderTimeline() {
    const dateObj = new Date(selectedYear, selectedMonth, selectedDay);
    const weekdayName = WEEKDAY_NAMES[dateObj.getDay()];
    el.selectedDateLabel.textContent = `${weekdayName}, ${selectedDay} de ${MONTH_NAMES[selectedMonth]}`;

    const dayEvents = events
      .filter((ev) => ev.day === selectedDay && ev.month === selectedMonth + 1 && ev.year === selectedYear)
      .sort((a, b) => a.time.localeCompare(b.time));

    el.timeline.innerHTML = '';

    if (dayEvents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhum evento neste dia';
      el.timeline.appendChild(empty);
    }

    for (let hour = 0; hour <= 23; hour++) {
      const hourStr = String(hour).padStart(2, '0') + ':00';
      const slot = document.createElement('div');
      slot.className = 'time-slot';

      const hourLabel = document.createElement('div');
      hourLabel.className = 'time-slot-hour';
      hourLabel.textContent = hourStr;
      slot.appendChild(hourLabel);

      const eventsCol = document.createElement('div');
      eventsCol.className = 'time-slot-events';

      const hourEvents = dayEvents.filter((ev) => parseInt(ev.time.split(':')[0], 10) === hour);
      if (hourEvents.length > 0) {
        slot.classList.add('has-event');
        hourEvents.forEach((ev) => {
          const block = document.createElement('div');
          block.className = 'event-block';

          const timeEl = document.createElement('div');
          timeEl.className = 'event-time';
          timeEl.textContent = ev.time;

          const descEl = document.createElement('div');
          descEl.className = 'event-desc';
          descEl.textContent = ev.description;

          const alertEl = document.createElement('div');
          alertEl.className = 'event-alert';
          alertEl.textContent = `⏰ ${ev.alert}min antes`;

          block.appendChild(timeEl);
          block.appendChild(descEl);
          block.appendChild(alertEl);

          block.addEventListener('click', () => openModalForEdit(ev.id));

          eventsCol.appendChild(block);
        });
      }

      slot.appendChild(eventsCol);
      el.timeline.appendChild(slot);
    }
  }

  // ---------- Smart input formatting ----------

  function formatSmartDate(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    const month = digits.slice(2, digits.length - 2);
    const year = digits.slice(digits.length - 2);
    return `${digits.slice(0, 2)} ${month} ${year}`;
  }

  function formatSmartTime(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  }

  el.inputDate.addEventListener('input', (e) => {
    e.target.value = formatSmartDate(e.target.value);
  });

  el.inputTime.addEventListener('input', (e) => {
    e.target.value = formatSmartTime(e.target.value);
  });

  function parseSmartDate(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    if (digits.length < 3) return null;

    const day = parseInt(digits.slice(0, 2), 10);
    let month, year;
    if (digits.length <= 4) {
      // "277" -> day 27, month 7 (year not typed yet, defaults to current year)
      month = parseInt(digits.slice(2), 10);
      year = new Date().getFullYear();
    } else {
      // last 2 digits are always the year; whatever is between day and year is the month
      month = parseInt(digits.slice(2, digits.length - 2), 10);
      const yy = parseInt(digits.slice(digits.length - 2), 10);
      year = 2000 + yy;
    }

    if (isNaN(day) || isNaN(month) || month < 1) return null;
    return { day, month, year };
  }

  function parseSmartTime(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 2) return null;

    let hour, minute;
    if (digits.length <= 2) {
      hour = parseInt(digits, 10);
      minute = 0;
    } else {
      hour = parseInt(digits.slice(0, 2), 10);
      minute = parseInt(digits.slice(2), 10);
    }

    if (isNaN(hour) || isNaN(minute)) return null;
    return { hour, minute };
  }

  function isValidDate(day, month, year) {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  }

  function isValidTime(hour, minute) {
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  // ---------- Modal ----------

  function openModalForAdd() {
    editingEventId = null;
    el.modalTitle.textContent = 'Novo Evento';
    el.inputDate.value = '';
    el.inputTime.value = '';
    el.inputDesc.value = '';
    el.inputAlert.value = 15;
    el.modalOverlay.classList.remove('hidden');
    el.inputDate.focus();
  }

  function openModalForEdit(id) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    editingEventId = id;
    el.modalTitle.textContent = 'Editar Evento';
    const yy = String(ev.year).slice(-2);
    el.inputDate.value = `${String(ev.day).padStart(2, '0')} ${ev.month} ${yy}`;
    el.inputTime.value = ev.time.replace(':', ' ');
    el.inputDesc.value = ev.description;
    el.inputAlert.value = ev.alert;
    el.modalOverlay.classList.remove('hidden');
  }

  function closeModal() {
    el.modalOverlay.classList.add('hidden');
    editingEventId = null;
  }

  el.btnAdd.addEventListener('click', openModalForAdd);
  el.btnCancel.addEventListener('click', closeModal);

  el.modalOverlay.addEventListener('click', (e) => {
    if (e.target === el.modalOverlay) closeModal();
  });

  el.btnSave.addEventListener('click', () => {
    const dateRaw = el.inputDate.value.trim();
    const timeRaw = el.inputTime.value.trim();
    const desc = el.inputDesc.value.trim();
    const alert = parseInt(el.inputAlert.value, 10);

    if (!dateRaw || !timeRaw || !desc || isNaN(alert)) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    const parsedDate = parseSmartDate(dateRaw);
    if (!parsedDate || !isValidDate(parsedDate.day, parsedDate.month, parsedDate.year)) {
      showToast('Data inválida', 'error');
      return;
    }

    const parsedTime = parseSmartTime(timeRaw);
    if (!parsedTime || !isValidTime(parsedTime.hour, parsedTime.minute)) {
      showToast('Hora inválida', 'error');
      return;
    }

    const timeStr = `${String(parsedTime.hour).padStart(2, '0')}:${String(parsedTime.minute).padStart(2, '0')}`;

    if (editingEventId) {
      const ev = events.find((e) => e.id === editingEventId);
      ev.day = parsedDate.day;
      ev.month = parsedDate.month;
      ev.year = parsedDate.year;
      ev.time = timeStr;
      ev.description = desc;
      ev.alert = alert;
    } else {
      events.push({
        id: String(Date.now()),
        day: parsedDate.day,
        month: parsedDate.month,
        year: parsedDate.year,
        time: timeStr,
        description: desc,
        alert: alert,
        completed: false,
      });
    }

    saveEvents();
    closeModal();
    showToast('Evento salvo ✓', 'success');

    selectedDay = parsedDate.day;
    selectedMonth = parsedDate.month - 1;
    selectedYear = parsedDate.year;
    viewMonth = selectedMonth;
    viewYear = selectedYear;

    renderCalendar();
    renderTimeline();
  });

  // ---------- Toast ----------

  let toastTimer = null;

  function showToast(message, type) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.className = 'toast ' + type;
    toastTimer = setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 3000);
  }

  // ---------- Init ----------

  function init() {
    renderCalendar();
    renderTimeline();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();

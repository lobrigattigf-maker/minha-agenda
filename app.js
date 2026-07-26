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
    btnDelete: document.getElementById('btn-delete'),
    toast: document.getElementById('toast'),
    alertBanner: document.getElementById('alert-banner'),
    alertDesc: document.getElementById('alert-banner-desc'),
    alertTime: document.getElementById('alert-banner-time'),
    btnAlertDismiss: document.getElementById('btn-alert-dismiss'),
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
      return;
    }

    const hoursWithEvents = [...new Set(dayEvents.map((ev) => parseInt(ev.time.split(':')[0], 10)))].sort((a, b) => a - b);

    hoursWithEvents.forEach((hour) => {
      const hourStr = String(hour).padStart(2, '0') + ':00';
      const slot = document.createElement('div');
      slot.className = 'time-slot has-event';

      const hourLabel = document.createElement('div');
      hourLabel.className = 'time-slot-hour';
      hourLabel.textContent = hourStr;
      slot.appendChild(hourLabel);

      const eventsCol = document.createElement('div');
      eventsCol.className = 'time-slot-events';

      const hourEvents = dayEvents.filter((ev) => parseInt(ev.time.split(':')[0], 10) === hour);
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

      slot.appendChild(eventsCol);
      el.timeline.appendChild(slot);
    });
  }

  // ---------- Native date/time helpers ----------

  function toIsoDate(day, month, year) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function parseIsoDate(iso) {
    const parts = iso.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return { day, month, year };
  }

  // ---------- On-screen + voice alert while app is open ----------

  const alertedEventIds = new Set();

  function speakAlert(ev) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(`Atenção! Chegando a hora do compromisso: ${ev.description}`);
    utter.lang = 'pt-BR';
    speechSynthesis.speak(utter);
  }

  function triggerAlert(ev) {
    el.alertDesc.textContent = ev.description;
    el.alertTime.textContent = `às ${ev.time}`;
    el.alertBanner.classList.remove('hidden');
    speakAlert(ev);
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
  }

  function checkUpcomingAlerts() {
    const now = new Date();
    events.forEach((ev) => {
      if (alertedEventIds.has(ev.id)) return;
      const [hour, minute] = ev.time.split(':').map(Number);
      const eventDate = new Date(ev.year, ev.month - 1, ev.day, hour, minute);
      const alertDate = new Date(eventDate.getTime() - ev.alert * 60000);
      if (now >= alertDate && now < eventDate) {
        alertedEventIds.add(ev.id);
        triggerAlert(ev);
      }
    });
  }

  el.btnAlertDismiss.addEventListener('click', () => {
    el.alertBanner.classList.add('hidden');
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  });

  // ---------- Modal ----------

  function openModalForAdd() {
    editingEventId = null;
    el.modalTitle.textContent = 'Novo Evento';
    el.inputDate.value = toIsoDate(selectedDay, selectedMonth + 1, selectedYear);
    el.inputTime.value = '';
    el.inputDesc.value = '';
    el.inputAlert.value = 15;
    el.btnDelete.classList.add('hidden');
    el.modalOverlay.classList.remove('hidden');
  }

  function openModalForEdit(id) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    editingEventId = id;
    el.modalTitle.textContent = 'Editar Evento';
    el.inputDate.value = toIsoDate(ev.day, ev.month, ev.year);
    el.inputTime.value = ev.time;
    el.inputDesc.value = ev.description;
    el.inputAlert.value = ev.alert;
    el.btnDelete.classList.remove('hidden');
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

  el.btnDelete.addEventListener('click', () => {
    if (!editingEventId) return;
    if (!confirm('Excluir este evento?')) return;

    events = events.filter((e) => e.id !== editingEventId);
    saveEvents();
    closeModal();
    showToast('Evento excluído', 'success');
    renderCalendar();
    renderTimeline();
  });

  el.btnSave.addEventListener('click', () => {
    const dateRaw = el.inputDate.value;
    const timeStr = el.inputTime.value;
    const desc = el.inputDesc.value.trim();
    const alert = parseInt(el.inputAlert.value, 10);

    if (!dateRaw || !timeStr || !desc || isNaN(alert)) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    const parsedDate = parseIsoDate(dateRaw);
    if (!parsedDate) {
      showToast('Data inválida', 'error');
      return;
    }

    const conflict = events.find(
      (ev) =>
        ev.id !== editingEventId &&
        ev.day === parsedDate.day &&
        ev.month === parsedDate.month &&
        ev.year === parsedDate.year &&
        ev.time === timeStr
    );
    if (conflict) {
      const proceed = confirm(`Já existe um evento às ${timeStr} nesse dia: "${conflict.description}".\n\nDeseja salvar mesmo assim?`);
      if (!proceed) return;
    }

    let savedId;
    if (editingEventId) {
      const ev = events.find((e) => e.id === editingEventId);
      ev.day = parsedDate.day;
      ev.month = parsedDate.month;
      ev.year = parsedDate.year;
      ev.time = timeStr;
      ev.description = desc;
      ev.alert = alert;
      savedId = ev.id;
    } else {
      savedId = String(Date.now());
      events.push({
        id: savedId,
        day: parsedDate.day,
        month: parsedDate.month,
        year: parsedDate.year,
        time: timeStr,
        description: desc,
        alert: alert,
        completed: false,
      });
    }

    alertedEventIds.delete(savedId);
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
    checkUpcomingAlerts();
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
    checkUpcomingAlerts();
    setInterval(checkUpcomingAlerts, 15000);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();

const TOAST_DURATION = {
  success: 4200,
  error: 7200,
  warning: 5200,
  info: 4500,
};

export function toast(message, variant = 'info', durationMs) {
  const text = typeof message === 'string' ? message : String(message ?? '');
  const ms = durationMs ?? TOAST_DURATION[variant] ?? TOAST_DURATION.info;

  let host = document.getElementById('ts-notify-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'ts-notify-host';
    host.className = 'ts-notify-host';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = `ts-toast ts-toast--${variant}`;
  el.setAttribute('role', variant === 'error' ? 'alert' : 'status');

  const body = document.createElement('div');
  body.className = 'ts-toast__body';
  body.textContent = text;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ts-toast__close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.textContent = '×';

  let timerId;
  function dismiss() {
    if (timerId) clearTimeout(timerId);
    el.classList.add('ts-toast--leave');
    setTimeout(() => el.remove(), 220);
  }

  closeBtn.addEventListener('click', dismiss);
  timerId = setTimeout(dismiss, ms);

  el.appendChild(body);
  el.appendChild(closeBtn);
  host.appendChild(el);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ts-notify-overlay';

    const box = document.createElement('div');
    box.className = 'ts-notify-dialog';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    const p = document.createElement('p');
    p.className = 'ts-notify-dialog__message';
    p.textContent = typeof message === 'string' ? message : String(message ?? '');

    const actions = document.createElement('div');
    actions.className = 'ts-notify-dialog__actions';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'ts-notify-dialog__btn ts-notify-dialog__btn--muted';
    btnCancel.textContent = 'Cancelar';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'ts-notify-dialog__btn ts-notify-dialog__btn--accent';
    btnOk.textContent = 'Aceptar';

    let done = false;
    function settle(value) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(value);
    }

    function onKeyDown(ev) {
      if (ev.key === 'Escape') settle(false);
    }

    btnCancel.addEventListener('click', () => settle(false));
    btnOk.addEventListener('click', () => settle(true));
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) settle(false);
    });
    document.addEventListener('keydown', onKeyDown);

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    box.appendChild(p);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    btnOk.focus();
  });
}

export function promptDialog(message, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ts-notify-overlay';

    const box = document.createElement('div');
    box.className = 'ts-notify-dialog ts-notify-dialog--prompt';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    const p = document.createElement('p');
    p.className = 'ts-notify-dialog__message';
    p.textContent = typeof message === 'string' ? message : String(message ?? '');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ts-notify-dialog__input';
    input.value = defaultValue == null ? '' : String(defaultValue);

    const actions = document.createElement('div');
    actions.className = 'ts-notify-dialog__actions';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'ts-notify-dialog__btn ts-notify-dialog__btn--muted';
    btnCancel.textContent = 'Cancelar';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'ts-notify-dialog__btn ts-notify-dialog__btn--accent';
    btnOk.textContent = 'Aceptar';

    let done = false;
    function settle(value) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(value);
    }

    function onKeyDown(ev) {
      if (ev.key === 'Escape') settle(null);
    }

    btnCancel.addEventListener('click', () => settle(null));
    btnOk.addEventListener('click', () => settle(input.value));
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) settle(null);
    });
    document.addEventListener('keydown', onKeyDown);

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        settle(input.value);
      }
    });

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);
    box.appendChild(p);
    box.appendChild(input);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.focus();
    input.select();
  });
}

export const notify = { toast, confirm: confirmDialog, prompt: promptDialog };

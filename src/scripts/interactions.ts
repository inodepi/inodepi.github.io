/**
 * Shared progressive-enhancement for the style previews.
 * - Runnable workflow visuals ([data-flow] + [data-flow-step] + [data-flow-run])
 * - Live form validation with a demo submit state
 * - Reading progress bar
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function initFlows() {
  document.querySelectorAll<HTMLElement>('[data-flow]').forEach((flow) => {
    const id = flow.dataset.flow;
    if (!id) return;

    const steps = Array.from(flow.querySelectorAll<HTMLElement>('[data-flow-step]'));
    if (!steps.length) return;

    const logs = Array.from(flow.querySelectorAll<HTMLElement>('[data-flow-log-line]'));
    const status = document.querySelector<HTMLElement>(`[data-flow-status="${id}"]`);
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(`[data-flow-run="${id}"]`),
    );

    let running = false;

    const reset = () => {
      steps.forEach((step) => step.classList.remove('is-active', 'is-done'));
      logs.forEach((line) => line.classList.remove('is-current', 'is-seen'));
      flow.classList.remove('is-complete');
      if (status) status.textContent = status.dataset.idle ?? 'Ready';
      buttons.forEach((button) => {
        button.disabled = false;
      });
    };

    const run = async () => {
      if (running) return;
      running = true;
      reset();
      flow.setAttribute('aria-busy', 'true');
      buttons.forEach((button) => {
        button.disabled = true;
      });

      const stepDelay = reduceMotion ? 140 : 820;
      const idle = status?.dataset.running ?? 'Step';
      const done = status?.dataset.complete ?? 'Complete';

      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];
        const log = logs[index];
        const label = step.dataset.label ?? `${index + 1}`;

        step.classList.add('is-active');
        if (log) log.classList.add('is-current');
        if (status) status.textContent = `${idle} ${label}`;

        await wait(stepDelay);

        step.classList.remove('is-active');
        step.classList.add('is-done');
        if (log) {
          log.classList.remove('is-current');
          log.classList.add('is-seen');
        }
      }

      flow.classList.add('is-complete');
      flow.removeAttribute('aria-busy');
      if (status) status.textContent = done;
      buttons.forEach((button) => {
        button.disabled = false;
      });
      running = false;
    };

    buttons.forEach((button) => button.addEventListener('click', run));

    if (status && !status.textContent.trim()) {
      status.textContent = status.dataset.idle ?? 'Ready';
    }
  });
}

function fieldLabel(field: HTMLInputElement | HTMLTextAreaElement) {
  const label = field.closest('label');
  const span = label?.querySelector('span');
  return span?.textContent?.replace(/\s+/g, ' ').replace(/\(optional\)/i, '').trim() ?? 'This field';
}

function validateField(field: HTMLInputElement | HTMLTextAreaElement) {
  const value = field.value.trim();

  if (field.required && !value) {
    return `${fieldLabel(field)} is required.`;
  }

  if (field.type === 'email' && value) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    if (!valid) return 'Enter a valid email address.';
  }

  return '';
}

function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-demo-form]').forEach((form) => {
    form.noValidate = true;
    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
    );

    const status = document.createElement('p');
    status.className = 'ix-form-status';
    status.setAttribute('role', 'status');
    form.append(status);

    const clearError = (field: HTMLInputElement | HTMLTextAreaElement) => {
      field.removeAttribute('aria-invalid');
      const error = field.closest('label')?.nextElementSibling;
      if (error?.classList.contains('ix-field-error')) error.remove();
      status.textContent = '';
      status.classList.remove('is-success');
    };

    const setError = (field: HTMLInputElement | HTMLTextAreaElement, message: string) => {
      field.setAttribute('aria-invalid', 'true');
      const label = field.closest('label');
      let error = label?.nextElementSibling;
      if (!error?.classList.contains('ix-field-error')) {
        error = document.createElement('span');
        error.className = 'ix-field-error';
        if (label) label.insertAdjacentElement('afterend', error);
      }
      error.textContent = message;
    };

    fields.forEach((field) => {
      field.addEventListener('input', () => clearError(field));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let valid = true;

      fields.forEach((field) => {
        const message = validateField(field);
        if (message) {
          valid = false;
          setError(field, message);
        } else {
          clearError(field);
        }
      });

      if (!valid) {
        status.textContent = 'Check the highlighted fields.';
        status.classList.remove('is-success');
        const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.focus();
        return;
      }

      form.classList.add('is-sent');
      status.classList.add('is-success');
      status.textContent =
        'Preview only — nothing was sent. Connect a form endpoint to receive inquiries.';
    });
  });
}

function initSectionNav() {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('header nav a[href^="#"]'),
  );
  if (!links.length) return;

  const byId = new Map<string, HTMLAnchorElement>();
  links.forEach((link) => {
    const id = link.getAttribute('href')?.slice(1);
    if (id) byId.set(id, link);
  });

  const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
  if (!sections.length) return;

  const setActive = (id: string) => {
    byId.forEach((link, key) => {
      link.classList.toggle('is-current', key === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive((visible.target as HTMLElement).id);
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.5, 0.8] },
  );

  sections.forEach((section) => observer.observe(section));
}

function initProgress() {
  const bar = document.createElement('div');
  bar.className = 'ix-progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<span></span>';
  document.body.append(bar);

  const fill = bar.firstElementChild as HTMLElement | null;
  if (!fill) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    fill.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  };

  const request = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}

initFlows();
initForms();
initSectionNav();
initProgress();

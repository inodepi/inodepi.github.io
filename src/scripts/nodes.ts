/**
 * Node-canvas interactions for the /style/nodes/ preview.
 * - Selectable nodes with a parameter panel (tabs + JSON output)
 * - Workflow execution simulation
 * - Capability library filtering
 */

type Detail = {
  name: string;
  type: string;
  params: [string, string][];
  settings: [string, string][];
  output: string;
};

const details: Record<string, Detail> = {
  webhook: {
    name: 'Webhook',
    type: 'Trigger',
    params: [
      ['HTTP method', 'POST'],
      ['Path', '/new-lead'],
      ['Response', 'Immediately'],
      ['Authentication', 'Header token'],
    ],
    settings: [
      ['Always output data', 'Off'],
      ['Retry on fail', 'None'],
      ['Notes', 'Entry point for every new lead.'],
    ],
    output: `{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "source": "website"
}`,
  },
  filter: {
    name: 'Filter',
    type: 'Flow',
    params: [
      ['Condition', 'Email is not empty'],
      ['Dedupe', 'Match on email'],
      ['Fallback', 'Stop and notify'],
    ],
    settings: [
      ['Execute once', 'On'],
      ['Always output data', 'Off'],
      ['Notes', 'Drops incomplete and duplicate leads.'],
    ],
    output: `{
  "valid": true,
  "score": 82
}`,
  },
  agent: {
    name: 'AI Agent',
    type: 'AI',
    params: [
      ['Model', 'GPT-class model'],
      ['Prompt', 'Score fit and draft a reply'],
      ['Output', 'Structured JSON'],
      ['Tools', 'CRM lookup'],
    ],
    settings: [
      ['Temperature', '0.2'],
      ['Max tokens', '800'],
      ['On error', 'Continue with fallback'],
    ],
    output: `{
  "score": 82,
  "tier": "hot",
  "draft": "Hi Ada — thanks for reaching out…"
}`,
  },
  crm: {
    name: 'HTTP Request',
    type: 'Action',
    params: [
      ['Method', 'POST'],
      ['URL', '/crm/leads'],
      ['Auth', 'Bearer token'],
      ['Retries', '2'],
    ],
    settings: [
      ['Timeout', '30 seconds'],
      ['On error', 'Continue'],
      ['Notes', 'Writes the full context in one call.'],
    ],
    output: `{
  "id": "lead_8f31",
  "status": "created"
}`,
  },
  slack: {
    name: 'Slack',
    type: 'Action',
    params: [
      ['Channel', '#sales'],
      ['Message', 'New hot lead assigned'],
      ['Thread', 'Off'],
    ],
    settings: [
      ['Include node output', 'On'],
      ['On error', 'Notify admin'],
      ['Notes', 'Closes the loop with the account owner.'],
    ],
    output: `{
  "ok": true,
  "channel": "#sales"
}`,
  },
};

const canvas = document.querySelector<HTMLElement>('[data-node-canvas]');

if (canvas) {
  const nodes = Array.from(canvas.querySelectorAll<HTMLButtonElement>('[data-node]'));
  const tabButtons = Array.from(
    canvas.querySelectorAll<HTMLButtonElement>('[data-node-tab]'),
  );
  const body = canvas.querySelector<HTMLElement>('[data-detail-body]');
  const nameEl = canvas.querySelector<HTMLElement>('[data-detail-name]');
  const typeEl = canvas.querySelector<HTMLElement>('[data-detail-type]');
  const iconEl = canvas.querySelector<HTMLElement>('[data-detail-icon]');
  const statusEl = canvas.querySelector<HTMLElement>('[data-exec-status]');
  const runButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-canvas-run]'),
  );

  let selected = 'agent';
  let tab: 'params' | 'settings' | 'output' = 'params';
  let running = false;

  const renderBody = () => {
    const detail = details[selected];
    if (!detail || !body) return;

    if (tab === 'output') {
      body.innerHTML = `<pre class="nv-json"><code>${detail.output}</code></pre>`;
    } else {
      const rows = tab === 'params' ? detail.params : detail.settings;
      body.innerHTML = `<dl class="nv-params">${rows
        .map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`)
        .join('')}</dl>`;
    }

    tabButtons.forEach((button) => {
      const active = button.dataset.nodeTab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  };

  const select = (id: string) => {
    const detail = details[id];
    if (!detail) return;
    selected = id;

    nodes.forEach((node) => {
      const active = node.dataset.node === id;
      node.classList.toggle('is-selected', active);
      node.setAttribute('aria-pressed', String(active));
    });

    if (nameEl) nameEl.textContent = detail.name;
    if (typeEl) typeEl.textContent = detail.type;

    const selectedNode = canvas.querySelector<HTMLElement>(`[data-node="${id}"]`);
    if (iconEl && selectedNode) {
      iconEl.innerHTML = selectedNode.querySelector('.nv-node-icon')?.innerHTML ?? '';
      iconEl.style.setProperty('--hue', selectedNode.dataset.hue ?? '#d23a60');
    }

    tab = 'params';
    renderBody();
  };

  nodes.forEach((node) => {
    node.addEventListener('click', () => select(node.dataset.node ?? 'agent'));
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      tab = (button.dataset.nodeTab as 'params' | 'settings' | 'output') ?? 'params';
      renderBody();
    });
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const order = ['webhook', 'filter', 'agent', 'crm', 'slack'];

  const run = async () => {
    if (running) return;
    running = true;
    nodes.forEach((node) => node.classList.remove('is-active', 'is-done'));
    canvas.classList.add('is-running');
    if (statusEl) statusEl.textContent = 'Executing…';
    runButtons.forEach((button) => {
      button.disabled = true;
    });

    for (const id of order) {
      const node = canvas.querySelector<HTMLElement>(`[data-node="${id}"]`);
      node?.classList.add('is-active');
      await wait(reduced ? 100 : 700);
      node?.classList.remove('is-active');
      node?.classList.add('is-done');
    }

    canvas.classList.remove('is-running');
    if (statusEl) statusEl.textContent = 'Executed · 1.4s';
    runButtons.forEach((button) => {
      button.disabled = false;
    });
    running = false;
  };

  runButtons.forEach((button) => button.addEventListener('click', run));

  // Capability library filters
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-node-filter]'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-category]'));

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.nodeFilter ?? 'all';
      chips.forEach((other) => {
        const active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
      cards.forEach((card) => {
        card.hidden = !(filter === 'all' || card.dataset.category === filter);
      });
    });
  });

  select(selected);
}

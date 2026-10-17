// Small DOM fixture for view lifecycle/diff tests; it counts even redundant writes.
// Every listener of an event is kept, like in a browser; handlers[name] stays a
// single callable (tests call node(id).handlers.click()) that runs them all in order.
function addListener(target, name, fn) {
  const lists = target._listeners || (target._listeners = {});
  const list = lists[name] || (lists[name] = []);
  if (list.includes(fn)) return;
  list.push(fn);
  target.handlers[name] = function (...args) { let result; list.slice().forEach(f => { result = f.apply(this, args); }); return result; };
}
function removeListener(target, name, fn) {
  const list = target._listeners && target._listeners[name];
  const index = list ? list.indexOf(fn) : -1;
  if (index < 0) return;
  list.splice(index, 1);
  if (!list.length) { delete target._listeners[name]; delete target.handlers[name]; }
}
function createDOM(initialScreens = ['files', 'home', 'history']) {
  const nodes = {}, activeScreens = new Set(initialScreens), stats = { writes: 0, moves: 0, removals: 0 };
  const document = { hidden: false, handlers: {}, activeElement: null };
  function element(tag = 'div', id = '') {
    const el = { id, tagName: tag.toUpperCase(), children: [], parentNode: null, handlers: {}, attributes: {}, files: [],
      addEventListener(name, fn) { addListener(this, name, fn); }, removeEventListener(name, fn) { removeListener(this, name, fn); },
      insertAdjacentHTML() {}, setAttribute(name, value) { stats.writes++; this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name] === undefined ? null : this.attributes[name]; },
      removeAttribute(name) { stats.writes++; delete this.attributes[name]; if (name === 'src') delete this.src; },
      contains(node) { return node === this || this.children.some(child => child.contains(node)); },
      appendChild(child) { return this.insertBefore(child, null); },
      insertBefore(child, before) {
        if (child.parentNode) {
          const old = child.parentNode.children.indexOf(child);
          if (old >= 0) { child.parentNode.children.splice(old, 1); if (child.contains(document.activeElement)) document.activeElement = document.body; }
        }
        const index = before ? this.children.indexOf(before) : this.children.length;
        if (index < 0) throw Error('Reference child missing');
        this.children.splice(index, 0, child); child.parentNode = this; stats.moves++; return child;
      },
      removeChild(child) { const index = this.children.indexOf(child); if (index < 0) throw Error('Child missing'); this.children.splice(index, 1); child.parentNode = null; stats.removals++; return child; },
      focus() { document.activeElement = this; }, click() { if (!this.disabled && this.handlers.click) this.handlers.click.call(this); },
      querySelectorAll(selector) { const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]); return selector === '*' ? all : all.filter(child => child.tagName === selector.toUpperCase()); }
    };
    el.classList = { contains(name) { return name === 'active' ? activeScreens.has(id.replace(/^screen-/, '')) : false; } };
    Object.defineProperty(el, 'lastChild', { get: () => el.children.at(-1) || null });
    for (const [key, initial] of Object.entries({ textContent: '', disabled: false, hidden: false, value: '' })) {
      let current = initial;
      Object.defineProperty(el, key, { get: () => current, set(value) { stats.writes++; current = key === 'textContent' ? String(value) : value; if (key === 'textContent') { el.children.forEach(child => child.parentNode = null); el.children = []; } } });
    }
    return el;
  }
  document.body = element('body');
  function node(id) { if (!nodes[id]) { nodes[id] = element('div', id); nodes[id].parentNode = document.body; } return nodes[id]; }
  Object.assign(document, { getElementById: node, createElement: element, querySelector: () => node('panel'), querySelectorAll: () => [],
    addEventListener(name, fn) { addListener(this, name, fn); }, removeEventListener(name, fn) { removeListener(this, name, fn); } });
  return { document, node, nodes, element, activeScreens, stats };
}
module.exports = { createDOM };

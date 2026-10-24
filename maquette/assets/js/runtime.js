class DCLogic { constructor(p){ this.props = p || {}; this.state = {}; } setState(p){ Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); window.__dcRender(); } }
(function(){
  const RX = /\{\{\s*([^}]+?)\s*\}\}/g;
  function look(scope, path){
    if (path === 'true') return true; if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    const parts = path.split('.'); let v;
    for (let i = scope.length - 1; i >= 0; i--) { if (scope[i] && parts[0] in Object(scope[i])) { v = scope[i][parts[0]]; break; } }
    for (let j = 1; j < parts.length; j++) { if (v == null) return undefined; v = v[parts[j]]; }
    return v;
  }
  function single(str){ const m = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(str.trim()); return m ? m[1] : null; }
  function interp(str, scope){ return str.replace(RX, (_, p) => { const v = look(scope, p); return v == null || v === false ? '' : String(v); }); }
  function truthy(v){ return Array.isArray(v) ? v.length > 0 : !!v; }
  function proc(node, scope, out){
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(node.nodeValue.indexOf('{{') >= 0 ? interp(node.nodeValue, scope) : node.nodeValue)); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') { const p = single(node.getAttribute('value') || ''); if (truthy(look(scope, p))) node.childNodes.forEach((c) => proc(c, scope, out)); return; }
    if (tag === 'sc-for') { const p = single(node.getAttribute('list')); const as = node.getAttribute('as'); const list = look(scope, p) || [];
      Array.from(list).forEach((item, i) => { const sc = scope.concat([{ [as]: item, index: i }]); node.childNodes.forEach((c) => proc(c, sc, out)); }); return; }
    if (tag === 'template' && node.dataset.sc) { const kids = node.content.childNodes;
      if (node.dataset.sc === 'if') { const p = single(node.getAttribute('value') || ''); if (truthy(look(scope, p))) kids.forEach((c) => proc(c, scope, out)); return; }
      const p = single(node.getAttribute('list')); const as = node.getAttribute('as'); const list = look(scope, p) || [];
      Array.from(list).forEach((item, i) => { const sc = scope.concat([{ [as]: item, index: i }]); kids.forEach((c) => proc(c, sc, out)); }); return; }
    if (tag === 'template') { return; }
    const el = document.createElementNS(node.namespaceURI, node.tagName.toLowerCase() === node.tagName ? node.tagName : node.tagName.toLowerCase());
    for (const a of Array.from(node.attributes)) {
      if (a.name.startsWith('hint-')) continue;
      if (/^on[a-z]+$/i.test(a.name)) { const p = single(a.value); const fn = p ? look(scope, p) : null; if (typeof fn === 'function') { el.addEventListener(a.name.slice(2).toLowerCase(), fn); el.__h = el.__h || {}; el.__h[a.name.slice(2).toLowerCase()] = fn; } continue; }
      let v = a.value.indexOf('{{') >= 0 ? interp(a.value, scope) : a.value;
      if ((a.name === 'src' || a.name === 'srcset') && v.indexOf('/_blob/') === 0) v = window.__blob(v.slice(7)); if (a.name === 'href') { v = v.replace('B-Site.dc.html', '../site/index.html').replace('B-Membre.dc.html', '../espace-membre/index.html').replace('B-BO.dc.html', '../back-office/index.html'); }
      try { el.setAttribute(a.name, v); } catch (e) {}
    }
    if (tag === 'input' && node.hasAttribute('checked')) el.checked = true;
    node.childNodes.forEach((c) => proc(c, scope, el));
    out.appendChild(el);
  }
  window.__dcMount = function(tpl, Comp, props){
    const inst = new Comp(props); window.__inst = inst; let pending = false;
    window.__dcRender = function(){ if (pending) return; pending = true; Promise.resolve().then(() => { pending = false; draw(); }); };
    function draw(){ const vals = inst.renderVals(); const root = document.getElementById('root'); const frag = document.createDocumentFragment(); tpl.content.childNodes.forEach((c) => proc(c, [vals], frag)); root.replaceChildren(frag); }
    draw(); window.__drawSync = draw;
  };
})();

// Analytics chip HTML builder.

export function _chipsHTML(chips) {
  if (!chips || !chips.length) return '';
  return chips.map(c =>
    `<span class="dac ${c.cls}"${c.tip ? ` title="${c.tip}"` : ''}>${c.label}</span>`
  ).join('');
}

// Astro's default markdown pipeline includes remark-gfm, which auto-linkifies
// anything that looks like an email address (`user@domain.tld`) into a
// `<a href="mailto:...">`. That's wrong for fediverse handles, which share
// the syntactic shape but are preceded by an extra `@` (`@user@domain.tld`).
//
// This plugin runs after gfm and undoes any mailto autolink whose preceding
// text node ends with `@` — that combination is the unambiguous signature of
// a fediverse handle and never matches a real email mention in body text.
//
// Result: `@andy@andystevens.name` renders as plain text instead of a
// clickable mailto: link.

import { visit } from 'unist-util-visit';

export default function remarkFediverseHandle() {
  return (tree) => {
    visit(tree, 'link', (node, index, parent) => {
      if (!parent || index == null) return;
      if (typeof node.url !== 'string' || !node.url.startsWith('mailto:')) return;

      const prev = parent.children[index - 1];
      if (!prev || prev.type !== 'text' || !prev.value?.endsWith('@')) return;

      const linkText = node.children?.[0]?.value;
      if (typeof linkText !== 'string') return;

      prev.value = prev.value.slice(0, -1);
      parent.children.splice(index, 1, {
        type: 'text',
        value: '@' + linkText,
      });
    });
  };
}

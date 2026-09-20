import React from 'react';
import { Chevron, Content, Root, Summary } from './styles';

/**
 * A titled section of a panel that can be put away.
 *
 * Controlled: `expanded` and `onToggle` belong to whoever is persisting the
 * choice, because on this panel that choice outlives the page. The content is
 * unmounted rather than hidden when shut — a collapsed section holding a live
 * subscription is a collapsed section still doing work.
 *
 * Not a native `<details>`: its open state has to be driven from outside, and
 * `<summary>`'s accessible role is not consistent enough across engines to
 * build a panel control on.
 */
const Disclosure = ({ title, expanded, onToggle, children }) => (
  <Root>
    <Summary type="button" aria-expanded={expanded} onClick={onToggle}>
      {title}
      <Chevron
        expanded={expanded}
        aria-hidden="true"
        width="10"
        height="10"
        viewBox="0 0 10 10"
      >
        <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </Chevron>
    </Summary>
    {expanded && <Content>{children}</Content>}
  </Root>
);

export default Disclosure;

import React from 'react';
import styled from 'styled-components';

function PreviewCode({ children, ...props }) {
  return (
    <pre {...props}>
      <code>{children}</code>
    </pre>
  );
}

export default styled(PreviewCode)`
    display: block;
    font-family: Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif;
    color: inherit;
    background: inherit;
    border: 0;
    border-radius: 0;
    margin: 0;
    padding: 8px 12px;
`;

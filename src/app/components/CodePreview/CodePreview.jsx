import {
  Box,
  useColorMode,
} from '@tonic-ui/react';
import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import hljsA11yDark from 'react-syntax-highlighter/dist/cjs/styles/hljs/a11y-dark';
import hljsA11yLight from 'react-syntax-highlighter/dist/cjs/styles/hljs/a11y-light';

/** @param {{ data?: string, language?: string, style?: object, [key: string]: unknown }} props */
const CodePreview = ({
  data = '',
  language = 'json',
  style,
  ...rest
}) => {
  const [colorMode] = useColorMode();
  const hljsStyle = {
    dark: hljsA11yDark,
    light: hljsA11yLight,
  }[colorMode];

  return (
    <SyntaxHighlighter
      PreTag={Box}
      as="pre"
      customStyle={{
        ...style,
      }}
      language={language}
      style={hljsStyle}
      {...rest}
    >
      {data}
    </SyntaxHighlighter>
  );
};

export default CodePreview;

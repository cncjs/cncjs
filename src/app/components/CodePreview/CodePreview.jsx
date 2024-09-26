import { useColorMode } from '@tonic-ui/react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import hljsA11yDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
import hljsA11yLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

const CodePreview = ({
  data,
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
      customStyle={style}
      language={language}
      style={hljsStyle}
      {...rest}
    >
      {data}
    </SyntaxHighlighter>
  );
};

export default CodePreview;

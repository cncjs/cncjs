import Prism from 'prismjs';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

const Pre = styled.pre`
    background-color: #212529;
    display: block;
    font-size: 87.5%;
`;

class PrismCode extends React.Component {
    codeRef = React.createRef();

    handleContentChanged = () => {
        const { onContentChanged } = this.props;
        if (typeof onContentChanged === 'function' && this.codeRef.current) {
            const { innerText } = this.codeRef.current;
            onContentChanged(innerText);
        }
    };

    render() {
        const { content, contentEditable, language, ...props } = this.props;

        let innerHTML = '';
        try {
            innerHTML = Prism.highlight(content, Prism.languages[language]);
        } catch (err) {
            console.error(err);
        }

        return (
            <Pre {...props}>
                <code
                    ref={this.codeRef}
                    className={`code language-${language}`}
                    contentEditable={contentEditable}
                    dangerouslySetInnerHTML={{ __html: innerHTML }}
                    onKeyDown={this.handleContentChanged}
                    onKeyUp={this.handleContentChanged}
                    role="textbox"
                    style={{
                        outline: 0,
                    }}
                    tabIndex={0}
                />
            </Pre>
        );
    }
}

PrismCode.defaultProps = {
    content: '',
    contentEditable: false,
    onContentChanged: null,
};

PrismCode.propTypes = {
    content: PropTypes.string,
    contentEditable: PropTypes.bool,
    language: PropTypes.string.isRequired,
    onContentChanged: PropTypes.func,
};

export default PrismCode;

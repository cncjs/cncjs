import ensureArray from 'ensure-array';
import React from 'react';
import styled from 'styled-components';
import withContextConsumer from 'app/lib/withContextConsumer';

const HorizontalFormContext = React.createContext();

const normalizeSpacingProperty = spacing => {
    if (typeof spacing === 'string') {
        spacing = spacing.split(' ').reduce((acc, val) => {
            if (val) {
                acc = acc.concat(val.trim());
            }
            return acc;
        }, []);
    } else {
        spacing = ensureArray(spacing);
    }

    let [s1, s2] = spacing;
    s1 = s1 || 0;
    s2 = (s2 !== undefined && s2 !== null) ? (s2 || 0) : s1;

    // number to px
    spacing = [s1, s2].map(s => (Number(s) > 0 ? `${s}px` : s));

    return spacing;
};

/**
 * The spacing property may be specified as either one or two values:
 * ```
 * spacing: <length> <length>? | [<length>, <length>?]
 * ```
 *
 * When one `<length>` value is specified, it defines both the horizontal and vertical spacings between cells.
 * When two `<length>` values are specified, the first value defines the horizontal spacing between cells (i.e., the space between cells in adjacent columns), and the second value defines the vertical spacing between cells (i.e., the space between cells in adjacent rows).
 */
const HorizontalForm = ({ spacing, children }) => {
    // The normalizeSpacingProperty() function will return an array containing both the horizontal and vertical spacing.
    spacing = normalizeSpacingProperty(spacing);

    return (
        <HorizontalFormContext.Provider value={{ spacing }}>
            {(typeof children === 'function')
                ? children({ FormContainer, FormRow, FormCol })
                : children
            }
        </HorizontalFormContext.Provider>
    );
};

const FormContainer = styled.div`
    display: table;
`;

const FormRow = styled.div`
    display: table-row;
`;

const FormCol = withContextConsumer({
    context: HorizontalFormContext,
})(styled(
    /* Avoid passing unknown props to the underlying element. */
    ({ spacing, ...others }) => <div {...others} />
)`
    display: table-cell;
    padding-bottom: ${props => (Array.isArray(props.spacing) ? props.spacing[1] : 0)};

    // No padding for the last row.
    ${FormRow}:last-child > & {
        padding-bottom: 0;
    }

    & + & {
        padding-left: ${props => (Array.isArray(props.spacing) ? props.spacing[0] : 0)};
    }
`);

export { FormContainer, FormRow, FormCol };
export default HorizontalForm;

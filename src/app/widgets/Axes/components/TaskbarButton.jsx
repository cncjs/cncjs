import styled from 'styled-components';

const TaskbarButton = styled.button`
    display: inline-block;
    margin: 4px;
    padding: 2px 5px;
    border: 0;
    font-weight: normal;
    line-height: 0;
    text-align: center;
    white-space: nowrap;
    touch-action: manipulation;
    cursor: pointer;
    user-select: none;
    background-image: none;
    background-color: inherit;

    opacity: 0.6;
    &:hover {
        opacity: .8;
    }

    &[disabled] {
        opacity: .3;
        cursor: not-allowed;
    }
    &[disabled]:hover {
        background-color: inherit;
    }

    &:hover {
        background-color: #e6e6e6;
        text-decoration: none;
    }

    &:focus,
    &:active {
        outline: 0;
    }
`;

export default TaskbarButton;

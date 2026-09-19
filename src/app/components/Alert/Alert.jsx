import React from 'react';
import { Content, Dismiss, Message, Root, Title } from './styles';

/**
 * A failure the operator has to see.
 *
 * `role="alert"` with `aria-live="assertive"` is the point of the component:
 * the message is announced when it appears, which is why it must only be
 * rendered when there is one. Hiding an always-present alert with CSS
 * announces a failure on every page load.
 *
 * Text arrives already translated — this knows nothing about i18n, including
 * the label on its dismiss control.
 */
const Alert = ({ title, children, onDismiss, dismissLabel }) => (
  <Root role="alert" aria-live="assertive">
    <Content>
      <Title>{title}</Title>
      <Message>{children}</Message>
    </Content>
    {onDismiss && (
      <Dismiss type="button" onClick={onDismiss} aria-label={dismissLabel}>
        &times;
      </Dismiss>
    )}
  </Root>
);

export default Alert;

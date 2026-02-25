import React from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';

const KeyboardShortcutsModal = ({ show, onClose }) => {
  const shortcuts = [
    { keys: '!', description: i18n._('Feed Hold') },
    { keys: '~', description: i18n._('Cycle Start') },
    { keys: 'Ctrl+Alt+Cmd+H', description: i18n._('Homing') },
    { keys: 'Ctrl+Alt+Cmd+U', description: i18n._('Unlock') },
    { keys: 'Ctrl+Alt+Cmd+R', description: i18n._('Reset') },
    { keys: 'Ctrl+Alt+Cmd + / -', description: i18n._('Select Jog Distance') },
    { keys: 'Arrow Keys', description: i18n._('Jog X/Y') },
    { keys: 'Page Up / Page Down', description: i18n._('Jog Z') },
    { keys: '[ / ]', description: i18n._('Jog A') },
    { keys: 'Shift + Arrow', description: i18n._('Fast Jog (10x)') },
    { keys: 'Alt + Arrow', description: i18n._('Slow Jog (0.1x)') },
  ];

  return (
    <Modal show={show} onClose={onClose} showCloseButton={false}>
      <Modal.Header>
        <Modal.Title>{i18n._('Keyboard Shortcuts')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>{i18n._('Shortcut')}</th>
              <th>{i18n._('Action')}</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((s, i) => (
              <tr key={i}>
                <td><kbd>{s.keys}</kbd></td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="btn btn-default"
          onClick={onClose}
        >
          {i18n._('Close')}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default KeyboardShortcutsModal;

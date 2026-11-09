import findIndex from 'lodash/findIndex';
import React, { useState } from 'react';
import { Box } from '@tonic-ui/react';
import { v4 as uuidv4 } from 'uuid';
import CreateRecord from './CreateRecord';
import UpdateRecord from './UpdateRecord';
import TableRecords from './TableRecords';
import {
  MODAL_CREATE_RECORD,
  MODAL_UPDATE_RECORD,
} from './constants';

/**
 * @param {{
 *   records: Array<Record<string, unknown>>,
 *   onRecordsChange: (records: Array<Record<string, unknown>>) => void,
 *   loading?: boolean,
 *   error?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function MDI({ records, onRecordsChange, loading = false, error = false }) {
  const [modal, setModal] = useState({ name: '', record: null });

  const closeModal = () => setModal({ name: '', record: null });
  const moveRecord = (from, to) => {
    const nextRecords = [...records];
    nextRecords.splice(to < 0 ? nextRecords.length + to : to, 0, nextRecords.splice(from, 1)[0]);
    onRecordsChange(nextRecords);
  };
  const createRecord = options => {
    onRecordsChange(records.concat({ id: uuidv4(), ...options }));
    closeModal();
  };
  const updateRecord = (id, options) => {
    const index = findIndex(records, { id });

    if (index < 0) {
      return;
    }

    const nextRecords = [...records];
    nextRecords[index] = { ...nextRecords[index], ...options };
    onRecordsChange(nextRecords);
    closeModal();
  };
  const removeRecord = id => onRecordsChange(records.filter(record => record.id !== id));

  return (
    <Box>
      {modal.name === MODAL_CREATE_RECORD && (
        <CreateRecord
          onSave={createRecord}
          onCancel={closeModal}
        />
      )}
      {modal.name === MODAL_UPDATE_RECORD && (
        <UpdateRecord
          initialValues={modal.record}
          onSave={options => updateRecord(modal.record.id, options)}
          onCancel={closeModal}
        />
      )}
      <TableRecords
        records={records}
        loading={loading}
        error={error}
        onMove={moveRecord}
        onCreate={() => setModal({ name: MODAL_CREATE_RECORD, record: null })}
        onUpdate={record => setModal({ name: MODAL_UPDATE_RECORD, record })}
        onRemove={removeRecord}
      />
    </Box>
  );
}

export default MDI;

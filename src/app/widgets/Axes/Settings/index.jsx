import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@tonic-ui/react';
import React, { useEffect, useRef, useState } from 'react';
import i18n from '@app/lib/i18n';
import { useMdiQuery, useSaveMdiMutation } from '../queries';
import { createSettingsDraft, normalizeGeneral } from './draft';
import General from './General';
import MDI from './MDI';
import ShuttleXpress from './ShuttleXpress';

/**
 * @param {{
 *   config: { get: (key: string, fallback?: unknown) => unknown, set: (key: string, value: unknown) => void },
 *   onSave?: (event: Event) => void,
 *   onCancel?: (event: Event) => void
 * }} props
 * @returns {JSX.Element}
 */
function Settings({ config, onSave = () => {}, onCancel = () => {} }) {
  const mdiQuery = useMdiQuery();
  const saveMdi = useSaveMdiMutation();
  const saving = saveMdi.isPending ?? saveMdi.isLoading ?? false;
  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState(() => ({
    ...createSettingsDraft(config),
    mdiRecords: null,
  }));
  const [error, setError] = useState(null);
  const submitLock = useRef(false);
  const mdiInitialized = useRef(false);

  useEffect(() => {
    if (mdiInitialized.current || !mdiQuery.data || !Array.isArray(mdiQuery.data.records)) {
      return;
    }

    mdiInitialized.current = true;
    setDraft(currentDraft => ({
      ...currentDraft,
      mdiRecords: mdiQuery.data.records.map(record => ({ ...record })),
    }));
  }, [mdiQuery.data]);

  const updateGeneral = general => setDraft(currentDraft => ({ ...currentDraft, general }));
  const updateShuttleXpress = shuttleXpress => setDraft(currentDraft => ({ ...currentDraft, shuttleXpress }));
  const updateMdiRecords = mdiRecords => setDraft(currentDraft => ({ ...currentDraft, mdiRecords }));
  const close = event => {
    if (!saving && !submitLock.current) {
      onCancel(event);
    }
  };
  const save = async (event) => {
    if (saving || submitLock.current || draft.mdiRecords === null) {
      return;
    }

    submitLock.current = true;
    setError(null);
    const snapshot = {
      general: {
        axes: [...draft.general.axes],
        imperialJogDistances: [...draft.general.imperialJogDistances],
        metricJogDistances: [...draft.general.metricJogDistances],
      },
      shuttleXpress: { ...draft.shuttleXpress },
      mdiRecords: draft.mdiRecords.map(record => ({ ...record })),
    };

    try {
      await saveMdi.mutateAsync({ records: snapshot.mdiRecords });
      const normalizedGeneral = normalizeGeneral(snapshot.general);

      config.set('axes', normalizedGeneral.axes);
      config.set('jog.imperial.distances', normalizedGeneral.imperialJogDistances);
      config.set('jog.metric.distances', normalizedGeneral.metricJogDistances);
      config.set('shuttle.feedrateMin', snapshot.shuttleXpress.feedrateMin);
      config.set('shuttle.feedrateMax', snapshot.shuttleXpress.feedrateMax);
      config.set('shuttle.hertz', snapshot.shuttleXpress.hertz);
      config.set('shuttle.overshoot', snapshot.shuttleXpress.overshoot);
      onSave(event);
    } catch (saveError) {
      setError(saveError);
    } finally {
      submitLock.current = false;
    }
  };

  const errorMessage = error?.message || i18n._('An unexpected error has occurred.');
  const mdiReady = draft.mdiRecords !== null && !mdiQuery.isLoading && !mdiQuery.isError;

  return (
    <Modal
      closeOnInteractOutside={false}
      isClosable={!saving}
      isOpen
      onClose={close}
      size="md"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{i18n._('Axes Settings')}</ModalHeader>
        <ModalBody padding={false}>
          <Tabs index={activeIndex} onChange={setActiveIndex}>
            <TabList aria-label={i18n._('Axes Settings')}>
              <Tab index={0}>{i18n._('General')}</Tab>
              <Tab index={1}>{i18n._('Custom Commands')}</Tab>
              <Tab index={2}>{i18n._('ShuttleXpress')}</Tab>
            </TabList>
            <TabPanels px="3x" py="2x" minHeight="240px">
              <TabPanel index={0}>
                {activeIndex === 0 && <General value={draft.general} onChange={updateGeneral} />}
              </TabPanel>
              <TabPanel index={1}>
                {activeIndex === 1 && (
                  <>
                    {mdiQuery.isError && (
                      <Box role="alert" color="error.text" mb="2x">
                        {i18n._('An unexpected error has occurred.')}
                        <Button size="sm" onClick={() => mdiQuery.refetch()}>
                          {i18n._('Retry')}
                        </Button>
                      </Box>
                    )}
                    <MDI
                      records={draft.mdiRecords || []}
                      loading={mdiQuery.isLoading}
                      error={mdiQuery.isError}
                      onRecordsChange={updateMdiRecords}
                    />
                  </>
                )}
              </TabPanel>
              <TabPanel index={2}>
                {activeIndex === 2 && <ShuttleXpress value={draft.shuttleXpress} onChange={updateShuttleXpress} />}
              </TabPanel>
              {error && (
                <Box role="alert" color="error.text" mt="2x">
                  {errorMessage}
                </Box>
              )}
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter gap="2x">
          <Button disabled={saving} onClick={close}>
            {i18n._('Cancel')}
          </Button>
          <Button variant="primary" disabled={saving || !mdiReady} onClick={save}>
            {i18n._('Save Changes')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default Settings;

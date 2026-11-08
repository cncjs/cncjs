import { Box, Button, Space, Spinner, Text } from '@tonic-ui/react';
import { ChevronLeftIcon, CloseIcon, DownloadIcon, FolderOpenIcon } from '@tonic-ui/react-icons';
import pubsub from 'pubsub-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import i18n from '@app/lib/i18n';
import { mapPositionToUnits, toDisplayUnits } from '@app/lib/units';
import { PROCESSING_PHASE_COMPENSATING, PROCESSING_PHASE_LOADING, PROCESSING_PHASE_READING } from './constants';
import styles from './ApplyView.styl';

const PIPELINE_EMPTY = 'empty';
const PIPELINE_PROCESSING = 'processing';
const PIPELINE_DONE = 'done';
const PIPELINE_ERROR = 'error';
const EMPTY_PROBED_POSITIONS = [];
const emptyPipeline = {
  pipelineState: PIPELINE_EMPTY,
  processingPhase: null,
  gcodeFileName: '',
  originalGcode: '',
  compensatedGcode: '',
  errorMessage: '',
};

/**
 * @param {{value?: object, onApply?: Function, onBack?: Function, onClear?: Function, onExport?: Function, onSaveProbeData?: Function}} props
 */
function ApplyView({ value = {}, onApply = () => {}, onBack = () => {}, onClear = () => {}, onExport = () => {}, onSaveProbeData = () => {} }) {
  const [pipeline, setPipeline] = useState(emptyPipeline);
  const pipelineRef = useRef(pipeline);
  const fileInputRef = useRef(null);
  const { probeStats = null, probedPositions: valueProbedPositions, units } = value;
  const probedPositions = valueProbedPositions || EMPTY_PROBED_POSITIONS;
  const hasProbeData = probedPositions.length >= 3;

  useEffect(() => {
    pipelineRef.current = pipeline;
  }, [pipeline]);

  const resetIfDone = useCallback(() => {
    if (pipelineRef.current.pipelineState === PIPELINE_DONE) {
      pipelineRef.current = emptyPipeline;
      setPipeline(emptyPipeline);
    }
  }, []);

  useEffect(() => {
    const unloadToken = pubsub.subscribe('gcode:unload', resetIfDone);
    const loadToken = pubsub.subscribe('gcode:load', (_message, data = {}) => {
      if (!data.isProbeCompensationApplied) {
        resetIfDone();
      }
    });
    return () => {
      pubsub.unsubscribe(unloadToken);
      pubsub.unsubscribe(loadToken);
    };
  }, [resetIfDone]);

  const runPipeline = useCallback(
    (fileName, gcode) => {
      if (!gcode) {
        setPipeline({
          ...emptyPipeline,
          pipelineState: PIPELINE_ERROR,
          errorMessage: i18n._('No G-code content'),
        });
        return;
      }
      if (probedPositions.length < 3) {
        setPipeline({
          ...emptyPipeline,
          pipelineState: PIPELINE_ERROR,
          gcodeFileName: fileName,
          originalGcode: gcode,
          errorMessage: i18n._('Insufficient probe data — minimum 3 points required'),
        });
        return;
      }
      setPipeline({
        ...emptyPipeline,
        pipelineState: PIPELINE_PROCESSING,
        processingPhase: PROCESSING_PHASE_COMPENSATING,
        gcodeFileName: fileName,
        originalGcode: gcode,
      });
      onApply(
        gcode,
        fileName,
        compensatedGcode => {
          const nextPipeline = {
            ...pipelineRef.current,
            pipelineState: PIPELINE_DONE,
            processingPhase: null,
            compensatedGcode,
          };
          pipelineRef.current = nextPipeline;
          setPipeline(nextPipeline);
        },
        errorMessage => setPipeline(previous => ({
          ...previous,
          pipelineState: PIPELINE_ERROR,
          processingPhase: null,
          errorMessage,
        })),
        processingPhase => setPipeline(previous => ({ ...previous, processingPhase })),
      );
    },
    [onApply, probedPositions],
  );

  const handleFileSelect = event => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) {
      return;
    }
    setPipeline({
      ...emptyPipeline,
      pipelineState: PIPELINE_PROCESSING,
      processingPhase: PROCESSING_PHASE_READING,
      gcodeFileName: file.name,
    });
    const reader = new FileReader();
    reader.onload = loadEvent => runPipeline(file.name, loadEvent.target.result);
    reader.onerror = () => setPipeline(previous => ({
      ...previous,
      pipelineState: PIPELINE_ERROR,
      processingPhase: null,
      errorMessage: i18n._('Failed to read file'),
    }));
    reader.readAsText(file);
  };

  const download = (gcode, fileName) => {
    const url = URL.createObjectURL(new Blob([gcode], { type: 'text/plain' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `AL_${fileName}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const handleExport = () => {
    if (pipeline.compensatedGcode) {
      download(pipeline.compensatedGcode, pipeline.gcodeFileName);
      return;
    }
    onExport(pipeline.originalGcode, pipeline.gcodeFileName);
  };
  const phaseText =
    {
      [PROCESSING_PHASE_READING]: i18n._('Reading {{filename}}...', {
        filename: pipeline.gcodeFileName,
      }),
      [PROCESSING_PHASE_COMPENSATING]: i18n._('Applying compensation to {{filename}}...', {
        filename: pipeline.gcodeFileName,
      }),
      [PROCESSING_PHASE_LOADING]: i18n._('Loading compensated G-code to workspace...'),
    }[pipeline.processingPhase] || i18n._('Processing...');

  return (
    <Box>
      <Box className={styles.sectionHeader}>
        <Button
          aria-label={i18n._('Back')} onClick={onBack} size="sm"
          variant="ghost"
        >
          <ChevronLeftIcon aria-hidden="true" size="1em" />
        </Button>
        {i18n._('APPLY COMPENSATION')}
      </Box>
      <Box className={styles.section}>
        <Text className={styles.sectionTitle}>{i18n._('Probe Results')}</Text>
        {!probeStats && <Text className={styles.noData}>{i18n._('No probe data available')}</Text>}
        {probeStats && (
          <Box>
            <Box className={styles.probeDataInfo}>
              {[
                [i18n._('Points probed:'), probeStats.points],
                [i18n._('Z-min:'), `${mapPositionToUnits(probeStats.minZ, units)} ${toDisplayUnits(units)}`],
                [i18n._('Z-max:'), `${mapPositionToUnits(probeStats.maxZ, units)} ${toDisplayUnits(units)}`],
                [i18n._('Max deviation:'), `${mapPositionToUnits(probeStats.maxDeviation, units)} ${toDisplayUnits(units)}`],
              ].map(([label, result]) => (
                <Box key={label} className={styles.infoRow}>
                  <Text className={styles.infoLabel}>{label}</Text>
                  <Text className={styles.infoValue}>{result}</Text>
                </Box>
              ))}
            </Box>
            <Button onClick={onSaveProbeData} variant="secondary">
              <DownloadIcon aria-hidden="true" size="1em" />
              <Space width="1x" />
              {i18n._('Export Probe Data')}
            </Button>
          </Box>
        )}
      </Box>
      <Box className={styles.section}>
        <Text className={styles.sectionTitle}>{i18n._('Probe Compensation')}</Text>
        {pipeline.pipelineState === PIPELINE_EMPTY && (
          <Box>
            {!hasProbeData && <Text color="error.text">{i18n._('Insufficient probe data. At least 3 points are required for surface compensation.')}</Text>}
            {hasProbeData && (
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                <FolderOpenIcon aria-hidden="true" size="1em" />
                <Space width="1x" />
                {i18n._('Load G-code file')}
              </Button>
            )}
          </Box>
        )}
        {pipeline.pipelineState === PIPELINE_PROCESSING && (
          <Box alignItems="center" display="flex" gap="2x">
            <Spinner aria-label={phaseText} size="xs" />
            <Text>{phaseText}</Text>
          </Box>
        )}
        {pipeline.pipelineState === PIPELINE_DONE && (
          <Box>
            <Text>AL_{pipeline.gcodeFileName}</Text>
            <Button
              aria-label={i18n._('Clear G-code')}
              onClick={() => {
                onClear();
                setPipeline(emptyPipeline);
              }}
              variant="ghost"
            >
              <CloseIcon aria-hidden="true" size="1em" />
            </Button>
            <Button disabled={!pipeline.compensatedGcode} onClick={handleExport} variant="secondary">
              {i18n._('Export Compensated G-code')}
            </Button>
          </Box>
        )}
        {pipeline.pipelineState === PIPELINE_ERROR && (
          <Box>
            <Text>
              {i18n._('Failed to compensate {{filename}}', {
                filename: pipeline.gcodeFileName,
              })}
            </Text>
            <Text color="error.text">{pipeline.errorMessage}</Text>
            {pipeline.originalGcode && (
              <Button onClick={() => runPipeline(pipeline.gcodeFileName, pipeline.originalGcode)} variant="primary">
                {i18n._('Retry')}
              </Button>
            )}
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
              {i18n._('Choose Different File')}
            </Button>
          </Box>
        )}
        <input
          accept=".gcode,.nc,.tap,.cnc" hidden onChange={handleFileSelect}
          ref={fileInputRef} type="file"
        />
      </Box>
    </Box>
  );
}

export default ApplyView;

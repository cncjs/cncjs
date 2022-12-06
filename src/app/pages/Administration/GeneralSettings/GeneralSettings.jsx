import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React from 'react';
import { Form, FormSpy } from 'react-final-form';
import i18n from 'app/lib/i18n';
import FieldCheckbox from './components/FieldCheckbox';

const Title = (props) => (
  <Text fontSize="md" lineHeight="md" mb="3x" {...props} />
);

const GeneralSettings = () => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const initialValues = {
    update: {
      checkForUpdates: false,
    },
    controller: {
      ignoreErrors: false,
    },
  };
  const handleFormSubmit = () => {
  };

  return (
    <Form
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      subscription={{}}
      render={({ form }) => (
        <Flex
          flexDirection="column"
          height="100%"
        >
          <Box
            flex="auto"
            p="4x"
            overflowY="auto"
          >
            <>
              <Title>
                {i18n._('Update')}
              </Title>
              <FieldCheckbox
                name="update.checkForUpdates"
              >
                {i18n._('Automatically check for updates')}
              </FieldCheckbox>
            </>
            <Divider my="4x" />
            <>
              <Title>
                {i18n._('Controller')}
              </Title>
              <Text mb="3x">
                {i18n._('Exception Handling')}
              </Text>
              <Box mb="1x">
                <FieldCheckbox
                  name="controller.ignoreErrors"
                >
                  {i18n._('Continue execution when an error is detected in the G-code program')}
                </FieldCheckbox>
              </Box>
              <Flex alignItems="center" columnGap="2x" ml="6x">
                <Icon icon="warning-circle" color={colorStyle.color.error} />
                <Text>{i18n._('Enabling this option may cause machine damage if you don\'t have an Emergency Stop button to prevent a dangerous situation.')}</Text>
              </Flex>
            </>
          </Box>
          <Box
            flex="none"
          >
            <FormSpy
              subscription={{
                values: true,
                invalid: true,
                pristine: true,
              }}
            >
              {({ values, invalid, pristine }) => {
                const canSubmit = (() => {
                  if (invalid) {
                    return false;
                  }
                  if (pristine) {
                    return false;
                  }
                  return true;
                })();
                const handleSubmit = () => {
                  form.submit();
                };

                return (
                  <Flex
                    backgroundColor={colorStyle.background.secondary}
                    px="4x"
                    py="3x"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Button
                      variant="primary"
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                    >
                      {i18n._('Save')}
                    </Button>
                  </Flex>
                );
              }}
            </FormSpy>
          </Box>
        </Flex>
      )}
    />
  );
};

export default GeneralSettings;

/*
class General extends Component {
      static propTypes = {
        initialState: PropTypes.object,
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
      };

      fields = {
        checkForUpdates: null
      };

      handlers = {
        changeCheckForUpdates: (event) => {
          const { actions } = this.props;
          actions.toggleCheckForUpdates();
        },
        changeLanguage: (event) => {
          const { actions } = this.props;
          const target = event.target;
          actions.changeLanguage(target.value);
        },
        cancel: (event) => {
          const { actions } = this.props;
          actions.restoreSettings();
        },
        save: (event) => {
          const { actions } = this.props;
          actions.save();
        }
      };

      componentDidMount() {
        const { actions } = this.props;
        actions.load();
      }

      render() {
        const { state, stateChanged } = this.props;
        const lang = get(state, 'lang', 'en');

        if (state.api.loading) {
          return (
            <Spinner />
          );
        }

              <div className="row">
                <div className="col-md-12">
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={this.handlers.cancel}
                  >
                    {i18n._('Cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!stateChanged}
                    onClick={this.handlers.save}
                  >
                    {state.api.saving
                      ? <i className="fa fa-circle-o-notch fa-spin" />
                      : <i className="fa fa-save" />}
                    <Space width={8} />
                    {i18n._('Save Changes')}
                  </button>
                </div>
              </div>
            </div>
          </form>
        );
      }
    }

    export default General;
    */

import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { Provider as GridSystemProvider } from 'app/components/GridSystem';
import reduxStore from 'app/store/redux';
import i18next from 'app/i18next';

export const GlobalProvider = ({ children }) => (
    <ReduxProvider store={reduxStore}>
        <GridSystemProvider
            breakpoints={[576, 768, 992, 1200, 1600]}
            containerWidths={[540, 720, 960, 1140]}
            columns={12}
            gutterWidth={0}
            layout="flexbox"
        >
            <I18nextProvider i18n={i18next}>
                <HashRouter>
                    {children}
                </HashRouter>
            </I18nextProvider>
        </GridSystemProvider>
    </ReduxProvider>
);

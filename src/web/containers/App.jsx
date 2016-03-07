import React from 'react';
import Header from '../components/header';

const App = (props) => {
    const { children } = props;

    return (
        <div>
            <Header />
            {children}
        </div>
    );
};

App.propTypes = {
    children: React.PropTypes.node
};

export default App;

import React from 'react';
import Header from '../components/header';

class App extends React.Component {
    render() {
        let style = {
            paddingTop: '50px',
            paddingBottom: '20px'
        };
        return (
            <div style={style}>
                <Header />
                {this.props.children}
            </div>
        );
    }
}

export default App;

import log from './lib/log';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute } from 'react-router';
import Header from './components/header';
import Workspace from './components/workspace';

class App extends React.Component {
    render() {
        var style = {
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

export default function() {
    ReactDOM.render((
        <Router>
            <Route path="/" component={App}>
                <IndexRoute component={Workspace} />
            </Route>
        </Router>
    ), document.querySelector('#components'));
}

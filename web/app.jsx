import log from './lib/log';
import React from 'react';
import Router from 'react-router';
import { Route, DefaultRoute, Link, RouteHandler } from 'react-router';
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
                <Header/>
                <RouteHandler/>
            </div>
        );
    }
}

export default function() {
    var routes = (
        <Route name="app" path="/" handler={App}>
            <DefaultRoute handler={Workspace}/>
            <Route name="workspace" handler={Workspace}/>
        </Route>
    );
    Router.run(routes, function(Handler) {
        React.render(<Handler/>, document.querySelector('#components'));
    });
}
